import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createClient } from "@libsql/client";
import { openDatabase, SCHEMA } from "../src/db.js";
import { RemoteDatabase } from "../src/remote-database.js";
import { createJob, runUntilPublished } from "../src/pipeline.js";
import { countArtifacts, getArtifact, requireJob } from "../src/store.js";
import { verifyArtifact } from "../src/verifier.js";
import { reserveLedger, countLedger } from "../src/app/records.js";
import { systemClock } from "../src/clock.js";

const ROWS = [{ day: "2026-10-12", queue: "billing", status: "closed", minutes: 17 }];

test("a suspended local transaction rolls back before queued reads can observe it", async () => {
  const database = openDatabase(":memory:");
  await database.exec("CREATE TABLE transaction_test (value TEXT)");
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const pause = new Promise<void>((resolve) => {
    release = resolve;
  });
  const write = database.transaction(async (connection) => {
    await connection.prepare("INSERT INTO transaction_test VALUES (?)").run("uncommitted");
    entered();
    await pause;
    throw new Error("rollback");
  });
  await ready;
  const read = database.prepare("SELECT * FROM transaction_test").all();
  release();
  await assert.rejects(write, /rollback/);
  assert.deepEqual(await read, []);
  database.close();
});

test("the libSQL adapter persists and reconciles a report without a local artifact file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nightshift-libsql-"));
  const url = `file:${join(dir, "database.sqlite")}`;
  let database = new RemoteDatabase(createClient({ url }));
  await database.exec(SCHEMA);
  const created = await createJob(database, ROWS, systemClock, "test-session");
  const missingDirectory = join(dir, "never-created");
  await runUntilPublished(
    database,
    created.jobId,
    created.generation,
    systemClock,
    missingDirectory,
  );
  database.close();
  database = new RemoteDatabase(createClient({ url }));
  try {
    const result = await verifyArtifact(database, created.jobId, systemClock, missingDirectory);
    assert.equal(result.ok, true);
    assert.equal(result.report?.total_minutes, 17);
    assert.equal((await getArtifact(database, created.jobId))?.file_path, null);
    assert.equal(await countArtifacts(database, created.jobId), 1);
    assert.equal((await requireJob(database, created.jobId)).status, "completed");
    await database
      .prepare("UPDATE artifacts SET body_json = ? WHERE job_id = ?")
      .run("{}", created.jobId);
    const corrupt = await verifyArtifact(database, created.jobId, systemClock, missingDirectory);
    assert.equal(corrupt.ok, false);
    assert.ok(corrupt.mismatches.includes("content_hash"));
    assert.ok(corrupt.mismatches.includes("report_body"));
  } finally {
    database.close();
  }
});

test("simultaneous reservations cannot exceed the shared call budget", async () => {
  const database = openDatabase(":memory:");
  try {
    const results = await Promise.allSettled([
      reserveLedger(database, 1, "first", systemClock.now().toISOString()),
      reserveLedger(database, 1, "second", systemClock.now().toISOString()),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await countLedger(database), 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.equal(rejected?.reason.code, "budget_cap");
  } finally {
    database.close();
  }
});
