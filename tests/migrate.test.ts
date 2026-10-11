import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { openDatabase } from "../src/db.js";
import { getJob } from "../src/store.js";

test("a version 1 database keeps its job and gains ownership columns", () => {
  const path = join(mkdtempSync(join(tmpdir(), "nightshift-migrate-")), "nightshift.sqlite");
  const created = new DatabaseSync(path);
  created.exec(`
    CREATE TABLE jobs (
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
    CREATE TABLE schema_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );
    INSERT INTO schema_meta (id, version) VALUES (1, 1);
    INSERT INTO jobs (
      id, status, input_hash, pipeline_version, input_json, artifact_id,
      escalation_reason, created_at, updated_at
    ) VALUES (
      'job_legacy', 'escalated', 'abc', '2026-10-10.1', '[]', NULL,
      'legacy', '2026-10-10T00:00:00.000Z', '2026-10-10T00:00:00.000Z'
    );
  `);
  created.close();
  const database = openDatabase(path);
  try {
    const version = database.prepare("SELECT version FROM schema_meta WHERE id = 1").get() as {
      version: number;
    };
    assert.equal(version.version, 2);
    const job = getJob(database, "job_legacy");
    assert.ok(job);
    assert.equal(job.owner_session_id, null);
    assert.equal(job.auto_finish, 1);
    assert.equal(job.escalation_reason, "legacy");
  } finally {
    database.close();
  }
});

test("an unknown schema version fails closed", () => {
  const path = join(mkdtempSync(join(tmpdir(), "nightshift-migrate-")), "nightshift.sqlite");
  const created = new DatabaseSync(path);
  created.exec(`
    CREATE TABLE schema_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );
    INSERT INTO schema_meta (id, version) VALUES (1, 9);
  `);
  created.close();
  assert.throws(() => openDatabase(path), /Unsupported schema version 9/);
});
