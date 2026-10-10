import type { DatabaseSync } from "node:sqlite";
import { escalate, executeTool } from "./actions.js";
import type { Clock } from "./clock.js";
import { type JobStatus } from "./constants.js";
import {
  decideDeterministic,
  emptyMemory,
  type AgentMemory,
  type CheckpointObservation,
  type DecisionInput,
  type JobObservation,
  type ModelClient,
  type WorkerObservation,
} from "./controller.js";
import { isNightshiftError } from "./errors.js";
import {
  authorizeDecision,
  isRepair,
  parseDecision,
  type Limits,
  type ToolDecision,
  type ToolName,
} from "./policy.js";
import { redact } from "./redact.js";
import { requireJob } from "./store.js";
import { exportConfiguredTrace, writeJournal, type TraceEvent } from "./trace.js";
import type { VerificationResult } from "./verifier.js";

export interface AgentRun {
  decision_source: ModelClient["source"];
  outcome: "completed" | "escalated" | "blocked";
  reason: string;
  job_id: string;
  job_status: string;
  verification: VerificationResult | null;
  tools: string[];
  corrections: number;
  repairs: number;
  model_calls: number;
  trace: TraceEvent[];
  rejections: string[];
  neatlogs: "disabled_missing_api_key" | "exported" | "export_failed";
  local_journal: string | null;
}

export interface RunAgentInput {
  database: DatabaseSync;
  clock: Clock;
  artifactDir: string;
  jobId: string;
  model: ModelClient;
  limits: Limits;
  journalDir: string | null;
  env: NodeJS.ProcessEnv;
}

export class DeterministicController implements ModelClient {
  readonly source = "deterministic_controller" as const;

  decide(input: DecisionInput): Promise<unknown> {
    return Promise.resolve(decideDeterministic(input.jobId, input.memory));
  }
}

type RunStop = { outcome: AgentRun["outcome"]; reason: string } | null;

interface RunState {
  memory: AgentMemory;
  tools: string[];
  trace: TraceEvent[];
  rejections: string[];
  corrections: number;
  repairs: number;
  modelCalls: number;
  steps: number;
  rejection: string | null;
  verification: VerificationResult | null;
  started: number;
}

export async function runAgent(input: RunAgentInput): Promise<AgentRun> {
  const state: RunState = {
    memory: emptyMemory(),
    tools: [],
    trace: [],
    rejections: [],
    corrections: 0,
    repairs: 0,
    modelCalls: 0,
    steps: 0,
    rejection: null,
    verification: null,
    started: input.clock.now().getTime(),
  };
  while (state.steps < input.limits.maxSteps) {
    const stop = await advanceRun(input, state);
    if (stop) {
      return finishRun(input, state, stop.outcome, stop.reason);
    }
  }
  escalate(input, "budget_steps");
  return finishRun(input, state, "escalated", "budget_steps");
}

async function advanceRun(input: RunAgentInput, state: RunState): Promise<RunStop> {
  const budget = budgetStop(input, state);
  if (budget) {
    return budget;
  }
  if (countsModelCall(input) && state.modelCalls >= input.limits.maxModelCalls) {
    escalate(input, "budget_model");
    return { outcome: "escalated", reason: "budget_model" };
  }
  const asked = await askModel(input, state);
  if (asked.type === "blocked") {
    return { outcome: "blocked", reason: asked.reason };
  }
  if (countsModelCall(input)) {
    state.modelCalls += 1;
  }
  return applyDecision(input, state, asked.value);
}

function countsModelCall(input: RunAgentInput): boolean {
  return input.model.source === "model";
}

function budgetStop(input: RunAgentInput, state: RunState): RunStop {
  if (input.clock.now().getTime() - state.started > input.limits.maxElapsedMs) {
    escalate(input, "budget_elapsed");
    return { outcome: "escalated", reason: "budget_elapsed" };
  }
  if (state.memory.verified && state.memory.job?.status === "completed") {
    return { outcome: "completed", reason: "verified" };
  }
  return null;
}

type Asked = { type: "decision"; value: unknown } | { type: "blocked"; reason: string };

async function askModel(input: RunAgentInput, state: RunState): Promise<Asked> {
  try {
    return {
      type: "decision",
      value: await input.model.decide({
        jobId: input.jobId,
        memory: state.memory,
        rejection: state.rejection,
      }),
    };
  } catch (error) {
    const blocked = blockedModelReason(error);
    if (blocked) {
      return { type: "blocked", reason: blocked };
    }
    throw error;
  }
}

function applyDecision(input: RunAgentInput, state: RunState, raw: unknown): RunStop {
  const screened = screenDecision(raw, input.jobId, state.memory, state.corrections);
  state.corrections = screened.corrections;
  if (screened.type === "retry") {
    state.rejection = screened.reason;
    state.rejections.push(screened.reason);
    return null;
  }
  if (screened.type === "stop") {
    state.rejections.push(screened.detail);
    escalate(input, screened.reason);
    return { outcome: "escalated", reason: screened.reason };
  }
  state.rejection = null;
  if (isRepair(screened.decision.tool)) {
    state.repairs += 1;
    if (state.repairs > input.limits.maxRepairs) {
      escalate(input, "budget_repairs");
      return { outcome: "escalated", reason: "budget_repairs" };
    }
  }
  const output = executeTool(input, screened.decision, state.memory);
  state.tools.push(screened.decision.tool);
  state.trace.push({
    name: screened.decision.tool,
    rationale: screened.decision.rationale,
    output: redact(output),
  });
  remember(state.memory, screened.decision.tool, output);
  state.steps += 1;
  const terminal = terminalOutcome(screened.decision.tool, output);
  if (!terminal) {
    return null;
  }
  if (terminal.verification) {
    state.verification = terminal.verification;
  }
  return { outcome: terminal.outcome, reason: terminal.reason };
}

