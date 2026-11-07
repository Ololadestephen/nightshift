import { createHash, randomBytes } from "node:crypto";
import type { Clock } from "./clock.js";
import type { Database } from "./database-port.js";
import { NightshiftError } from "./errors.js";
import {
  aggregate,
  canonicalJson,
  hashRows,
  parseStoredJson,
  reportsMatch,
  sha256,
  validateRows,
  type ReportBody,
} from "./report.js";
import { getArtifact, getJob, listAttempts, listCheckpoints, type JobRecord } from "./store.js";
import { latestRun, type RunRecord } from "./app/records.js";

export const COMPLETION_SNAPSHOT_FORMAT = "nightshift-completion-snapshot/v1" as const;

export interface SanitizedRecoverySummary {
  format: "nightshift-recovery-summary/v1";
  pipeline_version: string;
  environment: "report" | "controlled_fault_injection";
  checkpoint_steps: string[];
  attempt_outcomes: { kind: string; outcome: string }[];
  decision_source: string;
  repaired: boolean;
  verified: true;
}

export interface CompletionSnapshot {
  format: typeof COMPLETION_SNAPSHOT_FORMAT;
  job_reference: string;
  job_reference_hash: string;
  input_hash: string;
  output_hash: string;
  recovery_summary_hash: string;
  report: Omit<ReportBody, "job_id">;
  recovery_summary: SanitizedRecoverySummary;
  created_at: string;
  disclaimer: string;
}

export interface ReceiptRecordInput {
  publisher: string;
  job_reference_hash: string;
  input_hash: string;
  output_hash: string;
  recovery_summary_hash: string;
  published_at?: number;
}

export interface SnapshotComparisonResult {
  valid: boolean;
  mismatches: string[];
  computed: {
    job_reference_hash: string;
    input_hash: string;
    output_hash: string;
    recovery_summary_hash: string;
  };
}

export interface BotChainConfig {
  chain_id: number;
  chain_hex: string;
  name: string;
  rpc_url: string;
  explorer_url: string;
  website_url: string;
  registry_address: string | null;
  native_currency: { name: "BOT"; symbol: "BOT"; decimals: 18 };
}

export const SELECTORS = {
  publishCompletionReceipt: "0xe73f0920",
  getReceipt: "0xfcecbb61",
  computeReceiptId: "0x312c8f75",
  completionReceiptPublishedEvent:
    "0x0dcb55bbf2bc22c1e47ac0f377505e57ccf82857823c1c402fcbae10d71d6513",
} as const;

const MAINNET_CHAIN_ID = 677;
const MAINNET_RPC_URL = "https://rpc.botchain.ai";
const TESTNET_RPC_URL = "https://rpc.bohr.life";
const MAINNET_EXPLORER_URL = "https://scan.botchain.ai";
const TESTNET_EXPLORER_URL = "https://scan.bohr.life";
const BOTCHAIN_WEBSITE_URL = "https://botchain.ai";

export function botChainConfigFromEnv(env: NodeJS.ProcessEnv): BotChainConfig {
  const parsed = Number.parseInt(String(env.BOTCHAIN_CHAIN_ID ?? MAINNET_CHAIN_ID), 10);
  const chainId = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : MAINNET_CHAIN_ID;
  const mainnet = chainId === MAINNET_CHAIN_ID;
  const rawAddr = (env.NIGHTSHIFT_RECEIPT_REGISTRY_ADDRESS ?? "").trim();
  return {
    chain_id: chainId,
    chain_hex: `0x${chainId.toString(16)}`,
    name: readEnv(env.BOTCHAIN_NETWORK_NAME, mainnet ? "BOT Chain Mainnet" : "BOT Chain Testnet"),
    rpc_url: readEnv(env.BOTCHAIN_RPC_URL, mainnet ? MAINNET_RPC_URL : TESTNET_RPC_URL),
    explorer_url: readEnv(
      env.BOTCHAIN_EXPLORER_URL,
      mainnet ? MAINNET_EXPLORER_URL : TESTNET_EXPLORER_URL,
    ).replace(/\/$/, ""),
    website_url: BOTCHAIN_WEBSITE_URL,
    registry_address: /^0x[0-9a-fA-F]{40}$/.test(rawAddr) ? rawAddr : null,
    native_currency: { name: "BOT", symbol: "BOT", decimals: 18 },
  };
}

function readEnv(raw: string | undefined, fallback: string): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function normalizeAddress(address: string): string {
  const trimmed = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(trimmed) || /^0x0{40}$/.test(trimmed)) {
    throw new NightshiftError("invalid_address", "Expected a non-zero 20-byte EVM address.");
  }
  return trimmed;
}

