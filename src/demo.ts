import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import type { Clock } from "./clock.js";
import { advanceJob, createJob, runUntilPublished } from "./pipeline.js";
import { loadFixture } from "./report.js";
import { verifyArtifact } from "./verifier.js";

export type DemoScenario = "expired_lease" | "active_lease" | "completed";

export function fixturePath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../fixtures/weekly-events.json");
}

export function seedScenario(
  database: DatabaseSync,
  clock: Clock,
  artifactDir: string,
  scenario: DemoScenario,
): string {
  const rows = loadFixture(fixturePath());
  const created = createJob(database, rows, clock);
  if (created.generation === 0) {
    return created.jobId;
  }
  if (scenario === "completed") {
    runUntilPublished(database, created.jobId, created.generation, clock, artifactDir);
    verifyArtifact(database, created.jobId, clock, artifactDir);
    return created.jobId;
  }
  advanceJob(database, created.jobId, created.generation, clock, artifactDir);
  if (scenario === "expired_lease") {
    advanceJob(database, created.jobId, created.generation, clock, artifactDir, {
      stopAfter: "parsed",
      faultInjection: "controlled_demo",
      crashAfterArtifact: false,
    });
    return created.jobId;
  }
  advanceJob(database, created.jobId, created.generation, clock, artifactDir);
  return created.jobId;
}
