import assert from "node:assert/strict";
import test from "node:test";
import { assignJob } from "../src/app/records.js";
import { seedScenario } from "../src/demo.js";
import { isNightshiftError } from "../src/errors.js";
import { createJob, runUntilPublished } from "../src/pipeline.js";
import { loadFixture } from "../src/report.js";
import { fixturePath } from "../src/demo.js";
import {
  botChainConfigFromEnv,
  buildCompletionSnapshot,
  compareSnapshotToReceipt,
  COMPLETION_SNAPSHOT_FORMAT,
  decodeReceiptResponse,
  encodeComputeReceiptIdCalldata,
  encodeGetReceiptCalldata,
  encodePublishCalldata,
  normalizeAddress,
  normalizeBytes32,
  SELECTORS,
} from "../src/snapshot.js";
import { getLease, requireJob } from "../src/store.js";
import { workspace } from "./helpers.js";

const {
  compareExportWithReceipt,
  decodeReceiptResponse: uiDecodeReceiptResponse,
  encodePublishCalldata: uiEncodePublishCalldata,
} = await import(new URL("../public/receipt.js", import.meta.url).href);

test("completed job produces a stable sanitized snapshot only for its owning session", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "completed");
  await assignJob(env.database, jobId, "ses_owner", 1);

  await assert.rejects(
    async () => await buildCompletionSnapshot(env.database, jobId, "ses_intruder", env.clock),
    (error: unknown) => isNightshiftError(error) && error.code === "not_found",
  );

  const first = await buildCompletionSnapshot(env.database, jobId, "ses_owner", env.clock);
  const second = await buildCompletionSnapshot(env.database, jobId, "ses_owner", env.clock);

  assert.equal(first.format, COMPLETION_SNAPSHOT_FORMAT);
  assert.match(first.job_reference, /^nsref_v1_[0-9a-f]{32}$/);
  assert.equal(first.job_reference, second.job_reference);
  assert.equal(first.job_reference_hash, second.job_reference_hash);
  assert.equal(first.input_hash, second.input_hash);
  assert.equal(first.output_hash, second.output_hash);
  assert.equal(first.recovery_summary_hash, second.recovery_summary_hash);
  assert.equal("job_id" in first.report, false);
  assert.equal(first.report.total_minutes, 120);
  assert.equal(first.recovery_summary.verified, true);

  const comparison = compareSnapshotToReceipt(first, {
    publisher: "0x1111111111111111111111111111111111111111",
    job_reference_hash: first.job_reference_hash,
    input_hash: first.input_hash,
    output_hash: first.output_hash,
    recovery_summary_hash: first.recovery_summary_hash,
  });
  assert.equal(comparison.valid, true);
  assert.deepEqual(comparison.mismatches, []);

  const uiComparison = await compareExportWithReceipt(first, {
    job_reference_hash: first.job_reference_hash,
    input_hash: first.input_hash,
    output_hash: first.output_hash,
    recovery_summary_hash: first.recovery_summary_hash,
  });
  assert.equal(uiComparison.valid, true);
});

test("incomplete, active-lease, escalated, and tampered jobs cannot produce a completion snapshot", async () => {
  const env = workspace();

  // Active lease job: must not be reclaimed or mutated by snapshot builder
  const activeId = await seedScenario(env.database, env.clock, env.artifacts, "active_lease");
  await assignJob(env.database, activeId, "ses_owner", 0);
  const leaseBefore = await getLease(env.database, activeId);
  await assert.rejects(
    async () => await buildCompletionSnapshot(env.database, activeId, "ses_owner", env.clock),
    (error: unknown) => isNightshiftError(error) && error.code === "job_not_completed",
  );
  const leaseAfter = await getLease(env.database, activeId);
  assert.equal(leaseAfter?.generation, leaseBefore?.generation);
  assert.equal((await requireJob(env.database, activeId)).status, "running");

  // Verifying (unverified) job
  const rows = loadFixture(fixturePath());
  const created = await createJob(env.database, rows, env.clock, "ses_owner");
  await runUntilPublished(
    env.database,
    created.jobId,
    created.generation,
    env.clock,
    env.artifacts,
  );
  assert.equal((await requireJob(env.database, created.jobId)).status, "verifying");
  await assert.rejects(
    async () => await buildCompletionSnapshot(env.database, created.jobId, "ses_owner", env.clock),
    (error: unknown) => isNightshiftError(error) && error.code === "job_not_completed",
  );

  // Completed job with corrupted artifact fails reconciliation
  const completedId = await seedScenario(env.database, env.clock, env.artifacts, "completed");
  await assignJob(env.database, completedId, "ses_owner", 1);
  await env.database
    .prepare("UPDATE artifacts SET body_json = ? WHERE job_id = ?")
    .run('{"tampered":true}', completedId);
  await assert.rejects(
    async () => await buildCompletionSnapshot(env.database, completedId, "ses_owner", env.clock),
    (error: unknown) => isNightshiftError(error) && error.code === "verification_failed",
  );
});

