import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  pipeline_version TEXT NOT NULL,
  input_json TEXT NOT NULL,
  artifact_id TEXT,
  escalation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  step TEXT NOT NULL,
  generation INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (job_id, step)
);

CREATE TABLE IF NOT EXISTS leases (
  job_id TEXT PRIMARY KEY REFERENCES jobs(id),
  generation INTEGER NOT NULL,
  holder TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  operation_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  action TEXT NOT NULL,
  observed_generation INTEGER,
  status TEXT NOT NULL,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  pipeline_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  body_json TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (job_id, pipeline_version)
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  kind TEXT NOT NULL,
  outcome TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS errors (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export function openDatabase(filePath: string): DatabaseSync {
  if (filePath !== ":memory:") {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const database = new DatabaseSync(filePath);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  migrate(database);
  return database;
}

export function transaction<T>(database: DatabaseSync, run: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function changedRows(result: { changes: number | bigint }): number {
  return Number(result.changes);
}

function migrate(database: DatabaseSync): void {
  database.exec(
    `CREATE TABLE IF NOT EXISTS schema_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    )`,
  );
  const existing = database.prepare("SELECT version FROM schema_meta WHERE id = 1").get() as
    { version: number } | undefined;
  if (!existing) {
    database.exec(SCHEMA);
    database.prepare("INSERT INTO schema_meta (id, version) VALUES (1, 1)").run();
    return;
  }
  if (existing.version !== 1) {
    throw new Error(`Unsupported schema version ${existing.version}.`);
  }
}