export function bytes32Sha256(value: string): string {
  return `0x${sha256(value)}`;
}

export function normalizeBytes32(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-f]{64}$/.test(hex) || /^0{64}$/.test(hex)) {
    throw new NightshiftError("invalid_hash", "Expected a non-zero 32-byte hex fingerprint.");
  }
  return `0x${hex}`;
}

export function encodePublishCalldata(input: {
  job_reference_hash: string;
  input_hash: string;
  output_hash: string;
  recovery_summary_hash: string;
}): string {
  const words = [
    normalizeBytes32(input.job_reference_hash).slice(2),
    normalizeBytes32(input.input_hash).slice(2),
    normalizeBytes32(input.output_hash).slice(2),
    normalizeBytes32(input.recovery_summary_hash).slice(2),
  ];
  return `${SELECTORS.publishCompletionReceipt}${words.join("")}`;
}

export function encodeGetReceiptCalldata(receiptId: string): string {
  return `${SELECTORS.getReceipt}${normalizeBytes32(receiptId).slice(2)}`;
}

export function encodeComputeReceiptIdCalldata(input: {
  publisher: string;
  job_reference_hash: string;
  input_hash: string;
  output_hash: string;
  recovery_summary_hash: string;
}): string {
  const pubHex = normalizeAddress(input.publisher).slice(2).padStart(64, "0");
  const words = [
    pubHex,
    normalizeBytes32(input.job_reference_hash).slice(2),
    normalizeBytes32(input.input_hash).slice(2),
    normalizeBytes32(input.output_hash).slice(2),
    normalizeBytes32(input.recovery_summary_hash).slice(2),
  ];
  return `${SELECTORS.computeReceiptId}${words.join("")}`;
}

export function decodeReceiptResponse(hexData: string): {
  publisher: string;
  job_reference_hash: string;
  input_hash: string;
  output_hash: string;
  recovery_summary_hash: string;
  published_at: number;
} {
  const clean = hexData.trim().toLowerCase().replace(/^0x/, "");
  if (clean.length < 64 * 6 || !/^[0-9a-f]+$/.test(clean)) {
    throw new NightshiftError("receipt_not_found", "Receipt record was not found on-chain.");
  }
  const word = (index: number): string => clean.slice(index * 64, (index + 1) * 64);
  const publisher = `0x${word(0).slice(24)}`;
  const publishedAt = Number(BigInt(`0x${word(5)}`));
  if (publishedAt === 0 || /^0x0{40}$/.test(publisher)) {
    throw new NightshiftError("receipt_not_found", "Receipt record was not found on-chain.");
  }
  return {
    publisher,
    job_reference_hash: `0x${word(1)}`,
    input_hash: `0x${word(2)}`,
    output_hash: `0x${word(3)}`,
    recovery_summary_hash: `0x${word(4)}`,
    published_at: publishedAt,
  };
}

export function computePublicReportBody(report: ReportBody): Omit<ReportBody, "job_id"> {
  return {
    pipeline_version: report.pipeline_version,
    input_hash: report.input_hash,
    row_count: report.row_count,
    total_minutes: report.total_minutes,
    by_queue: report.by_queue,
    by_status: report.by_status,
  };
}

export function computeSnapshotHashes(snapshot: {
  job_reference: string;
  report: Omit<ReportBody, "job_id">;
  recovery_summary: SanitizedRecoverySummary;
}): SnapshotComparisonResult["computed"] {
  return {
    job_reference_hash: bytes32Sha256(`nightshift-job-ref/v1:${snapshot.job_reference}`),
    input_hash: normalizeBytes32(snapshot.report.input_hash),
    output_hash: bytes32Sha256(canonicalJson(snapshot.report)),
    recovery_summary_hash: bytes32Sha256(canonicalJson(snapshot.recovery_summary)),
  };
}

