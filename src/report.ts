import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NightshiftError } from "./errors.js";

export interface EventRow {
  day: string;
  queue: string;
  status: string;
  minutes: number;
}

export interface CountMinutes {
  count: number;
  minutes: number;
}

export interface ReportBody {
  job_id: string;
  pipeline_version: string;
  input_hash: string;
  row_count: number;
  total_minutes: number;
  by_queue: Record<string, CountMinutes>;
  by_status: Record<string, CountMinutes>;
}

const QUEUES = new Set(["billing", "access"]);
const STATUSES = new Set(["open", "closed"]);

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashRows(rows: EventRow[]): string {
  return sha256(canonicalJson(rows));
}

export function parseStoredJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new NightshiftError("corrupt_json", "Stored JSON could not be parsed.");
  }
}

export function loadFixture(filePath: string): EventRow[] {
  const parsed = parseStoredJson(readFileSync(filePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || !("rows" in parsed)) {
    throw new NightshiftError("invalid_input", "Fixture is missing rows.");
  }
  return validateRows((parsed as { rows: unknown }).rows);
}

export function validateRows(value: unknown): EventRow[] {
  if (!Array.isArray(value)) {
    throw new NightshiftError("invalid_input", "Dataset rows must be an array.");
  }
  return value.map((row, index) => validateRow(row, index));
}

export function aggregate(rows: EventRow[], jobId: string, pipelineVersion: string): ReportBody {
  const byQueue: Record<string, CountMinutes> = {};
  const byStatus: Record<string, CountMinutes> = {};
  let totalMinutes = 0;
  for (const row of rows) {
    totalMinutes += row.minutes;
    addCount(byQueue, row.queue, row.minutes);
    addCount(byStatus, row.status, row.minutes);
  }
  return {
    job_id: jobId,
    pipeline_version: pipelineVersion,
    input_hash: hashRows(rows),
    row_count: rows.length,
    total_minutes: totalMinutes,
    by_queue: byQueue,
    by_status: byStatus,
  };
}

export function reportsMatch(actual: ReportBody, expected: ReportBody): boolean {
  return canonicalJson(actual) === canonicalJson(expected);
}

function validateRow(value: unknown, index: number): EventRow {
  if (!value || typeof value !== "object") {
    throw new NightshiftError("invalid_input", `Row ${index} is not an object.`);
  }
  const row = value as Record<string, unknown>;
  if (typeof row.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)) {
    throw new NightshiftError("invalid_input", `Row ${index} has an invalid day.`);
  }
  if (typeof row.queue !== "string" || !QUEUES.has(row.queue)) {
    throw new NightshiftError("invalid_input", `Row ${index} has an unsupported queue.`);
  }
  if (typeof row.status !== "string" || !STATUSES.has(row.status)) {
    throw new NightshiftError("invalid_input", `Row ${index} has an unsupported status.`);
  }
  if (typeof row.minutes !== "number" || !Number.isInteger(row.minutes) || row.minutes < 0) {
    throw new NightshiftError(
      "invalid_input",
      `Row ${index} minutes must be a non-negative integer.`,
    );
  }
  return {
    day: row.day,
    queue: row.queue,
    status: row.status,
    minutes: row.minutes,
  };
}

function addCount(target: Record<string, CountMinutes>, key: string, minutes: number): void {
  const current = target[key] ?? { count: 0, minutes: 0 };
  target[key] = { count: current.count + 1, minutes: current.minutes + minutes };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
  }
  return value;
}
