import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { demoRecover, loadEnvFile, modelRecover } from "../src/cli.js";
import { ManualClock } from "../src/clock.js";
import { requireJob } from "../src/store.js";
import { openDatabase } from "../src/db.js";
import { toolParameters } from "../src/policy.js";

test("the demo command recovers one controlled expired-lease job", async () => {
  const root = mkdtempSync(join(tmpdir(), "nightshift-demo-"));
  const result = await demoRecover(root, new ManualClock(new Date("2026-10-10T12:00:00.000Z")), {});
  assert.equal(result.outcome, "completed");
  assert.equal(result.decision_source, "deterministic_controller");
  assert.equal(result.reason, "verified");
  assert.equal(result.neatlogs, "disabled_missing_api_key");
  assert.equal(result.verification?.report?.total_minutes, 120);
});

test("environment loading fills missing keys and a model run stays blocked without spend approval", async () => {
  const root = mkdtempSync(join(tmpdir(), "nightshift-env-"));
  const env: NodeJS.ProcessEnv = { LITELLM_API_KEY: "already-set" };
  writeFileSync(
    join(root, ".env"),
    '# comment\nLITELLM_API_KEY=from-file\nNEATLOGS_API_KEY="project-key"\nNIGHTSHIFT_SPEND_APPROVED=\n',
  );
  loadEnvFile(join(root, ".env"), env);
  loadEnvFile(join(root, "missing.env"), env);
  assert.equal(env.LITELLM_API_KEY, "already-set");
  assert.equal(env.NEATLOGS_API_KEY, "project-key");
  assert.equal(env.NIGHTSHIFT_SPEND_APPROVED, "");
  const schema = toolParameters("resume_job");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ["job_id", "checkpoint_id", "operation_id", "generation"]);
  const clock = new ManualClock(new Date("2026-10-10T12:00:00.000Z"));
  const blocked = await modelRecover(root, clock, {
    LITELLM_API_KEY: "present-but-not-for-use",
    NIGHTSHIFT_SPEND_APPROVED: "",
  });
  assert.equal(blocked.outcome, "blocked");
  assert.equal(blocked.reason, "spend_not_approved");
  assert.equal(blocked.decision_source, "model");
  assert.equal(blocked.tools.length, 0);
  const database = openDatabase(join(root, "nightshift.sqlite"));
  try {
    assert.equal(requireJob(database, blocked.job_id).status, "stalled");
  } finally {
    database.close();
  }
});
