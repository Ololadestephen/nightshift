import assert from "node:assert/strict";
import test from "node:test";
import { escalate, executeTool } from "../src/actions.js";
import { emptyMemory } from "../src/controller.js";
import { seedScenario } from "../src/demo.js";
import { requireJob } from "../src/store.js";
import { workspace } from "./helpers.js";

test("inspection and escalation tools record observations without changing a completed job", () => {
  const env = workspace();
  const jobId = seedScenario(env.database, env.clock, env.artifacts, "completed");
  const input = {
    database: env.database,
    clock: env.clock,
    artifactDir: env.artifacts,
    jobId,
  };
  const inspected = executeTool(input, { tool: "inspect_job", arguments: {} }, emptyMemory());
  assert.equal((inspected as { id: string }).id, jobId);
  assert.equal((inspected as { status: string }).status, "completed");
  const escalated = escalate(input, "operator_review", "obs_direct");
  assert.equal(escalated.job_status, "completed");
  assert.equal(requireJob(env.database, jobId).status, "completed");
  assert.equal(escalated.observation_id, "obs_direct");
});
