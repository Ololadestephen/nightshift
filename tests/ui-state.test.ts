import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { verificationState, recoveryStages } = await import(
  new URL("../public/ui.js", import.meta.url).href
);
const { RECORDED_RECOVERY } = await import(new URL("../public/landing.js", import.meta.url).href);

test("a written report cannot appear verified before its check passes", () => {
  const detail = { job: { status: "verifying" }, report: { available: true, verified: false } };
  assert.equal(verificationState(detail), "pending");
  const stages = recoveryStages(detail);
  assert.equal(stages[2].state, "pending");
  assert.equal(stages[1].label, "Report written");
});

test("a failed or contradictory verification takes precedence over completion flags", () => {
  for (const verification of [
    { ok: false, mismatches: [] },
    { ok: true, mismatches: ["report_body"] },
  ]) {
    const detail = {
      job: { status: "completed" },
      report: { available: true, verified: true },
      run: { verification },
    };
    assert.equal(verificationState(detail), "failed");
    assert.equal(recoveryStages(detail)[2].state, "failed");
  }
});

test("the recorded hero values match the real controlled Sonnet artifact", () => {
  const record = JSON.parse(
    readFileSync(new URL("../evidence/runs/failed-ack-live.json", import.meta.url), "utf8"),
  );
  const report = record.run.verification.report;
  assert.equal(RECORDED_RECOVERY.jobId, record.run.job_id);
  assert.equal(RECORDED_RECOVERY.rows, report.row_count);
  assert.equal(RECORDED_RECOVERY.minutes, report.total_minutes);
  assert.equal(RECORDED_RECOVERY.modelCalls, record.run.model_calls);
  const detail = {
    job: { status: record.run.job_status },
    run: record.run,
    report: { verified: true },
    checkpoints: record.run.trace
      .filter((event: { name: string }) => event.name === "read_checkpoint")
      .map((event: { output: unknown }) => event.output),
  };
  const stages = recoveryStages(detail);
  assert.equal(stages[1].state, "uncertain");
  assert.equal(stages[2].state, "complete");
});

test("an active worker without an action or report does not acquire a fake recovery", () => {
  const stages = recoveryStages({
    job: { status: "running" },
    worker: { lease_state: "active", step: "parsed" },
  });
  assert.equal(stages[1].label, "Worker active");
  assert.equal(stages[2].state, "pending");
});

test("the historical escalated run is not presented as waiting for another repair", () => {
  const before = JSON.parse(
    readFileSync(new URL("../evidence/runs/before.json", import.meta.url), "utf8"),
  );
  const stages = recoveryStages({
    job: { status: before.outcome },
    run: { trace: before.events },
  });
  assert.equal(stages[1].label, "Lease reclaimed");
  assert.equal(stages[1].state, "complete");
  assert.match(stages[1].note, /escalated/);
  assert.equal(stages[2].state, "pending");
});
