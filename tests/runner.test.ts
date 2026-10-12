import assert from "node:assert/strict";
import test from "node:test";
import { startLiveRun, type RunnerPaths } from "../src/app/runner.js";
import { countOpenRuns, interruptStaleRuns, latestRun } from "../src/app/records.js";
import { createJob, runUntilPublished } from "../src/pipeline.js";
import { decideDeterministic } from "../src/controller.js";
import { expireLease, getLease } from "../src/store.js";
import { workspace } from "./helpers.js";

test("simultaneous run starts serialize the global limit and reuse the same job run", async () => {
  const env = workspace();
  const jobs = [];
  const session = "test-owner";
  for (let index = 0; index < 2; index += 1) {
    const job = await createJob(
      env.database,
      [{ day: "2026-10-12", queue: "billing", status: "closed", minutes: 3 }],
      env.clock,
      session,
    );
    await runUntilPublished(env.database, job.jobId, job.generation, env.clock, env.artifacts);
    jobs.push(job.jobId);
  }
  let release!: () => void;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  const work: Promise<void>[] = [];
  const paths: RunnerPaths = {
    database: env.database,
    clock: env.clock,
    artifactDir: env.artifacts,
    journalDir: env.dir,
    defer: (promise) => {
      work.push(promise);
    },
    env: {
      LITELLM_API_KEY: "mock-only",
      NIGHTSHIFT_SPEND_APPROVED: "1",
      NIGHTSHIFT_MODEL_BUDGET_USD: "10",
      NIGHTSHIFT_USD_PER_CALL: "1",
    },
    model: {
      source: "model",
      measuredUsage: null,
      async decide(input) {
        await paused;
        return decideDeterministic(input.jobId, input.memory);
      },
    },
  };
  try {
    const results = await Promise.all([
      startLiveRun(paths, jobs[0]!, session),
      startLiveRun(paths, jobs[0]!, session),
      startLiveRun(paths, jobs[1]!, session),
    ]);
    assert.equal(results.filter((result) => result.ok && result.created).length, 1);
    assert.equal(await countOpenRuns(env.database), 1);
    assert.equal(work.length, 1);
    const accepted = results.filter((result) => result.ok);
    assert.ok(accepted.length >= 1);
    for (const result of accepted) {
      if (result.ok) assert.equal(result.run.id, accepted[0]?.ok ? accepted[0].run.id : "");
    }
    release();
    await Promise.all(work);
    assert.equal(await countOpenRuns(env.database), 0);
  } finally {
    release();
    await Promise.all(work);
    env.database.close();
  }
});

test("stale run cleanup preserves active runs and a stale worker cannot expire a newer lease", async () => {
  const env = workspace();
  const job = await createJob(
    env.database,
    [{ day: "2026-10-12", queue: "access", status: "open", minutes: 1 }],
    env.clock,
    "owner",
  );
  const { insertRun } = await import("../src/app/records.js");
  await insertRun(env.database, {
    id: "test-run",
    job_id: job.jobId,
    session_id: "owner",
    created_at: env.clock.now().toISOString(),
  });
  await interruptStaleRuns(env.database, env.clock.now().toISOString());
  assert.equal((await latestRun(env.database, job.jobId))?.status, "running");
  const future = new Date(env.clock.now().getTime() + 331_000).toISOString();
  await interruptStaleRuns(env.database, future);
  assert.equal((await latestRun(env.database, job.jobId))?.reason, "interrupted");
  await env.database.prepare("UPDATE leases SET generation = 2 WHERE job_id = ?").run(job.jobId);
  const before = await getLease(env.database, job.jobId);
  await expireLease(env.database, job.jobId, "2020-01-01T00:00:00.000Z", 1);
  assert.deepEqual(await getLease(env.database, job.jobId), before);
  env.database.close();
});
