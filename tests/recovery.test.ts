import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PIPELINE_VERSION } from "../src/constants.js";
import { openDatabase, transaction } from "../src/db.js";
import { seedScenario } from "../src/demo.js";
import { isNightshiftError } from "../src/errors.js";
import { reclaimExpiredLease } from "../src/lease.js";
import {
  advanceJob,
  createJob,
  latestStep,
  resumeJob,
  runUntilPublished,
} from "../src/pipeline.js";
import { loadFixture } from "../src/report.js";
import { fixturePath } from "../src/demo.js";
import {
  countArtifacts,
  getLease,
  getOperation,
  insertArtifact,
  insertAttempt,
  listAttempts,
  listErrors,
  requireJob,
  transitionJob,
} from "../src/store.js";
import { verifyArtifact } from "../src/verifier.js";
import { workspace } from "./helpers.js";
test("a completed controlled job reconciles the stored input and survives reopening the database", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "completed");
  const verification = await verifyArtifact(env.database, jobId, env.clock, env.artifacts);
  assert.equal(verification.ok, true);
  assert.equal(verification.report?.total_minutes, 120);
  assert.equal(verification.report?.row_count, 5);
  assert.equal(await countArtifacts(env.database, jobId), 1);
  const databasePath = join(env.dir, "nightshift.sqlite");
  env.database.close();
  const reopened = openDatabase(databasePath);
  assert.equal((await requireJob(reopened, jobId)).status, "completed");
  reopened.close();
});
test("an expired lease can be reclaimed once and resumed without a second artifact", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "expired_lease");
  assert.equal((await requireJob(env.database, jobId)).status, "stalled");
  const first = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  const repeated = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  assert.equal(first.ok, true);
  assert.equal(first.generation, 2);
  assert.equal(repeated.ok, false);
  assert.equal(repeated.code, "lease_active");
  await env.database
    .prepare("UPDATE leases SET expires_at = ? WHERE job_id = ?")
    .run("2026-10-10T11:00:00.000Z", jobId);
  const stale = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  assert.equal(stale.ok, false);
  assert.equal(stale.code, "stale_generation");
  assert.equal((await getLease(env.database, jobId))?.generation, 2);
  await env.database
    .prepare("UPDATE leases SET expires_at = ? WHERE job_id = ?")
    .run("2026-10-10T12:00:30.000Z", jobId);
  const checkpoint = await latestStep(env.database, jobId);
  assert.equal(checkpoint?.step, "parsed");
  const operationId = "resume_expired_lease_once";
  const resumed = await resumeJob(
    env.database,
    jobId,
    checkpoint?.id ?? "",
    operationId,
    2,
    env.clock,
    env.artifacts,
  );
  const replay = await resumeJob(
    env.database,
    jobId,
    checkpoint?.id ?? "",
    operationId,
    2,
    env.clock,
    env.artifacts,
  );
  assert.equal(resumed.type, "applied");
  assert.equal(replay.type, "replay");
  assert.equal(await countArtifacts(env.database, jobId), 1);
  const verification = await verifyArtifact(env.database, jobId, env.clock, env.artifacts);
  assert.equal(verification.ok, true);
  assert.equal((await requireJob(env.database, jobId)).status, "completed");
});
test("an active lease is not reclaimed and a stale generation cannot publish", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "active_lease");
  const refused = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "lease_active");
  assert.equal((await requireJob(env.database, jobId)).status, "running");
  assert.equal((await getLease(env.database, jobId))?.generation, 1);
  await env.database.prepare("UPDATE leases SET generation = 2 WHERE job_id = ?").run(jobId);
  await assert.rejects(
    async () => await advanceJob(env.database, jobId, 1, env.clock, env.artifacts),
    (error: unknown) => isNightshiftError(error) && error.code === "stale_generation",
  );
  assert.equal(await countArtifacts(env.database, jobId), 0);
  assert.equal((await latestStep(env.database, jobId))?.step, "parsed");
});
test("a crash after artifact commit stays uncertain and does not publish twice", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "expired_lease");
  const reclaimed = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  const checkpoint = await latestStep(env.database, jobId);
  await assert.rejects(
    async () =>
      await resumeJob(
        env.database,
        jobId,
        checkpoint?.id ?? "",
        "resume_crash_once",
        reclaimed.generation ?? 0,
        env.clock,
        env.artifacts,
        {
          stopAfter: null,
          faultInjection: "controlled_demo",
          crashAfterArtifact: true,
        },
      ),
    (error: unknown) => isNightshiftError(error) && error.code === "injected_crash",
  );
  assert.equal((await getOperation(env.database, "resume_crash_once"))?.status, "started");
  assert.equal(await countArtifacts(env.database, jobId), 1);
  const uncertain = await resumeJob(
    env.database,
    jobId,
    checkpoint?.id ?? "",
    "resume_crash_once",
    reclaimed.generation ?? 0,
    env.clock,
    env.artifacts,
  );
  assert.equal(uncertain.type, "uncertain");
  const published = await latestStep(env.database, jobId);
  const continued = await resumeJob(
    env.database,
    jobId,
    published?.id ?? "",
    "resume_after_inspection",
    reclaimed.generation ?? 0,
    env.clock,
    env.artifacts,
  );
  assert.equal(continued.type, "applied");
  assert.equal(await countArtifacts(env.database, jobId), 1);
  assert.equal((await verifyArtifact(env.database, jobId, env.clock, env.artifacts)).ok, true);
});
test("resume rejects a stale checkpoint and a missing file is republished before verification", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "expired_lease");
  const reclaimed = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  const mismatched = await resumeJob(
    env.database,
    jobId,
    "checkpoint_does_not_exist",
    "resume_mismatch_1",
    reclaimed.generation ?? 0,
    env.clock,
    env.artifacts,
  );
  assert.equal(mismatched.type, "rejected");
  assert.equal(mismatched.type === "rejected" && mismatched.code, "checkpoint_mismatch");
  const checkpoint = await latestStep(env.database, jobId);
  await resumeJob(
    env.database,
    jobId,
    checkpoint?.id ?? "",
    "resume_publish_once",
    reclaimed.generation ?? 0,
    env.clock,
    env.artifacts,
  );
  rmSync(join(env.artifacts, `${jobId}.json`));
  const restored = await advanceJob(
    env.database,
    jobId,
    reclaimed.generation ?? 0,
    env.clock,
    env.artifacts,
  );
  assert.equal(restored, "already_published");
  assert.equal((await verifyArtifact(env.database, jobId, env.clock, env.artifacts)).ok, true);
});
test("corrupt artifact content escalates and preserves the original input", async () => {
  const env = workspace();
  const rows = loadFixture(fixturePath());
  const created = await createJob(env.database, rows, env.clock);
  await runUntilPublished(
    env.database,
    created.jobId,
    created.generation,
    env.clock,
    env.artifacts,
  );
  const before = (await requireJob(env.database, created.jobId)).input_json;
  await env.database
    .prepare("UPDATE artifacts SET body_json = ? WHERE job_id = ?")
    .run('{"job_id":"wrong"}', created.jobId);
  const verification = await verifyArtifact(env.database, created.jobId, env.clock, env.artifacts);
  assert.equal(verification.ok, false);
  assert.equal((await requireJob(env.database, created.jobId)).status, "escalated");
  assert.equal((await requireJob(env.database, created.jobId)).input_json, before);
  assert.ok(
    (await listErrors(env.database, created.jobId)).some((entry) => entry.source === "verifier"),
  );
});
test("invalid input is retained, terminal transitions are rejected, and a failed transaction rolls back", async () => {
  const env = workspace();
  const invalid = await createJob(
    env.database,
    [{ day: "yesterday", queue: "billing", status: "open", minutes: 1 }],
    env.clock,
  );
  const invalidJob = await requireJob(env.database, invalid.jobId);
  assert.equal(invalidJob.status, "escalated");
  assert.match(invalidJob.input_json, /yesterday/);
  assert.equal((await listErrors(env.database, invalid.jobId)).length, 1);
  const completed = await seedScenario(env.database, env.clock, env.artifacts, "completed");
  await assert.rejects(
    async () =>
      await transitionJob(env.database, completed, "running", env.clock.now().toISOString(), null),
    (error: unknown) => isNightshiftError(error) && error.code === "illegal_transition",
  );
  await assert.rejects(
    async () =>
      await transaction(env.database, async (boundDatabase) => {
        await insertAttempt(boundDatabase, {
          id: "attempt_rollback",
          job_id: completed,
          kind: "probe",
          outcome: "rolled_back",
          evidence_json: "{}",
          created_at: env.clock.now().toISOString(),
        });
        throw new Error("rollback");
      }),
  );
  assert.equal(
    (await listAttempts(env.database, completed)).some(
      (attempt) => attempt.id === "attempt_rollback",
    ),
    false,
  );
});
test("uncertain lease evidence fails closed and a second artifact row collides", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "expired_lease");
  await env.database
    .prepare("UPDATE leases SET expires_at = ? WHERE job_id = ?")
    .run("not-a-date", jobId);
  const uncertain = await reclaimExpiredLease(env.database, jobId, 1, env.clock);
  assert.equal(uncertain.ok, false);
  assert.equal(uncertain.code, "lease_uncertain");
  assert.equal((await getLease(env.database, jobId))?.generation, 1);
  const rows = loadFixture(fixturePath());
  const created = await createJob(env.database, rows, env.clock);
  await runUntilPublished(
    env.database,
    created.jobId,
    created.generation,
    env.clock,
    env.artifacts,
  );
  await assert.rejects(
    async () =>
      await insertArtifact(env.database, {
        id: "artifact_duplicate",
        job_id: created.jobId,
        pipeline_version: PIPELINE_VERSION,
        input_hash: (await requireJob(env.database, created.jobId)).input_hash,
        content_hash: "different",
        body_json: "{}",
        file_path: null,
        created_at: env.clock.now().toISOString(),
      }),
  );
  assert.equal(await countArtifacts(env.database, created.jobId), 1);
});
test("fault injection without the controlled-demo flag does not stall the job", async () => {
  const env = workspace();
  const rows = loadFixture(fixturePath());
  const created = await createJob(env.database, rows, env.clock);
  await assert.rejects(
    async () =>
      await advanceJob(env.database, created.jobId, created.generation, env.clock, env.artifacts, {
        stopAfter: "input_accepted",
        faultInjection: null,
        crashAfterArtifact: false,
      }),
    (error: unknown) => isNightshiftError(error) && error.code === "fault_not_authorized",
  );
  assert.equal((await requireJob(env.database, created.jobId)).status, "running");
  assert.equal(await latestStep(env.database, created.jobId), null);
});
