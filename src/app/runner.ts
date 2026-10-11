import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { DeterministicController, runAgent, type AgentRun, type RunProgress } from "../agent.js";
import type { Clock } from "../clock.js";
import type { ModelClient } from "../controller.js";
import { STALL_BACKDATE_MS } from "../constants.js";
import { isNightshiftError } from "../errors.js";
import { observeLease } from "../lease.js";
import { LiteLlmModel, modelConfigFromEnv } from "../model.js";
import { runUntilPublished } from "../pipeline.js";
import { DEFAULT_LIMITS } from "../policy.js";
import { canonicalJson } from "../report.js";
import { expireLease, getJob, getLease, insertError, type JobRecord } from "../store.js";
import type { TokenUsage } from "../trace.js";
import { CappedModel, readLiveGate, type LiveGate } from "./budget.js";
import {
  countOpenRuns,
  insertRun,
  interruptRuns,
  latestRun,
  listFinishableJobs,
  openRun,
  saveRun,
  type RunRecord,
} from "./records.js";
import { MAX_CONCURRENT_RUNS } from "./submit.js";

export interface RunnerPaths {
  database: DatabaseSync;
  clock: Clock;
  artifactDir: string;
  journalDir: string;
  env: NodeJS.ProcessEnv;
  model?: ModelClient;
}

const workers = new Set<string>();

export function enqueueWorker(paths: RunnerPaths, jobId: string): void {
  if (workers.has(jobId)) {
    return;
  }
  workers.add(jobId);
  setImmediate(() => {
    try {
      finishWorker(paths, jobId);
    } finally {
      workers.delete(jobId);
    }
  });
}

export function resumeOnBoot(paths: RunnerPaths): void {
  interruptRuns(paths.database, paths.clock.now().toISOString());
  for (const jobId of listFinishableJobs(paths.database)) {
    enqueueWorker(paths, jobId);
  }
}

export type StartResult =
  | { ok: true; run: RunRecord; created: boolean }
  | { ok: false; status: number; code: string; message: string };

export function startLiveRun(paths: RunnerPaths, jobId: string, sessionId: string): StartResult {
  const job = getJob(paths.database, jobId);
  if (!job || job.owner_session_id !== sessionId) {
    return refuse(404, "not_found", "That report job was not found.");
  }
  const recorded = recordedRun(paths, job);
  if (recorded) {
    return recorded;
  }
  const lease = observeLease(getLease(paths.database, jobId), paths.clock.now());
  if (job.status === "running" && lease.lease_state === "active") {
    return refuse(409, "worker_active", "The worker is still writing this report.");
  }
  if (lease.lease_state === "missing" || lease.lease_state === "uncertain") {
    return refuse(409, "lease_unsafe", "Lease evidence is not safe to act on.");
  }
  const gate = readLiveGate(paths.env, paths.database);
  if (!gate.available || gate.calls_allowed === null) {
    return refuse(403, gate.reason, liveMessage(gate.reason));
  }
  if (countOpenRuns(paths.database) >= MAX_CONCURRENT_RUNS) {
    return refuse(409, "concurrency_limit", "Another Nightshift run is already in progress.");
  }
  const runId = `run_${randomUUID()}`;
  const at = paths.clock.now().toISOString();
  try {
    insertRun(paths.database, { id: runId, job_id: jobId, session_id: sessionId, created_at: at });
  } catch {
    const raced = openRun(paths.database, jobId);
    if (raced) {
      return { ok: true, run: raced, created: false };
    }
    return refuse(409, "run_conflict", "The run could not be started.");
  }
  const created = openRun(paths.database, jobId);
  if (!created) {
    return refuse(409, "run_conflict", "The run could not be started.");
  }
  const remaining = gate.calls_allowed - gate.calls_used;
  setImmediate(() => {
    void executeLive(paths, created, Math.min(DEFAULT_LIMITS.maxModelCalls, remaining));
  });
  return { ok: true, run: created, created: true };
}

export function startLabRun(paths: RunnerPaths, jobId: string, sessionId: string): StartResult {
  const job = getJob(paths.database, jobId);
  if (!job || job.owner_session_id !== sessionId) {
    return refuse(404, "not_found", "That report job was not found.");
  }
  const recorded = recordedRun(paths, job);
  if (recorded) {
    return recorded;
  }
  const runId = `run_${randomUUID()}`;
  const at = paths.clock.now().toISOString();
  insertRun(paths.database, { id: runId, job_id: jobId, session_id: sessionId, created_at: at });
  const created = openRun(paths.database, jobId);
  if (!created) {
    return refuse(409, "run_conflict", "The lab run could not be started.");
  }
  setImmediate(() => {
    void executeModel(paths, created, new DeterministicController(), DEFAULT_LIMITS.maxModelCalls);
  });
  return { ok: true, run: created, created: true };
}

function recordedRun(paths: RunnerPaths, job: JobRecord): StartResult | null {
  const existing = openRun(paths.database, job.id);
  if (existing) {
    return { ok: true, run: existing, created: false };
  }
  if (job.status !== "completed" && job.status !== "escalated") {
    return null;
  }
  const prior = latestRun(paths.database, job.id);
  if (prior) {
    return { ok: true, run: prior, created: false };
  }
  return refuse(409, "terminal_job", "This job is already closed.");
}

