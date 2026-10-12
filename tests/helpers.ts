import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "../src/database-port.js";
import { ManualClock } from "../src/clock.js";
import { openDatabase } from "../src/db.js";
export function workspace(): {
  dir: string;
  artifacts: string;
  database: Database;
  clock: ManualClock;
} {
  const dir = mkdtempSync(join(tmpdir(), "nightshift-"));
  const artifacts = join(dir, "artifacts");
  mkdirSync(artifacts);
  return {
    dir,
    artifacts,
    database: openDatabase(join(dir, "nightshift.sqlite")),
    clock: new ManualClock(new Date("2026-10-10T12:00:00.000Z")),
  };
}
