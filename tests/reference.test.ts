import assert from "node:assert/strict";
import test from "node:test";
import { createJob, runUntilPublished } from "../src/pipeline.js";
import { verifyArtifact } from "../src/verifier.js";
import { workspace } from "./helpers.js";

test("verification matches an independent minute sum", () => {
  const env = workspace();
  const rows = [
    { day: "2026-10-08", queue: "billing", status: "closed", minutes: 12 },
    { day: "2026-10-09", queue: "access", status: "open", minutes: 7 },
    { day: "2026-10-10", queue: "billing", status: "open", minutes: 5 },
  ];
  let total = 0;
  let billing = 0;
  let open = 0;
  for (const row of rows) {
    total += row.minutes;
    if (row.queue === "billing") {
      billing += row.minutes;
    }
    if (row.status === "open") {
      open += row.minutes;
    }
  }
  try {
    const created = createJob(env.database, rows, env.clock);
    assert.equal(created.generation, 1);
    runUntilPublished(env.database, created.jobId, created.generation, env.clock, env.artifacts);
    const result = verifyArtifact(env.database, created.jobId, env.clock, env.artifacts);
    assert.equal(result.ok, true);
    assert.ok(result.report);
    assert.equal(result.report.row_count, rows.length);
    assert.equal(result.report.total_minutes, total);
    assert.equal(result.report.by_queue.billing?.minutes, billing);
    assert.equal(result.report.by_status.open?.minutes, open);
    assert.equal(result.mismatches.length, 0);
  } finally {
    env.database.close();
  }
});
