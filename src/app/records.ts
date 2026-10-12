import { randomUUID } from "node:crypto";
import type { Database } from "../database-port.js";
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
export async function insertSession(database: Database, id: string, at: string): Promise<void> {
  await database.prepare("INSERT INTO sessions (id, created_at) VALUES (?, ?)").run(id, at);
}
export async function getSession(
  database: Database,
  id: string,
): Promise<{
  id: string;
} | null> {
  const row = (await database.prepare("SELECT id FROM sessions WHERE id = ?").get(id)) as
    | {
        id: string;
      }
    | undefined;
  return row ?? null;
}
export async function countSessions(database: Database, since: string | null): Promise<number> {
  const row = (
    since
      ? await database
          .prepare("SELECT COUNT(*) AS count FROM sessions WHERE created_at >= ?")
          .get(since)
      : await database.prepare("SELECT COUNT(*) AS count FROM sessions").get()
  ) as
    | {
        count: number;
      }
    | undefined;
  return Number(row?.count ?? 0);
}
export async function countOwnedJobs(database: Database, sessionId: string): Promise<number> {
  const row = (await database
    .prepare("SELECT COUNT(*) AS count FROM jobs WHERE owner_session_id = ?")
    .get(sessionId)) as
    | {
        count: number;
      }
    | undefined;
  return Number(row?.count ?? 0);
}
export async function listOwnedJobIds(database: Database, sessionId: string): Promise<string[]> {
  const rows = (await database
    .prepare("SELECT id FROM jobs WHERE owner_session_id = ? ORDER BY created_at DESC, id DESC")
    .all(sessionId)) as {
    id: string;
  }[];
  return rows.map((row) => row.id);
}
export async function assignJob(
  database: Database,
  jobId: string,
  sessionId: string,
  autoFinish: number,
): Promise<void> {
  await database
    .prepare("UPDATE jobs SET owner_session_id = ?, auto_finish = ? WHERE id = ?")
    .run(sessionId, autoFinish, jobId);
}
export async function listFinishableJobs(database: Database): Promise<string[]> {
  const rows = (await database
    .prepare("SELECT id FROM jobs WHERE status = 'running' AND auto_finish = 1")
    .all()) as {
    id: string;
  }[];
  return rows.map((row) => row.id);
}
export async function openRun(database: Database, jobId: string): Promise<RunRecord | null> {
  const row = await database
    .prepare(
      "SELECT * FROM agent_runs WHERE job_id = ? AND status IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1",
    )
    .get(jobId);
  return row ? mapRun(row) : null;
}
export async function latestRun(database: Database, jobId: string): Promise<RunRecord | null> {
  const row = await database
    .prepare("SELECT * FROM agent_runs WHERE job_id = ? ORDER BY created_at DESC, id DESC LIMIT 1")
    .get(jobId);
  return row ? mapRun(row) : null;
}
export async function countOpenRuns(database: Database): Promise<number> {
  const row = (await database
    .prepare("SELECT COUNT(*) AS count FROM agent_runs WHERE status IN ('queued', 'running')")
    .get()) as
    | {
        count: number;
      }
    | undefined;
  return Number(row?.count ?? 0);
}
export async function insertRun(
  database: Database,
  run: Pick<RunRecord, "id" | "job_id" | "session_id" | "created_at">,
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO agent_runs (
        id, job_id, session_id, status, reason, decision_source, model_calls,
        tools_json, trace_json, rejections_json, neatlogs, trace_id, usage_json,
        verification_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'running', NULL, NULL, 0, '[]', '[]', '[]', NULL, NULL, NULL, NULL, ?, ?)`,
    )
    .run(run.id, run.job_id, run.session_id, run.created_at, run.created_at);
}
export async function saveRun(database: Database, run: RunRecord): Promise<void> {
  await database
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
export async function interruptRuns(database: Database, at: string): Promise<void> {
  await database
    .prepare(
      `UPDATE agent_runs
       SET status = 'blocked', reason = 'interrupted', updated_at = ?
       WHERE status IN ('queued', 'running')`,
    )
    .run(at);
}
/** Vercel invocations end after 300 seconds; retain interrupted run evidence. */
export async function interruptStaleRuns(database: Database, at: string): Promise<void> {
  const cutoff = new Date(Date.parse(at) - 330_000).toISOString();
  await database
    .prepare(
      `UPDATE agent_runs SET status = 'blocked', reason = 'interrupted', updated_at = ?
     WHERE status IN ('queued', 'running') AND updated_at < ?`,
    )
    .run(at, cutoff);
}

export async function countLedger(database: Database): Promise<number> {
  const row = (await database.prepare("SELECT COUNT(*) AS count FROM budget_ledger").get()) as
    | {
        count: number;
      }
    | undefined;
  return Number(row?.count ?? 0);
}
export async function reserveLedger(
  database: Database,
  allowed: number,
  runId: string,
  at: string,
): Promise<void> {
  await transaction(database, async (boundDatabase) => {
    if ((await countLedger(boundDatabase)) >= allowed) {
      throw new NightshiftError("budget_cap", "The server model-call cap is exhausted.");
    }
    await boundDatabase
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
