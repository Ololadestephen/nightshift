import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ManualClock } from "../src/clock.js";
import { emptyMemory, remember } from "../src/controller.js";
import { failureDemo } from "../src/failure-demo.js";
import { toolsForTurn } from "../src/model.js";
import { parseDecision } from "../src/policy.js";

test("a lost resume acknowledgement is reconciled without a second mutation", async () => {
  const root = mkdtempSync(join(tmpdir(), "nightshift-failure-"));
  const report = await failureDemo(root, new ManualClock(new Date("2026-10-12T00:00:00Z")), {});
  assert.equal(report.run.decision_source, "deterministic_controller");
  assert.equal(report.run.model_calls, 0);
  assert.equal(report.run.outcome, "completed");
  assert.equal(report.run.verification?.report?.total_minutes, 120);
  assert.deepEqual(report.run.tools, [
    "inspect_job",
    "inspect_worker",
    "read_checkpoint",
    "read_recent_errors",
    "reclaim_expired_lease",
    "resume_job",
    "read_checkpoint",
    "verify_artifact",
  ]);
  const failed = report.run.trace.find((event) => event.name === "resume_job");
  assert.deepEqual(failed?.output, { type: "uncertain", code: "injected_crash" });
  assert.equal(report.artifact_count, 1);
  assert.equal(report.operations.length, 1);
  assert.equal(report.operations[0]?.status, "started");
  assert.equal(report.operations[0]?.observed_generation, 2);
  const saved = JSON.parse(readFileSync(report.local_report, "utf8"));
  assert.equal(saved.run.outcome, "completed");
  assert.equal(saved.artifact_count, 1);
});

test("the model catalog asks for evidence after uncertainty, then offers verification", () => {
  const memory = emptyMemory();
  remember(memory, "inspect_job", { id: "job_1", status: "recovering" });
  remember(memory, "inspect_worker", { generation: 2, lease_state: "active" });
  memory.errorsRead = true;
  memory.reclaimedGeneration = 2;
  remember(memory, "read_checkpoint", { id: "parsed", step: "parsed", generation: 2 });
  remember(memory, "resume_job", { type: "uncertain", code: "injected_crash" });
  assert.deepEqual(memory.lastResume, { type: "uncertain", code: "injected_crash" });
  assert.deepEqual(toolsForTurn(memory), ["read_checkpoint"]);
  remember(memory, "read_checkpoint", {
    id: "published",
    step: "artifact_written",
    generation: 2,
  });
  assert.deepEqual(toolsForTurn(memory), ["verify_artifact"]);
});

test("fault injection cannot be requested through model tool arguments", () => {
  const result = parseDecision({
    tool: "resume_job",
    arguments: {
      job_id: "job_1",
      checkpoint_id: "checkpoint_1",
      operation_id: "resume_12345",
      generation: 2,
      controlledFault: "resume_ack_lost",
    },
    rationale: "Try to expand the tool's scope.",
  });
  assert.equal(result.ok, false);
});

test("the live failure demo refuses a missing budget before any model call", async () => {
  const root = mkdtempSync(join(tmpdir(), "nightshift-no-budget-"));
  await assert.rejects(
    failureDemo(root, new ManualClock(new Date("2026-10-12T00:00:00Z")), {}, true),
    /existing approved budget/,
  );
});
