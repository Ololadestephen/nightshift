import type { DatabaseSync } from "node:sqlite";
import { assertTransition, type CheckpointStep, type JobStatus } from "./constants.js";
import { changedRows } from "./db.js";
import { NightshiftError } from "./errors.js";

export interface JobRecord {
  id: string;
  status: JobStatus;
  input_hash: string;
  pipeline_version: string;
  input_json: string;
  artifact_id: string | null;
  escalation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseRecord {
  job_id: string;
  generation: number;
  holder: string;
  expires_at: string;
}

export interface CheckpointRecord {
  id: string;
  job_id: string;
  step: CheckpointStep;
  generation: number;
  payload_json: string;
  created_at: string;
}

export interface OperationRecord {
  operation_id: string;
  job_id: string;
  action: string;
  observed_generation: number | null;
  status: "started" | "succeeded" | "failed";
  result_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactRecord {
  id: string;
  job_id: string;
  pipeline_version: string;
  input_hash: string;
  content_hash: string;
  body_json: string;
  file_path: string | null;
  created_at: string;
}

export interface AttemptRecord {
  id: string;
  job_id: string;
  kind: string;
  outcome: string;
  evidence_json: string;
  created_at: string;
}

export interface ErrorRecord {
  id: string;
  job_id: string;
  message: string;
  source: string;
  created_at: string;
}

export function insertJob(database: DatabaseSync, job: JobRecord): void {
  database
    .prepare(
      `INSERT INTO jobs (
        id, status, input_hash, pipeline_version, input_json, artifact_id,
        escalation_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      job.id,
      job.status,
      job.input_hash,
      job.pipeline_version,
      job.input_json,
      job.artifact_id,
      job.escalation_reason,
      job.created_at,
      job.updated_at,
    );
}

export function getJob(database: DatabaseSync, jobId: string): JobRecord | null {
  const row = database.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
  return row ? mapJob(row) : null;
}

export function requireJob(database: DatabaseSync, jobId: string): JobRecord {
  const job = getJob(database, jobId);
  if (!job) {
    throw new NightshiftError("job_missing", `Job ${jobId} does not exist.`);
  }
  return job;
}

export function transitionJob(
  database: DatabaseSync,
  jobId: string,
  to: JobStatus,
  at: string,
  reason: string | null,
): void {
  const job = requireJob(database, jobId);
  assertTransition(job.status, to);
  database
    .prepare(
      `UPDATE jobs
       SET status = ?, updated_at = ?, escalation_reason = COALESCE(?, escalation_reason)
       WHERE id = ?`,
    )
    .run(to, at, reason, jobId);
}

export function setArtifactId(
  database: DatabaseSync,
  jobId: string,
  artifactId: string,
  at: string,
): void {
  database
    .prepare("UPDATE jobs SET artifact_id = ?, updated_at = ? WHERE id = ?")
    .run(artifactId, at, jobId);
}

export function insertLease(database: DatabaseSync, lease: LeaseRecord): void {
  database
    .prepare("INSERT INTO leases (job_id, generation, holder, expires_at) VALUES (?, ?, ?, ?)")
    .run(lease.job_id, lease.generation, lease.holder, lease.expires_at);
}

export function getLease(database: DatabaseSync, jobId: string): LeaseRecord | null {
  const row = database.prepare("SELECT * FROM leases WHERE job_id = ?").get(jobId);
  return row ? mapLease(row) : null;
}

export function compareAndSwapLease(
  database: DatabaseSync,
  jobId: string,
  observedGeneration: number,
  nextGeneration: number,
  holder: string,
  expiresAt: string,
  nowIso: string,
): boolean {
  const result = database
    .prepare(
      `UPDATE leases
       SET generation = ?, holder = ?, expires_at = ?
       WHERE job_id = ? AND generation = ? AND expires_at <= ?`,
    )
    .run(nextGeneration, holder, expiresAt, jobId, observedGeneration, nowIso);
  return changedRows(result) === 1;
}

export function expireLease(database: DatabaseSync, jobId: string, expiresAt: string): void {
  database.prepare("UPDATE leases SET expires_at = ? WHERE job_id = ?").run(expiresAt, jobId);
}

export function insertCheckpoint(database: DatabaseSync, checkpoint: CheckpointRecord): void {
  database
    .prepare(
      `INSERT INTO checkpoints (id, job_id, step, generation, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      checkpoint.id,
      checkpoint.job_id,
      checkpoint.step,
      checkpoint.generation,
      checkpoint.payload_json,
      checkpoint.created_at,
    );
}

export function latestCheckpoint(database: DatabaseSync, jobId: string): CheckpointRecord | null {
  const row = database
    .prepare(
      `SELECT * FROM checkpoints
       WHERE job_id = ?
       ORDER BY CASE step
         WHEN 'input_accepted' THEN 1
         WHEN 'parsed' THEN 2
         WHEN 'aggregated' THEN 3
         WHEN 'artifact_written' THEN 4
         WHEN 'reconciled' THEN 5
         ELSE 0
       END DESC
       LIMIT 1`,
    )
    .get(jobId);
  return row ? mapCheckpoint(row) : null;
}

export function insertOperation(database: DatabaseSync, operation: OperationRecord): void {
  database
    .prepare(
      `INSERT INTO operations (
        operation_id, job_id, action, observed_generation, status, result_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      operation.operation_id,
      operation.job_id,
      operation.action,
      operation.observed_generation,
      operation.status,
      operation.result_json,
      operation.created_at,
      operation.updated_at,
    );
}

export function getOperation(database: DatabaseSync, operationId: string): OperationRecord | null {
  const row = database.prepare("SELECT * FROM operations WHERE operation_id = ?").get(operationId);
  return row ? mapOperation(row) : null;
}

export function finishOperation(
  database: DatabaseSync,
  operationId: string,
  status: "succeeded" | "failed",
  resultJson: string,
  at: string,
): void {
  database
    .prepare(
      "UPDATE operations SET status = ?, result_json = ?, updated_at = ? WHERE operation_id = ?",
    )
    .run(status, resultJson, at, operationId);
}

export function insertArtifact(database: DatabaseSync, artifact: ArtifactRecord): void {
  database
    .prepare(
      `INSERT INTO artifacts (
        id, job_id, pipeline_version, input_hash, content_hash, body_json, file_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      artifact.id,
      artifact.job_id,
      artifact.pipeline_version,
      artifact.input_hash,
      artifact.content_hash,
      artifact.body_json,
      artifact.file_path,
      artifact.created_at,
    );
}

export function getArtifact(database: DatabaseSync, jobId: string): ArtifactRecord | null {
  const row = database.prepare("SELECT * FROM artifacts WHERE job_id = ?").get(jobId);
  return row ? mapArtifact(row) : null;
}

export function countArtifacts(database: DatabaseSync, jobId: string): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM artifacts WHERE job_id = ?")
    .get(jobId) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function insertAttempt(database: DatabaseSync, attempt: AttemptRecord): void {
  database
    .prepare(
      `INSERT INTO attempts (id, job_id, kind, outcome, evidence_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      attempt.id,
      attempt.job_id,
      attempt.kind,
      attempt.outcome,
      attempt.evidence_json,
      attempt.created_at,
    );
}

export function listAttempts(database: DatabaseSync, jobId: string): AttemptRecord[] {
  return database
    .prepare("SELECT * FROM attempts WHERE job_id = ? ORDER BY created_at ASC, id ASC")
    .all(jobId)
    .map((row) => mapAttempt(row));
}

export function insertError(database: DatabaseSync, entry: ErrorRecord): void {
  database
    .prepare("INSERT INTO errors (id, job_id, message, source, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(entry.id, entry.job_id, entry.message, entry.source, entry.created_at);
}

export function listErrors(database: DatabaseSync, jobId: string): ErrorRecord[] {
  return database
    .prepare("SELECT * FROM errors WHERE job_id = ? ORDER BY created_at ASC, id ASC")
    .all(jobId)
    .map((row) => mapError(row));
}

function mapJob(row: unknown): JobRecord {
  const record = asRecord(row);
  return {
    id: asString(record, "id"),
    status: asString(record, "status") as JobStatus,
    input_hash: asString(record, "input_hash"),
    pipeline_version: asString(record, "pipeline_version"),
    input_json: asString(record, "input_json"),
    artifact_id: asNullableString(record, "artifact_id"),
    escalation_reason: asNullableString(record, "escalation_reason"),
    created_at: asString(record, "created_at"),
    updated_at: asString(record, "updated_at"),
  };
}

function mapLease(row: unknown): LeaseRecord {
  const record = asRecord(row);
  return {
    job_id: asString(record, "job_id"),
    generation: asNumber(record, "generation"),
    holder: asString(record, "holder"),
    expires_at: asString(record, "expires_at"),
  };
}

function mapCheckpoint(row: unknown): CheckpointRecord {
  const record = asRecord(row);
  return {
    id: asString(record, "id"),
    job_id: asString(record, "job_id"),
    step: asString(record, "step") as CheckpointStep,
    generation: asNumber(record, "generation"),
    payload_json: asString(record, "payload_json"),
    created_at: asString(record, "created_at"),
  };
}

function mapOperation(row: unknown): OperationRecord {
  const record = asRecord(row);
  return {
    operation_id: asString(record, "operation_id"),
    job_id: asString(record, "job_id"),
    action: asString(record, "action"),
    observed_generation: asNullableNumber(record, "observed_generation"),
    status: asString(record, "status") as OperationRecord["status"],
    result_json: asNullableString(record, "result_json"),
    created_at: asString(record, "created_at"),
    updated_at: asString(record, "updated_at"),
  };
}

function mapArtifact(row: unknown): ArtifactRecord {
  const record = asRecord(row);
  return {
    id: asString(record, "id"),
    job_id: asString(record, "job_id"),
    pipeline_version: asString(record, "pipeline_version"),
    input_hash: asString(record, "input_hash"),
    content_hash: asString(record, "content_hash"),
    body_json: asString(record, "body_json"),
    file_path: asNullableString(record, "file_path"),
    created_at: asString(record, "created_at"),
  };
}

function mapAttempt(row: unknown): AttemptRecord {
  const record = asRecord(row);
  return {
    id: asString(record, "id"),
    job_id: asString(record, "job_id"),
    kind: asString(record, "kind"),
    outcome: asString(record, "outcome"),
    evidence_json: asString(record, "evidence_json"),
    created_at: asString(record, "created_at"),
  };
}

function mapError(row: unknown): ErrorRecord {
  const record = asRecord(row);
  return {
    id: asString(record, "id"),
    job_id: asString(record, "job_id"),
    message: asString(record, "message"),
    source: asString(record, "source"),
    created_at: asString(record, "created_at"),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new NightshiftError("corrupt_row", "Database row was not an object.");
  }
  return value as Record<string, unknown>;
}

function asString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new NightshiftError("corrupt_row", `Column ${key} was not text.`);
  }
  return value;
}

function asNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  return asString(record, key);
}

function asNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") {
    throw new NightshiftError("corrupt_row", `Column ${key} was not a number.`);
  }
  return value;
}

function asNullableNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  return asNumber(record, key);
}
