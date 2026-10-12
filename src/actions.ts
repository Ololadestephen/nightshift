import { randomUUID } from "node:crypto";
import type { Database } from "./database-port.js";
import type { Clock } from "./clock.js";
import { CODE_VERSION } from "./constants.js";
import type {
  AgentMemory,
  CheckpointObservation,
  JobObservation,
  WorkerObservation,
} from "./controller.js";
import { NightshiftError, isNightshiftError } from "./errors.js";
import { observeLease, reclaimExpiredLease } from "./lease.js";
import { resumeJob } from "./pipeline.js";
import type { ToolName } from "./policy.js";
import { redact } from "./redact.js";
import { canonicalJson } from "./report.js";
import {
  getArtifact,
  getLease,
  insertAttempt,
  insertError,
  latestCheckpoint,
  listErrors,
  requireJob,
  transitionJob,
} from "./store.js";
import { verifyArtifact } from "./verifier.js";
export interface ActionContext {
  database: Database;
  clock: Clock;
  artifactDir: string;
  jobId: string;
  controlledFault?: "resume_ack_lost";
}
export async function executeTool(
  input: ActionContext,
  decision: {
    tool: ToolName;
    arguments: Record<string, unknown>;
  },
  memory: AgentMemory,
): Promise<unknown> {
  const observedAt = input.clock.now().toISOString();
  const observationId = `obs_${randomUUID()}`;
  switch (decision.tool) {
    case "inspect_job":
      return await inspectJob(input, observationId, observedAt);
    case "inspect_worker":
      return await inspectWorker(input, observationId, observedAt);
    case "read_checkpoint":
      return await readCheckpoint(input, observationId, observedAt);
    case "read_recent_errors":
      return await readErrors(input, observationId, observedAt);
    case "reclaim_expired_lease":
      return await reclaim(input, decision.arguments, observationId);
    case "resume_job":
      return await resume(input, decision.arguments);
    case "verify_artifact":
      return await verifyArtifact(input.database, input.jobId, input.clock, input.artifactDir);
    case "escalate_incident":
      return await escalate(input, String(decision.arguments.reason), observationId, memory);
    default:
      throw new NightshiftError("unknown_tool", "The tool is not allowlisted.");
  }
}
export async function escalate(
  input: ActionContext,
  reason: string,
  observationId = `obs_${randomUUID()}`,
  memory?: AgentMemory,
): Promise<{
  escalated: true;
  reason: string;
  job_status: string;
  observation_id: string;
}> {
  const now = input.clock.now().toISOString();
  const job = await requireJob(input.database, input.jobId);
  if (job.status !== "completed" && job.status !== "escalated") {
    await transitionJob(input.database, input.jobId, "escalated", now, reason);
  }
  await insertAttempt(input.database, {
    id: `attempt_${randomUUID()}`,
    job_id: input.jobId,
    kind: "escalate_incident",
    outcome: reason,
    evidence_json: canonicalJson({
      reason,
      observation_id: observationId,
      job_observation: memory?.job?.observation_id ?? null,
      worker_observation: memory?.worker?.observation_id ?? null,
      checkpoint_observation: memory?.checkpoint?.observation_id ?? null,
    }),
    created_at: now,
  });
  await insertError(input.database, {
    id: `error_${randomUUID()}`,
    job_id: input.jobId,
    message: `Escalated: ${reason}`,
    source: "agent",
    created_at: now,
  });
  return {
    escalated: true,
    reason,
    job_status: (await requireJob(input.database, input.jobId)).status,
    observation_id: observationId,
  };
}
async function inspectJob(
  input: ActionContext,
  observationId: string,
  observedAt: string,
): Promise<unknown> {
  const job = await requireJob(input.database, input.jobId);
  const observation: JobObservation = {
    id: job.id,
    status: job.status,
    input_hash: job.input_hash,
    pipeline_version: job.pipeline_version,
    observation_id: observationId,
  };
  return { ...observation, observed_at: observedAt, code_version: CODE_VERSION };
}
async function inspectWorker(
  input: ActionContext,
  observationId: string,
  observedAt: string,
): Promise<unknown> {
  const observed = observeLease(await getLease(input.database, input.jobId), input.clock.now());
  const observation: WorkerObservation = { ...observed, observation_id: observationId };
  return { ...observation, observed_at: observedAt };
}
async function readCheckpoint(
  input: ActionContext,
  observationId: string,
  observedAt: string,
): Promise<unknown> {
  const checkpoint = await latestCheckpoint(input.database, input.jobId);
  const observation: CheckpointObservation = {
    id: checkpoint?.id ?? null,
    step: checkpoint?.step ?? null,
    generation: checkpoint?.generation ?? null,
    observation_id: observationId,
  };
  return { ...observation, observed_at: observedAt };
}
async function readErrors(
  input: ActionContext,
  observationId: string,
  observedAt: string,
): Promise<unknown> {
  const errors = (await listErrors(input.database, input.jobId)).slice(-10).map((entry) => ({
    id: entry.id,
    source: entry.source,
    untrusted: true,
    message: redact(entry.message).slice(0, 240),
  }));
  return { observation_id: observationId, observed_at: observedAt, errors };
}
async function reclaim(
  input: ActionContext,
  args: Record<string, unknown>,
  observationId: string,
): Promise<unknown> {
  const observedGeneration = args.observed_generation;
  if (typeof observedGeneration !== "number") {
    throw new NightshiftError("invalid_arguments", "Observed generation is missing.");
  }
  return {
    ...(await reclaimExpiredLease(input.database, input.jobId, observedGeneration, input.clock)),
    observation_id: observationId,
  };
}
async function resume(input: ActionContext, args: Record<string, unknown>): Promise<unknown> {
  const loseAcknowledgement =
    input.controlledFault === "resume_ack_lost" &&
    (await getArtifact(input.database, input.jobId)) === null;
  try {
    return await resumeJob(
      input.database,
      input.jobId,
      String(args.checkpoint_id),
      String(args.operation_id),
      Number(args.generation),
      input.clock,
      input.artifactDir,
      {
        stopAfter: null,
        faultInjection: loseAcknowledgement ? "controlled_demo" : null,
        crashAfterArtifact: loseAcknowledgement,
      },
    );
  } catch (error) {
    if (isNightshiftError(error) && error.code === "injected_crash") {
      const at = input.clock.now().toISOString();
      await insertAttempt(input.database, {
        id: `attempt_${randomUUID()}`,
        job_id: input.jobId,
        kind: "resume_job",
        outcome: "acknowledgement_lost",
        evidence_json: canonicalJson({ operation_id: args.operation_id, code: error.code }),
        created_at: at,
      });
      await insertError(input.database, {
        id: `error_${randomUUID()}`,
        job_id: input.jobId,
        message: "Controlled demo: resume acknowledgement lost after the artifact commit.",
        source: "controlled_fault_injection",
        created_at: at,
      });
      return { type: "uncertain", code: "injected_crash" };
    }
    throw error;
  }
}
