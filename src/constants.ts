import { NightshiftError } from "./errors.js";

export const CODE_VERSION = "0.1.0";
export const PIPELINE_VERSION = "2026-10-10.1";
export const LEASE_TTL_MS = 30_000;
export const STALL_BACKDATE_MS = 1_000;
export const LEASE_HOLDER = "nightshift-worker";

export const WORKER_STEPS = ["input_accepted", "parsed", "aggregated", "artifact_written"] as const;

export const CHECKPOINT_STEPS = [...WORKER_STEPS, "reconciled"] as const;

export const JOB_STATUSES = [
  "queued",
  "running",
  "stalled",
  "recovering",
  "verifying",
  "completed",
  "escalated",
] as const;

export type WorkerStep = (typeof WORKER_STEPS)[number];
export type CheckpointStep = (typeof CHECKPOINT_STEPS)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

const ALLOWED: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["running", "escalated"],
  running: ["stalled", "verifying", "escalated"],
  stalled: ["recovering", "escalated"],
  recovering: ["running", "verifying", "escalated"],
  verifying: ["completed", "escalated"],
  completed: [],
  escalated: [],
};

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!ALLOWED[from].includes(to)) {
    throw new NightshiftError("illegal_transition", `Cannot move a job from ${from} to ${to}.`);
  }
}
