import { NightshiftError } from "../errors.js";
import { validateRows, type EventRow } from "../report.js";

export const MAX_DATASET_ROWS = 100;
export const MAX_ROW_MINUTES = 100_000;
export const MAX_BODY_BYTES = 65_536;
export const MAX_JOBS_PER_SESSION = 8;
export const MAX_CONCURRENT_RUNS = 1;
export const MAX_SESSIONS = 200;
export const MAX_SESSIONS_PER_HOUR = 30;
export const SESSION_WINDOW_MS = 60 * 60 * 1000;

export function parseDataset(body: unknown): EventRow[] {
  const rows = rowsFrom(body);
  if (rows.length < 1) {
    throw new NightshiftError("invalid_input", "Add at least one row.");
  }
  if (rows.length > MAX_DATASET_ROWS) {
    throw new NightshiftError(
      "invalid_input",
      `A report can include at most ${MAX_DATASET_ROWS} rows.`,
    );
  }
  const validated = validateRows(rows);
  for (const [index, row] of validated.entries()) {
    if (row.minutes > MAX_ROW_MINUTES) {
      throw new NightshiftError("invalid_input", `Row ${index} minutes are too large.`);
    }
  }
  return validated;
}

function rowsFrom(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && typeof body === "object" && "rows" in body) {
    const rows = (body as { rows: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows;
    }
  }
  throw new NightshiftError("invalid_input", "Submit a JSON object with a rows array.");
}