test("modified completion exports fail receipt comparison", async () => {
  const env = workspace();
  const jobId = await seedScenario(env.database, env.clock, env.artifacts, "completed");
  await assignJob(env.database, jobId, "ses_owner", 1);
  const snapshot = await buildCompletionSnapshot(env.database, jobId, "ses_owner", env.clock);
  const receipt = {
    publisher: "0x1111111111111111111111111111111111111111",
    job_reference_hash: snapshot.job_reference_hash,
    input_hash: snapshot.input_hash,
    output_hash: snapshot.output_hash,
    recovery_summary_hash: snapshot.recovery_summary_hash,
  };

  const tamperedOutput = {
    ...snapshot,
    report: { ...snapshot.report, total_minutes: snapshot.report.total_minutes + 1 },
  };
  const outRes = compareSnapshotToReceipt(tamperedOutput, receipt);
  assert.equal(outRes.valid, false);
  assert.ok(outRes.mismatches.includes("output_hash"));

  const uiOutRes = await compareExportWithReceipt(tamperedOutput, receipt);
  assert.equal(uiOutRes.valid, false);
  assert.ok(uiOutRes.mismatches.includes("output_hash"));

  const tamperedSummary = {
    ...snapshot,
    recovery_summary: {
      ...snapshot.recovery_summary,
      repaired: !snapshot.recovery_summary.repaired,
    },
  };
  const sumRes = compareSnapshotToReceipt(tamperedSummary, receipt);
  assert.equal(sumRes.valid, false);
  assert.ok(sumRes.mismatches.includes("recovery_summary_hash"));

  const tamperedRef = {
    ...snapshot,
    job_reference: "nsref_v1_ffffffffffffffffffffffffffffffff",
  };
  const refRes = compareSnapshotToReceipt(tamperedRef, receipt);
  assert.equal(refRes.valid, false);
  assert.ok(refRes.mismatches.includes("job_reference_hash"));
});

test("BOT Chain config and ABI calldata helpers validate inputs and decode receipts", () => {
  const mainnet = botChainConfigFromEnv({});
  assert.equal(mainnet.chain_id, 677);
  assert.equal(mainnet.chain_hex, "0x2a5");
  assert.match(mainnet.rpc_url, /botchain\.ai$/);
  assert.match(mainnet.explorer_url, /scan\.botchain\.ai$/);
  assert.equal(mainnet.registry_address, null);

  const configured = botChainConfigFromEnv({
    BOTCHAIN_CHAIN_ID: "968",
    NIGHTSHIFT_RECEIPT_REGISTRY_ADDRESS: "0x3C250cBf439431D7dd8525Ca9800c577a9533e3C",
  });
  assert.equal(configured.chain_id, 968);
  assert.equal(configured.chain_hex, "0x3c8");
  assert.match(configured.rpc_url, /bohr\.life$/);
  assert.equal(configured.registry_address, "0x3C250cBf439431D7dd8525Ca9800c577a9533e3C");

  const h1 = `0x${"11".repeat(32)}`;
  const h2 = `0x${"22".repeat(32)}`;
  const h3 = `0x${"33".repeat(32)}`;
  const h4 = `0x${"44".repeat(32)}`;
  const calldata = encodePublishCalldata({
    job_reference_hash: h1,
    input_hash: h2,
    output_hash: h3,
    recovery_summary_hash: h4,
  });
  assert.ok(calldata.startsWith(SELECTORS.publishCompletionReceipt));
  assert.equal(calldata.length, 10 + 64 * 4);
  assert.equal(
    uiEncodePublishCalldata({
      job_reference_hash: h1,
      input_hash: h2,
      output_hash: h3,
      recovery_summary_hash: h4,
    }),
    calldata,
  );

  const getCalldata = encodeGetReceiptCalldata(h1);
  assert.equal(getCalldata, `${SELECTORS.getReceipt}${"11".repeat(32)}`);

  const computeCalldata = encodeComputeReceiptIdCalldata({
    publisher: "0x1111111111111111111111111111111111111111",
    job_reference_hash: h1,
    input_hash: h2,
    output_hash: h3,
    recovery_summary_hash: h4,
  });
  assert.ok(computeCalldata.startsWith(SELECTORS.computeReceiptId));

  const rawResponse = [
    "0000000000000000000000001111111111111111111111111111111111111111",
    "11".repeat(32),
    "22".repeat(32),
    "33".repeat(32),
    "44".repeat(32),
    (1730818800).toString(16).padStart(64, "0"),
  ].join("");
  const decoded = decodeReceiptResponse(`0x${rawResponse}`);
  assert.equal(decoded.publisher, "0x1111111111111111111111111111111111111111");
  assert.equal(decoded.job_reference_hash, h1);
  assert.equal(decoded.published_at, 1730818800);
  assert.deepEqual(uiDecodeReceiptResponse(`0x${rawResponse}`), decoded);

  assert.throws(() => normalizeBytes32("0x1234"));
  assert.throws(() => normalizeAddress("0x0000000000000000000000000000000000000000"));
});