export async function buildCompletionSnapshot(
  database: Database,
  jobId: string,
  sessionId: string,
  clock: Clock,
): Promise<CompletionSnapshot> {
  const job = await requireAuthorizedCompletedJob(database, jobId, sessionId);
  const expected = await reconcileCompletedArtifact(database, job);
  const run = await latestRun(database, jobId);
  assertLatestRunVerified(run);

  const jobReference = await ensureJobReference(database, job);
  const checkpoints = await listCheckpoints(database, jobId);
  const attempts = await listAttempts(database, jobId);
  const repaired = attempts.some(
    (a) =>
      (a.kind === "reclaim_lease" && a.outcome === "reclaimed") ||
      (a.kind === "resume_job" && a.outcome === "applied"),
  );
  const summary: SanitizedRecoverySummary = {
    format: "nightshift-recovery-summary/v1",
    pipeline_version: job.pipeline_version,
    environment: job.auto_finish === 0 ? "controlled_fault_injection" : "report",
    checkpoint_steps: checkpoints.map((item) => item.step),
    attempt_outcomes: attempts.map((item) => ({ kind: item.kind, outcome: item.outcome })),
    decision_source: run?.decision_source ?? "worker",
    repaired,
    verified: true,
  };
  const publicReport = computePublicReportBody(expected);
  const hashes = computeSnapshotHashes({
    job_reference: jobReference,
    report: publicReport,
    recovery_summary: summary,
  });
  return {
    format: COMPLETION_SNAPSHOT_FORMAT,
    job_reference: jobReference,
    ...hashes,
    report: publicReport,
    recovery_summary: summary,
    created_at: clock.now().toISOString(),
    disclaimer:
      "A blockchain completion receipt attests publication and fingerprint integrity; it does not independently execute or prove the recovery computation.",
  };
}

async function requireAuthorizedCompletedJob(
  database: Database,
  jobId: string,
  sessionId: string,
): Promise<JobRecord> {
  const job = await getJob(database, jobId);
  if (!job || job.owner_session_id !== sessionId) {
    throw new NightshiftError("not_found", "That report job was not found.");
  }
  if (job.status !== "completed") {
    throw new NightshiftError("job_not_completed", "Only verified completed reports can export.");
  }
  return job;
}

async function reconcileCompletedArtifact(database: Database, job: JobRecord): Promise<ReportBody> {
  const rows = validateRows(parseStoredJson(job.input_json));
  if (hashRows(rows) !== job.input_hash) {
    throw new NightshiftError("verification_failed", "The stored input fingerprint failed.");
  }
  const artifact = await getArtifact(database, job.id);
  const validArtifact =
    artifact &&
    artifact.job_id === job.id &&
    artifact.pipeline_version === job.pipeline_version &&
    artifact.input_hash === job.input_hash &&
    sha256(artifact.body_json) === artifact.content_hash;
  if (!validArtifact) {
    throw new NightshiftError("verification_failed", "The stored report artifact failed check.");
  }
  const expected = aggregate(rows, job.id, job.pipeline_version);
  const parsed = parseStoredJson(artifact.body_json);
  const actual = parsed && typeof parsed === "object" ? (parsed as ReportBody) : null;
  if (!actual || !reportsMatch(actual, expected)) {
    throw new NightshiftError("verification_failed", "The report body does not reconcile.");
  }
  return expected;
}

function assertLatestRunVerified(run: RunRecord | null): void {
  if (!run?.verification_json) return;
  const parsed = parseStoredJson(run.verification_json) as {
    ok?: boolean;
    mismatches?: unknown[];
  } | null;
  const hasMismatches = Array.isArray(parsed?.mismatches) && parsed.mismatches.length > 0;
  if (parsed?.ok === false || hasMismatches) {
    throw new NightshiftError("verification_failed", "The latest verification check failed.");
  }
}

export function compareSnapshotToReceipt(
  exportedSnapshot: unknown,
  receipt: ReceiptRecordInput,
): SnapshotComparisonResult {
  const snapshot = parseSnapshotExport(exportedSnapshot);
  const computed = computeSnapshotHashes({
    job_reference: snapshot.job_reference,
    report: snapshot.report,
    recovery_summary: snapshot.recovery_summary,
  });
  const mismatches = collectMismatches(snapshot, computed, receipt);
  return { valid: mismatches.length === 0, mismatches, computed };
}

function collectMismatches(
  snap: CompletionSnapshot,
  comp: SnapshotComparisonResult["computed"],
  rcpt: ReceiptRecordInput,
): string[] {
  const pairs: [string, string, string][] = [
    ["snapshot_job_reference_hash", snap.job_reference_hash, comp.job_reference_hash],
    ["snapshot_input_hash", snap.input_hash, comp.input_hash],
    ["snapshot_output_hash", snap.output_hash, comp.output_hash],
    ["snapshot_recovery_summary_hash", snap.recovery_summary_hash, comp.recovery_summary_hash],
    ["job_reference_hash", comp.job_reference_hash, normalizeBytes32(rcpt.job_reference_hash)],
    ["input_hash", comp.input_hash, normalizeBytes32(rcpt.input_hash)],
    ["output_hash", comp.output_hash, normalizeBytes32(rcpt.output_hash)],
    [
      "recovery_summary_hash",
      comp.recovery_summary_hash,
      normalizeBytes32(rcpt.recovery_summary_hash),
    ],
  ];
  return pairs.filter(([, a, b]) => a.toLowerCase() !== b.toLowerCase()).map(([label]) => label);
}

