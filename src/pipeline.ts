import { randomUUID } from "node:crypto";
import { renameSync, rmSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import type { Clock } from "./clock.js";
import {
  LEASE_HOLDER,
  LEASE_TTL_MS,
  PIPELINE_VERSION,
  STALL_BACKDATE_MS,
  WORKER_STEPS,
  type CheckpointStep,
  type WorkerStep,
} from "./constants.js";
import { transaction } from "./db.js";
import { NightshiftError, isNightshiftError } from "./errors.js";
import { observeLease } from "./lease.js";
import { prepareArtifactFile, publishFile, storeArtifact } from "./publish.js";
import {
  aggregate,
  canonicalJson,
  hashRows,
  parseStoredJson,
  sha256,
  validateRows,
} from "./report.js";
import {
  expireLease,
  finishOperation,
  getLease,
  getOperation,
  insertAttempt,
  insertCheckpoint,
  insertError,
  insertJob,
  insertLease,
  insertOperation,
  latestCheckpoint,
  requireJob,
  transitionJob,
  type CheckpointRecord,
} from "./store.js";

export interface StepOptions {
  stopAfter: CheckpointStep | null;
  faultInjection: "controlled_demo" | null;
  crashAfterArtifact: boolean;
}

export interface ResumeResultApplied {
  type: "applied" | "replay";
  status: string;
  checkpoint_id: string | null;
  artifact_id: string | null;
}

export interface ResumeResultOther {
  type: "uncertain" | "rejected";
  code: string;
}

export type ResumeResult = ResumeResultApplied | ResumeResultOther;

const EMPTY_OPTIONS: StepOptions = {
  stopAfter: null,
  faultInjection: null,
  crashAfterArtifact: false,
};

export function createJob(
  database: DatabaseSync,
  rows: unknown,
  clock: Clock,
): { jobId: string; generation: number } {
  const now = clock.now().toISOString();
  const jobId = `job_${randomUUID()}`;
  let validated: ReturnType<typeof validateRows>;
  try {
    validated = validateRows(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid dataset.";
    transaction(database, () => {
      insertJob(database, {
        id: jobId,
        status: "queued",
        input_hash: "",
        pipeline_version: PIPELINE_VERSION,
        input_json: canonicalJson(rows),
        artifact_id: null,
        escalation_reason: "invalid_input",
        created_at: now,
        updated_at: now,
      });
      transitionJob(database, jobId, "escalated", now, "invalid_input");
      insertError(database, {
        id: `error_${randomUUID()}`,
        job_id: jobId,
        message,
        source: "input_validation",
        created_at: now,
      });
    });
    return { jobId, generation: 0 };
  }

  const inputHash = hashRows(validated);
  transaction(database, () => {
    insertJob(database, {
      id: jobId,
      status: "queued",
      input_hash: inputHash,
      pipeline_version: PIPELINE_VERSION,
      input_json: canonicalJson(validated),
      artifact_id: null,
      escalation_reason: null,
      created_at: now,
      updated_at: now,
    });
    transitionJob(database, jobId, "running", now, null);
    insertLease(database, {
      job_id: jobId,
      generation: 1,
      holder: LEASE_HOLDER,
      expires_at: new Date(clock.now().getTime() + LEASE_TTL_MS).toISOString(),
    });
  });
  return { jobId, generation: 1 };
}

export function advanceJob(
  database: DatabaseSync,
  jobId: string,
  generation: number,
  clock: Clock,
  artifactDir: string,
  options: StepOptions = EMPTY_OPTIONS,
): WorkerStep | "stopped" | "already_published" {
  const latest = latestCheckpoint(database, jobId);
  if (latest?.step === "artifact_written" || latest?.step === "reconciled") {
    publishFile(database, jobId, artifactDir);
    return "already_published";
  }
  const step = nextWorkerStep(latest?.step ?? null);
  const now = clock.now();
  const payload = computePayload(database, jobId, step);
  let artifactFile: { tempPath: string; finalPath: string; body: string } | null = null;
  if (step === "artifact_written") {
    artifactFile = prepareArtifactFile(
      database,
      jobId,
      artifactDir,
      payload.body,
      payload.contentHash,
      now,
    );
  }
  try {
    transaction(database, () => {
      assertFence(database, jobId, generation, now);
      if (step === "artifact_written" && artifactFile) {
        storeArtifact(
          database,
          jobId,
          artifactFile.finalPath,
          payload.body,
          payload.contentHash,
          now,
        );
      }
      insertCheckpoint(database, {
        id: `checkpoint_${randomUUID()}`,
        job_id: jobId,
        step,
        generation,
        payload_json: canonicalJson(payload.checkpoint),
        created_at: now.toISOString(),
      });
      if (step === "artifact_written") {
        transitionJob(database, jobId, "verifying", now.toISOString(), null);
      }
      if (options.stopAfter === step) {
        if (options.faultInjection !== "controlled_demo") {
          throw new NightshiftError(
            "fault_not_authorized",
            "Fault injection is limited to the controlled demo.",
          );
        }
        stall(database, jobId, now);
      }
    });
  } catch (error) {
    if (artifactFile) {
      rmSync(artifactFile.tempPath, { force: true });
    }
    throw error;
  }
  if (artifactFile) {
    renameSync(artifactFile.tempPath, artifactFile.finalPath);
  }
  if (options.stopAfter === step) {
    return "stopped";
  }
  return step;
}

export function resumeJob(
  database: DatabaseSync,
  jobId: string,
  checkpointId: string,
  operationId: string,
  generation: number,
  clock: Clock,
  artifactDir: string,
  options: StepOptions = EMPTY_OPTIONS,
): ResumeResult {
  const existing = getOperation(database, operationId);
  if (existing) {
    if (existing.job_id !== jobId) {
      return { type: "rejected", code: "operation_job_mismatch" };
    }
    if (existing.status === "succeeded" && existing.result_json) {
      const stored = parseStoredJson(existing.result_json) as ResumeResultApplied;
      return { ...stored, type: "replay" };
    }
    if (existing.status === "started") {
      return { type: "uncertain", code: "uncertain_operation" };
    }
    return { type: "rejected", code: "operation_closed" };
  }

  const startedAt = clock.now().toISOString();
  transaction(database, () => {
    insertOperation(database, {
      operation_id: operationId,
      job_id: jobId,
      action: "resume_job",
      observed_generation: generation,
      status: "started",
      result_json: null,
      created_at: startedAt,
      updated_at: startedAt,
    });
  });

  try {
    const latest = latestCheckpoint(database, jobId);
    if (!latest || latest.id !== checkpointId) {
      const rejected = { type: "rejected" as const, code: "checkpoint_mismatch" };
      finishQuietly(database, operationId, "failed", rejected, clock.now().toISOString());
      return rejected;
    }
    let guard = 0;
    while (guard < WORKER_STEPS.length) {
      guard += 1;
      const current = latestCheckpoint(database, jobId);
      if (current?.step === "artifact_written" || current?.step === "reconciled") {
        publishFile(database, jobId, artifactDir);
        break;
      }
      const step = advanceJob(database, jobId, generation, clock, artifactDir, {
        stopAfter: options.stopAfter,
        faultInjection: options.faultInjection,
        crashAfterArtifact: false,
      });
      if (step === "stopped" || step === "artifact_written" || step === "already_published") {
        break;
      }
    }
    if (options.crashAfterArtifact) {
      if (options.faultInjection !== "controlled_demo") {
        throw new NightshiftError(
          "fault_not_authorized",
          "Fault injection is limited to the controlled demo.",
        );
      }
      throw new NightshiftError(
        "injected_crash",
        "Controlled fault after the artifact commit and before acknowledgement.",
      );
    }
    const job = requireJob(database, jobId);
    const checkpoint = latestCheckpoint(database, jobId);
    const applied: ResumeResultApplied = {
      type: "applied",
      status: job.status,
      checkpoint_id: checkpoint?.id ?? null,
      artifact_id: job.artifact_id,
    };
    finishQuietly(database, operationId, "succeeded", applied, clock.now().toISOString());
    recordResume(database, jobId, "applied", clock.now().toISOString(), {
      operation_id: operationId,
    });
    return applied;
  } catch (error) {
    if (isNightshiftError(error) && error.code === "injected_crash") {
      throw error;
    }
    const failure = {
      type: "rejected" as const,
      code: isNightshiftError(error) ? error.code : "resume_failed",
    };
    finishQuietly(database, operationId, "failed", failure, clock.now().toISOString());
    throw error;
  }
}

export function runUntilPublished(
  database: DatabaseSync,
  jobId: string,
  generation: number,
  clock: Clock,
  artifactDir: string,
): void {
  let guard = 0;
  while (guard < WORKER_STEPS.length) {
    guard += 1;
    const latest = latestCheckpoint(database, jobId);
    if (latest?.step === "artifact_written" || latest?.step === "reconciled") {
      return;
    }
    advanceJob(database, jobId, generation, clock, artifactDir);
  }
}

function nextWorkerStep(current: CheckpointStep | null): WorkerStep {
  if (!current || current === "reconciled") {
    return "input_accepted";
  }
  const index = WORKER_STEPS.indexOf(current);
  const next = WORKER_STEPS[index + 1];
  if (!next) {
    throw new NightshiftError(
      "checkpoint_complete",
      "The worker has already published the artifact.",
    );
  }
  return next;
}

function computePayload(
  database: DatabaseSync,
  jobId: string,
  step: CheckpointStep,
): { checkpoint: Record<string, unknown>; body: string; contentHash: string } {
  const job = requireJob(database, jobId);
  const rows = validateRows(parseStoredJson(job.input_json));
  const inputHash = hashRows(rows);
  if (inputHash !== job.input_hash) {
    throw new NightshiftError(
      "input_hash_mismatch",
      "Stored rows no longer match the accepted input hash.",
    );
  }
  const report = aggregate(rows, job.id, job.pipeline_version);
  const body = canonicalJson(report);
  return {
    checkpoint: {
      step,
      input_hash: inputHash,
      row_count: report.row_count,
      total_minutes: step === "input_accepted" || step === "parsed" ? null : report.total_minutes,
    },
    body,
    contentHash: sha256(body),
  };
}

function assertFence(database: DatabaseSync, jobId: string, generation: number, now: Date): void {
  const lease = getLease(database, jobId);
  const observed = observeLease(lease, now);
  if (observed.lease_state === "missing") {
    throw new NightshiftError("lease_missing", "No lease is recorded for this job.");
  }
  if (observed.lease_state === "uncertain") {
    throw new NightshiftError("lease_uncertain", "Lease expiry cannot be determined.");
  }
  if (observed.lease_state === "expired") {
    throw new NightshiftError("lease_expired", "The worker lease expired before this mutation.");
  }
  if (observed.generation !== generation) {
    throw new NightshiftError(
      "stale_generation",
      "The worker generation does not match the current lease.",
    );
  }
}

function stall(database: DatabaseSync, jobId: string, now: Date): void {
  const at = now.toISOString();
  transitionJob(database, jobId, "stalled", at, null);
  const expiredAt = new Date(now.getTime() - STALL_BACKDATE_MS).toISOString();
  expireLease(database, jobId, expiredAt);
  insertError(database, {
    id: `error_${randomUUID()}`,
    job_id: jobId,
    message: "Worker stopped before publication in the controlled demo.",
    source: "controlled_fault_injection",
    created_at: at,
  });
  insertAttempt(database, {
    id: `attempt_${randomUUID()}`,
    job_id: jobId,
    kind: "fault_injection",
    outcome: "stalled",
    evidence_json: canonicalJson({ environment: "controlled_fault_injection" }),
    created_at: at,
  });
}

function finishQuietly(
  database: DatabaseSync,
  operationId: string,
  status: "succeeded" | "failed",
  result: unknown,
  at: string,
): void {
  transaction(database, () => {
    finishOperation(database, operationId, status, canonicalJson(result), at);
  });
}

function recordResume(
  database: DatabaseSync,
  jobId: string,
  outcome: string,
  at: string,
  evidence: Record<string, unknown>,
): void {
  insertAttempt(database, {
    id: `attempt_${randomUUID()}`,
    job_id: jobId,
    kind: "resume_job",
    outcome,
    evidence_json: canonicalJson(evidence),
    created_at: at,
  });
}

export function latestStep(database: DatabaseSync, jobId: string): CheckpointRecord | null {
  return latestCheckpoint(database, jobId);
}