async function finishRun(
  input: RunAgentInput,
  state: RunState,
  outcome: AgentRun["outcome"],
  reason: string,
): Promise<AgentRun> {
  const job = requireJob(input.database, input.jobId);
  const neatlogs = await exportConfiguredTrace(input.env, state.trace, input.model.source);
  return {
    decision_source: input.model.source,
    outcome,
    reason,
    job_id: input.jobId,
    job_status: job.status,
    verification: state.verification,
    tools: state.tools,
    corrections: state.corrections,
    repairs: state.repairs,
    model_calls: state.modelCalls,
    trace: state.trace,
    rejections: state.rejections,
    neatlogs,
    local_journal: input.journalDir
      ? writeJournal(input.journalDir, input.jobId, state.trace)
      : null,
  };
}

function blockedModelReason(error: unknown): string | null {
  if (!isNightshiftError(error)) {
    return null;
  }
  if (
    error.code === "model_unavailable" ||
    error.code === "spend_not_approved" ||
    error.code === "model_request_failed"
  ) {
    return error.code;
  }
  return null;
}

function screenDecision(
  raw: unknown,
  jobId: string,
  memory: AgentMemory,
  corrections: number,
):
  | { type: "retry"; reason: string; corrections: number }
  | { type: "stop"; reason: "invalid_model_output"; detail: string; corrections: number }
  | { type: "run"; decision: ToolDecision; corrections: number } {
  const parsed = parseDecision(raw);
  if (!parsed.ok) {
    const next = corrections + 1;
    return next > 1
      ? { type: "stop", reason: "invalid_model_output", detail: parsed.reason, corrections: next }
      : { type: "retry", reason: parsed.reason, corrections: next };
  }
  const authorized = authorizeDecision(
    parsed.decision,
    jobId,
    memory.worker?.generation ?? null,
    memory.checkpoint?.id ?? null,
    memory.reclaimedGeneration,
  );
  if (!authorized.ok) {
    const next = corrections + 1;
    return next > 1
      ? {
          type: "stop",
          reason: "invalid_model_output",
          detail: authorized.reason,
          corrections: next,
        }
      : { type: "retry", reason: authorized.reason, corrections: next };
  }
  return { type: "run", decision: parsed.decision, corrections };
}

type Terminal = {
  outcome: "completed" | "escalated";
  reason: string;
  verification: VerificationResult | null;
};

function terminalOutcome(tool: ToolName, output: unknown): Terminal | null {
  if (tool === "verify_artifact") {
    const verification = output as VerificationResult;
    if (verification.ok && verification.job_status === "completed") {
      return { outcome: "completed", reason: "verified", verification };
    }
    if (!verification.ok) {
      return { outcome: "escalated", reason: "verification_failed", verification };
    }
  }
  if (tool === "escalate_incident") {
    return {
      outcome: "escalated",
      reason: String((output as { reason: string }).reason),
      verification: null,
    };
  }
  return null;
}

function remember(memory: AgentMemory, tool: ToolName, output: unknown): void {
  const record = output as Record<string, unknown>;
  if (tool === "inspect_job") {
    memory.job = output as JobObservation;
    return;
  }
  if (tool === "inspect_worker") {
    memory.worker = output as WorkerObservation;
    return;
  }
  if (tool === "read_checkpoint") {
    memory.checkpoint = output as CheckpointObservation;
    return;
  }
  if (tool === "read_recent_errors") {
    rememberErrors(memory, record);
    return;
  }
  if (tool === "reclaim_expired_lease") {
    rememberReclaim(memory, record);
    return;
  }
  if (tool === "resume_job") {
    rememberResume(memory, record);
    return;
  }
  if (tool === "verify_artifact") {
    rememberVerification(memory, record);
  }
}

function rememberErrors(memory: AgentMemory, record: Record<string, unknown>): void {
  const errors = Array.isArray(record.errors) ? record.errors : [];
  memory.errorsRead = true;
  memory.recentErrors = errors.map((entry) =>
    String((entry as { message?: unknown }).message ?? ""),
  );
}

function rememberReclaim(memory: AgentMemory, record: Record<string, unknown>): void {
  if (record.ok !== true || typeof record.generation !== "number") {
    return;
  }
  memory.reclaimedGeneration = record.generation;
  if (memory.job) {
    memory.job = { ...memory.job, status: "recovering" };
  }
  if (memory.worker) {
    memory.worker = { ...memory.worker, lease_state: "active", generation: record.generation };
  }
}

function rememberResume(memory: AgentMemory, record: Record<string, unknown>): void {
  if (record.type === "applied" || record.type === "replay") {
    if (memory.job && isJobStatus(record.status)) {
      memory.job = { ...memory.job, status: record.status };
    }
    return;
  }
  if (record.type === "uncertain") {
    memory.resumeNonce += 1;
    memory.checkpoint = null;
    memory.reclaimedGeneration = memory.worker?.generation ?? memory.reclaimedGeneration;
  }
}

function rememberVerification(memory: AgentMemory, record: Record<string, unknown>): void {
  memory.verified = true;
  if (memory.job && isJobStatus(record.job_status)) {
    memory.job = { ...memory.job, status: record.job_status };
  }
}

function isJobStatus(value: unknown): value is JobStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "stalled" ||
    value === "recovering" ||
    value === "verifying" ||
    value === "completed" ||
    value === "escalated"
  );
}
