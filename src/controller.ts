import { createHash } from "node:crypto";
import { LEASE_HOLDER, type CheckpointStep, type JobStatus } from "./constants.js";
import type { LeaseState } from "./lease.js";
import { type ToolDecision, type ToolName } from "./policy.js";
import type { TokenUsage } from "./trace.js";

export interface JobObservation {
  id: string;
  status: JobStatus;
  input_hash: string;
  pipeline_version: string;
  observation_id: string;
}

export interface WorkerObservation {
  lease_state: LeaseState;
  generation: number | null;
  holder: string | null;
  expires_at: string | null;
  observation_id: string;
}

export interface CheckpointObservation {
  id: string | null;
  step: CheckpointStep | null;
  generation: number | null;
  observation_id: string;
}

export interface AgentMemory {
  job: JobObservation | null;
  worker: WorkerObservation | null;
  checkpoint: CheckpointObservation | null;
  errorsRead: boolean;
  recentErrors: string[];
  reclaimedGeneration: number | null;
  verified: boolean;
  resumeNonce: number;
  lastResume: {
    type: "applied" | "replay" | "uncertain" | "rejected";
    code: string | null;
  } | null;
}

export function emptyMemory(): AgentMemory {
  return {
    job: null,
    worker: null,
    checkpoint: null,
    errorsRead: false,
    recentErrors: [],
    reclaimedGeneration: null,
    verified: false,
    resumeNonce: 0,
    lastResume: null,
  };
}

export function decideDeterministic(jobId: string, memory: AgentMemory): ToolDecision {
  return firstLook(jobId, memory) ?? evidenceLook(jobId, memory) ?? repairLook(jobId, memory);
}

function firstLook(jobId: string, memory: AgentMemory): ToolDecision | null {
  if (!memory.job) {
    return decision("inspect_job", { job_id: jobId }, "Job status has not been observed.");
  }
  if (memory.job.status === "completed" || memory.job.status === "verifying") {
    return decision(
      "verify_artifact",
      { job_id: jobId },
      "Check the published artifact against the stored input.",
    );
  }
  return null;
}

function evidenceLook(jobId: string, memory: AgentMemory): ToolDecision | null {
  if (!memory.worker) {
    return decision("inspect_worker", { job_id: jobId }, "Lease ownership has not been observed.");
  }
  if (!memory.checkpoint) {
    return decision(
      "read_checkpoint",
      { job_id: jobId },
      "The latest checkpoint has not been observed.",
    );
  }
  if (!memory.errorsRead) {
    return decision(
      "read_recent_errors",
      { job_id: jobId },
      "Recent errors are untrusted evidence and are still unread.",
    );
  }
  if (memory.checkpoint.step === "artifact_written" || memory.checkpoint.step === "reconciled") {
    return decision(
      "verify_artifact",
      { job_id: jobId },
      "The artifact is published and must be reconciled.",
    );
  }
  return null;
}

function repairLook(jobId: string, memory: AgentMemory): ToolDecision {
  const worker = memory.worker;
  const checkpoint = memory.checkpoint;
  if (!worker || !checkpoint || checkpoint.id === null || worker.generation === null) {
    return decision(
      "escalate_incident",
      { job_id: jobId, reason: "checkpoint_missing" },
      "There is no safe checkpoint to resume.",
    );
  }
  if (worker.lease_state === "active" && memory.reclaimedGeneration === null) {
    return decision(
      "escalate_incident",
      { job_id: jobId, reason: "active_lease" },
      "The observed lease is still active.",
    );
  }
  if (worker.lease_state === "missing" || worker.lease_state === "uncertain") {
    return decision(
      "escalate_incident",
      { job_id: jobId, reason: `lease_${worker.lease_state}` },
      "Lease evidence is not safe to reclaim.",
    );
  }
  if (memory.reclaimedGeneration === null) {
    return decision(
      "reclaim_expired_lease",
      { job_id: jobId, observed_generation: worker.generation },
      "The observed lease is expired.",
    );
  }
  const operationId = `resume_${createHash("sha256")
    .update(`${jobId}:${checkpoint.id}:${memory.reclaimedGeneration}:${memory.resumeNonce}`)
    .digest("hex")
    .slice(0, 32)}`;
  return decision(
    "resume_job",
    {
      job_id: jobId,
      checkpoint_id: checkpoint.id,
      operation_id: operationId,
      generation: memory.reclaimedGeneration,
    },
    "Resume unpublished steps from the observed checkpoint.",
  );
}

function decision(
  tool: ToolDecision["tool"],
  args: Record<string, unknown>,
  rationale: string,
): ToolDecision {
  return { tool, arguments: args, rationale };
}

export interface DecisionInput {
  jobId: string;
  memory: AgentMemory;
  rejection: string | null;
}

export function remember(memory: AgentMemory, tool: ToolName, output: unknown): void {
  const record = output as Record<string, unknown>;
  if (tool === "inspect_job") {
    memory.job = output as JobObservation;
    adoptRecoveredLease(memory);
    return;
  }
  if (tool === "inspect_worker") {
    memory.worker = output as WorkerObservation;
    adoptRecoveredLease(memory);
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

function adoptRecoveredLease(memory: AgentMemory): void {
  const worker = memory.worker;
  if (memory.reclaimedGeneration !== null || memory.job?.status !== "recovering" || !worker) {
    return;
  }
  if (
    worker.lease_state === "active" &&
    worker.generation !== null &&
    worker.holder === LEASE_HOLDER
  ) {
    memory.reclaimedGeneration = worker.generation;
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
  if (
    record.type === "applied" ||
    record.type === "replay" ||
    record.type === "uncertain" ||
    record.type === "rejected"
  ) {
    memory.lastResume = {
      type: record.type,
      code: typeof record.code === "string" ? record.code : null,
    };
  }
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

export interface ModelClient {
  readonly source: "deterministic_controller" | "model";
  measuredUsage: TokenUsage | null;
  decide(input: DecisionInput): Promise<unknown>;
}