function parseSnapshotExport(value: unknown): CompletionSnapshot {
  const record = requireObject(value, "Completion export must be a JSON object.");
  if (record.format !== COMPLETION_SNAPSHOT_FORMAT) {
    throw new NightshiftError("invalid_snapshot", "Unsupported snapshot format.");
  }
  const jobRef = textField(record, "job_reference");
  if (!/^nsref_v1_[0-9a-f]{32}$/.test(jobRef)) {
    throw new NightshiftError("invalid_snapshot", "Snapshot job_reference is malformed.");
  }
  const rpt = requireObject(record.report, "Snapshot report summary is missing.");
  const sum = requireObject(record.recovery_summary, "Snapshot recovery_summary is missing.");
  const queue = requireObject(rpt.by_queue, "Snapshot by_queue is missing.");
  const status = requireObject(rpt.by_status, "Snapshot by_status is missing.");
  return {
    format: COMPLETION_SNAPSHOT_FORMAT,
    job_reference: jobRef,
    job_reference_hash: normalizeBytes32(textField(record, "job_reference_hash")),
    input_hash: normalizeBytes32(textField(record, "input_hash")),
    output_hash: normalizeBytes32(textField(record, "output_hash")),
    recovery_summary_hash: normalizeBytes32(textField(record, "recovery_summary_hash")),
    report: {
      pipeline_version: textField(rpt, "pipeline_version"),
      input_hash: textField(rpt, "input_hash"),
      row_count: Number(rpt.row_count),
      total_minutes: Number(rpt.total_minutes),
      by_queue: queue as ReportBody["by_queue"],
      by_status: status as ReportBody["by_status"],
    },
    recovery_summary: parseRecoverySummary(sum),
    created_at: textField(record, "created_at"),
    disclaimer: textField(record, "disclaimer"),
  };
}

function parseRecoverySummary(sum: Record<string, unknown>): SanitizedRecoverySummary {
  if (sum.format !== "nightshift-recovery-summary/v1" || sum.verified !== true) {
    throw new NightshiftError("invalid_snapshot", "Snapshot recovery_summary header is invalid.");
  }
  const env =
    sum.environment === "controlled_fault_injection" ? "controlled_fault_injection" : "report";
  const rawSteps = Array.isArray(sum.checkpoint_steps) ? sum.checkpoint_steps : [];
  const rawOutcomes = Array.isArray(sum.attempt_outcomes) ? sum.attempt_outcomes : [];
  return {
    format: "nightshift-recovery-summary/v1",
    pipeline_version: textField(sum, "pipeline_version"),
    environment: env,
    checkpoint_steps: rawSteps.map((s) => String(s)),
    attempt_outcomes: rawOutcomes.map((item) => {
      const entry = requireObject(item, "Snapshot attempt outcome must be an object.");
      return { kind: textField(entry, "kind"), outcome: textField(entry, "outcome") };
    }),
    decision_source: textField(sum, "decision_source"),
    repaired: Boolean(sum.repaired),
    verified: true,
  };
}

function textField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function requireObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NightshiftError("invalid_snapshot", message);
  }
  return value as Record<string, unknown>;
}

async function ensureJobReference(database: Database, job: JobRecord): Promise<string> {
  const opId = `jobref_${job.id}`;
  const existing = await readStoredJobReference(database, opId);
  if (existing) return existing;
  const entropy = randomBytes(16).toString("hex");
  const digest = createHash("sha256")
    .update(`${job.id}:${job.input_hash}:${job.created_at}:${entropy}`)
    .digest("hex")
    .slice(0, 32);
  const reference = `nsref_v1_${digest}`;
  const sql = `INSERT OR IGNORE INTO operations (
    operation_id, job_id, action, observed_generation, status, result_json, created_at, updated_at
  ) VALUES (?, ?, 'job_reference', NULL, 'succeeded', ?, ?, ?)`;
  const payload = canonicalJson({ job_reference: reference });
  await database.prepare(sql).run(opId, job.id, payload, job.created_at, job.updated_at);
  return (await readStoredJobReference(database, opId)) ?? reference;
}

async function readStoredJobReference(database: Database, opId: string): Promise<string | null> {
  const row = await database
    .prepare("SELECT result_json FROM operations WHERE operation_id = ?")
    .get(opId);
  if (!row || typeof row.result_json !== "string") return null;
  const parsed = parseStoredJson(row.result_json) as { job_reference?: string } | null;
  const candidate = parsed?.job_reference ?? "";
  return /^nsref_v1_[0-9a-f]{32}$/.test(candidate) ? candidate : null;
}