function finishWorker(paths: RunnerPaths, jobId: string): void {
  const job = getJob(paths.database, jobId);
  if (!job || job.status !== "running" || job.auto_finish !== 1) {
    return;
  }
  const lease = observeLease(getLease(paths.database, jobId), paths.clock.now());
  if (lease.lease_state !== "active" || lease.generation === null) {
    return;
  }
  try {
    runUntilPublished(paths.database, jobId, lease.generation, paths.clock, paths.artifactDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The worker failed.";
    insertError(paths.database, {
      id: `error_${randomUUID()}`,
      job_id: jobId,
      message: message.slice(0, 240),
      source: "worker",
      created_at: paths.clock.now().toISOString(),
    });
    expireLease(
      paths.database,
      jobId,
      new Date(paths.clock.now().getTime() - STALL_BACKDATE_MS).toISOString(),
    );
  }
}

async function executeLive(
  paths: RunnerPaths,
  run: RunRecord,
  maxModelCalls: number,
): Promise<void> {
  const gate = readLiveGate(paths.env, paths.database);
  const inner = paths.model ?? new LiteLlmModel(modelConfigFromEnv(paths.env));
  const allowed = gate.calls_allowed ?? 0;
  const model = new CappedModel(inner, paths.database, allowed, run.id, () =>
    paths.clock.now().toISOString(),
  );
  await executeModel(paths, run, model, maxModelCalls);
}

async function executeModel(
  paths: RunnerPaths,
  run: RunRecord,
  model: ModelClient,
  maxModelCalls: number,
): Promise<void> {
  try {
    const result = await runAgent({
      database: paths.database,
      clock: paths.clock,
      artifactDir: paths.artifactDir,
      jobId: run.job_id,
      model,
      limits: { ...DEFAULT_LIMITS, maxModelCalls },
      journalDir: paths.journalDir,
      env: paths.env,
      onProgress(progress) {
        try {
          saveRun(paths.database, runningRun(run, progress, paths.clock.now().toISOString()));
        } catch {
          return;
        }
      },
    });
    saveRun(paths.database, storedRun(run, result, paths.clock.now().toISOString()));
  } catch (error) {
    const code = isNightshiftError(error) ? error.code : "run_failed";
    try {
      saveRun(paths.database, {
        ...run,
        status: "blocked",
        reason: code,
        updated_at: paths.clock.now().toISOString(),
      });
    } catch {
      return;
    }
  }
}

function runningRun(run: RunRecord, progress: RunProgress, at: string): RunRecord {
  return {
    ...run,
    status: "running",
    reason: null,
    decision_source: progress.decision_source,
    model_calls: progress.model_calls,
    tools_json: canonicalJson(progress.tools),
    trace_json: canonicalJson(publicEvents(progress.trace)),
    rejections_json: canonicalJson(progress.rejections),
    trace_id: progress.trace_id,
    usage_json: usageJson(progress.trace),
    verification_json: progress.verification ? canonicalJson(progress.verification) : null,
    updated_at: at,
  };
}

function storedRun(run: RunRecord, result: AgentRun, at: string): RunRecord {
  return {
    ...run,
    status: result.outcome,
    reason: result.reason,
    decision_source: result.decision_source,
    model_calls: result.model_calls,
    tools_json: canonicalJson(result.tools),
    trace_json: canonicalJson(publicEvents(result.trace)),
    rejections_json: canonicalJson(result.rejections),
    neatlogs: result.neatlogs,
    trace_id: result.trace_id,
    usage_json: usageJson(result.trace),
    verification_json: result.verification ? canonicalJson(result.verification) : null,
    updated_at: at,
  };
}

function publicEvents(trace: AgentRun["trace"]): unknown[] {
  return trace.map((event) => ({
    name: event.name,
    rationale: event.rationale,
    duration_ms: event.duration_ms,
    usage: event.usage,
    output: event.output,
  }));
}

function usageJson(trace: AgentRun["trace"]): string | null {
  const usage = sumUsage(trace.map((event) => event.usage));
  return usage ? canonicalJson(usage) : null;
}

function sumUsage(values: (TokenUsage | null)[]): TokenUsage | null {
  if (values.every((value) => value === null)) {
    return null;
  }
  return {
    prompt_tokens: sumField(values.map((value) => value?.prompt_tokens ?? null)),
    completion_tokens: sumField(values.map((value) => value?.completion_tokens ?? null)),
    total_tokens: sumField(values.map((value) => value?.total_tokens ?? null)),
  };
}

function sumField(values: (number | null)[]): number | null {
  if (values.every((value) => value === null)) {
    return null;
  }
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function refuse(status: number, code: string, message: string): StartResult {
  return { ok: false, status, code, message };
}

function liveMessage(reason: LiveGate["reason"]): string {
  if (reason === "budget_cap") {
    return "The server has used its approved model-call cap.";
  }
  return "Live model runs are off until the server owner sets an approved dollar cap and a per-call estimate.";
}
