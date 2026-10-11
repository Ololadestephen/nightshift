import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { transaction } from "../db.js";
import { NightshiftError } from "../errors.js";

export interface RunRecord {
  id: string;
  job_id: string;
  session_id: string;
  status: "queued" | "running" | "completed" | "escalated" | "blocked";
  reason: string | null;
  decision_source: string | null;
  model_calls: number;
  tools_json: string;
  trace_json: string;
  rejections_json: string;
  neatlogs: string | null;
  trace_id: string | null;
  usage_json: string | null;
  verification_json: string | null;
  created_at: string;
  updated_at: string;
}

export function insertSession(database: DatabaseSync, id: string, at: string): void {
  database.prepare("INSERT INTO sessions (id, created_at) VALUES (?, ?)").run(id, at);
}

export function getSession(database: DatabaseSync, id: string): { id: string } | null {
  const row = database.prepare("SELECT id FROM sessions WHERE id = ?").get(id) as
    { id: string } | undefined;
  return row ?? null;
}

export function countSessions(database: DatabaseSync, since: string | null): number {
  const row = (
    since
      ? database.prepare("SELECT COUNT(*) AS count FROM sessions WHERE created_at >= ?").get(since)
      : database.prepare("SELECT COUNT(*) AS count FROM sessions").get()
  ) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function countOwnedJobs(database: DatabaseSync, sessionId: string): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM jobs WHERE owner_session_id = ?")
    .get(sessionId) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function listOwnedJobIds(database: DatabaseSync, sessionId: string): string[] {
  const rows = database
    .prepare("SELECT id FROM jobs WHERE owner_session_id = ? ORDER BY created_at DESC, id DESC")
    .all(sessionId) as { id: string }[];
  return rows.map((row) => row.id);
}

export function assignJob(
  database: DatabaseSync,
  jobId: string,
  sessionId: string,
  autoFinish: number,
): void {
  database
    .prepare("UPDATE jobs SET owner_session_id = ?, auto_finish = ? WHERE id = ?")
    .run(sessionId, autoFinish, jobId);
}

export function listFinishableJobs(database: DatabaseSync): string[] {
  const rows = database
    .prepare("SELECT id FROM jobs WHERE status = 'running' AND auto_finish = 1")
    .all() as { id: string }[];
  return rows.map((row) => row.id);
}

export function openRun(database: DatabaseSync, jobId: string): RunRecord | null {
  const row = database
    .prepare(
      "SELECT * FROM agent_runs WHERE job_id = ? AND status IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1",
    )
    .get(jobId);
  return row ? mapRun(row) : null;
}

export function latestRun(database: DatabaseSync, jobId: string): RunRecord | null {
  const row = database
    .prepare("SELECT * FROM agent_runs WHERE job_id = ? ORDER BY created_at DESC, id DESC LIMIT 1")
    .get(jobId);
  return row ? mapRun(row) : null;
}

export function countOpenRuns(database: DatabaseSync): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM agent_runs WHERE status IN ('queued', 'running')")
    .get() as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function insertRun(
  database: DatabaseSync,
  run: Pick<RunRecord, "id" | "job_id" | "session_id" | "created_at">,
): void {
  database
    .prepare(
      `INSERT INTO agent_runs (
        id, job_id, session_id, status, reason, decision_source, model_calls,
        tools_json, trace_json, rejections_json, neatlogs, trace_id, usage_json,
        verification_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'running', NULL, NULL, 0, '[]', '[]', '[]', NULL, NULL, NULL, NULL, ?, ?)`,
    )
    .run(run.id, run.job_id, run.session_id, run.created_at, run.created_at);
}

export function saveRun(database: DatabaseSync, run: RunRecord): void {
  database
    .prepare(
      `UPDATE agent_runs SET
        status = ?, reason = ?, decision_source = ?, model_calls = ?, tools_json = ?,
        trace_json = ?, rejections_json = ?, neatlogs = ?, trace_id = ?, usage_json = ?,
        verification_json = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      run.status,
      run.reason,
      run.decision_source,
      run.model_calls,
      run.tools_json,
      run.trace_json,
      run.rejections_json,
      run.neatlogs,
      run.trace_id,
      run.usage_json,
      run.verification_json,
      run.updated_at,
      run.id,
    );
}

export function interruptRuns(database: DatabaseSync, at: string): void {
  database
    .prepare(
      `UPDATE agent_runs
       SET status = 'blocked', reason = 'interrupted', updated_at = ?
       WHERE status IN ('queued', 'running')`,
    )
    .run(at);
}

export function countLedger(database: DatabaseSync): number {
  const row = database.prepare("SELECT COUNT(*) AS count FROM budget_ledger").get() as
    { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function reserveLedger(
  database: DatabaseSync,
  allowed: number,
  runId: string,
  at: string,
): void {
  transaction(database, () => {
    if (countLedger(database) >= allowed) {
      throw new NightshiftError("budget_cap", "The server model-call cap is exhausted.");
    }
    database
      .prepare("INSERT INTO budget_ledger (id, run_id, created_at) VALUES (?, ?, ?)")
      .run(`spend_${randomUUID()}`, runId, at);
  });
}

function mapRun(row: unknown): RunRecord {
  const record = row as Record<string, unknown>;
  return {
    id: String(record.id),
    job_id: String(record.job_id),
    session_id: String(record.session_id),
    status: record.status as RunRecord["status"],
    reason: record.reason === null ? null : String(record.reason),
    decision_source: record.decision_source === null ? null : String(record.decision_source),
    model_calls: Number(record.model_calls),
    tools_json: String(record.tools_json),
    trace_json: String(record.trace_json),
    rejections_json: String(record.rejections_json),
    neatlogs: record.neatlogs === null ? null : String(record.neatlogs),
    trace_id: record.trace_id === null ? null : String(record.trace_id),
    usage_json: record.usage_json === null ? null : String(record.usage_json),
    verification_json: record.verification_json === null ? null : String(record.verification_json),
    created_at: String(record.created_at),
    updated_at: String(record.updated_at),
  };
}
