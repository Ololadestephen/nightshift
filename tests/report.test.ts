import assert from "node:assert/strict";
import test from "node:test";
import { aggregate, canonicalJson, hashRows, validateRows } from "../src/report.js";
import { fixturePath } from "../src/demo.js";
import { loadFixture } from "../src/report.js";
import { redact } from "../src/redact.js";
import { neatlogsDelivery } from "../src/trace.js";

test("report aggregates the labelled fixture with exact minute counts", () => {
  const rows = loadFixture(fixturePath());
  const report = aggregate(rows, "job_reference", "2026-10-10.1");
  assert.equal(report.row_count, 5);
  assert.equal(report.total_minutes, 120);
  assert.deepEqual(report.by_queue.billing, { count: 3, minutes: 95 });
  assert.deepEqual(report.by_queue.access, { count: 2, minutes: 25 });
  assert.deepEqual(report.by_status.closed, { count: 4, minutes: 95 });
  assert.deepEqual(report.by_status.open, { count: 1, minutes: 25 });
  assert.equal(report.input_hash, hashRows(rows));
  assert.equal(canonicalJson(report), canonicalJson(JSON.parse(canonicalJson(report))));
});

test("dataset validation rejects malformed rows", () => {
  assert.throws(
    () => validateRows([{ day: "yesterday", queue: "billing", status: "open", minutes: 1 }]),
    {
      code: "invalid_input",
    },
  );
});

test("redaction removes secret-shaped values and neatlogs stays disabled without a key", () => {
  const redacted = redact({ api_key: "sk-supersecretvalue", note: "Bearer sk-supersecretvalue" });
  assert.equal(redacted.api_key, "[redacted]");
  assert.equal(redacted.note.includes("sk-supersecretvalue"), false);
  assert.equal(neatlogsDelivery({}), "disabled_missing_api_key");
});
