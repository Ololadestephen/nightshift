import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "./database-port.js";
import type { Clock } from "./clock.js";
import { advanceJob, createJob, runUntilPublished } from "./pipeline.js";
import { loadFixture } from "./report.js";
import { verifyArtifact } from "./verifier.js";
export type DemoScenario = "expired_lease" | "active_lease" | "completed";
export function fixturePath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../fixtures/weekly-events.json");
}
export async function seedScenario(
  database: Database,
  clock: Clock,
  artifactDir: string,
  scenario: DemoScenario,
): Promise<string> {
  const rows = loadFixture(fixturePath());
  const created = await createJob(database, rows, clock);
  if (created.generation === 0) {
    return created.jobId;
  }
  if (scenario === "completed") {
    await runUntilPublished(database, created.jobId, created.generation, clock, artifactDir);
    await verifyArtifact(database, created.jobId, clock, artifactDir);
    return created.jobId;
  }
  await advanceJob(database, created.jobId, created.generation, clock, artifactDir);
  if (scenario === "expired_lease") {
    await advanceJob(database, created.jobId, created.generation, clock, artifactDir, {
      stopAfter: "parsed",
      faultInjection: "controlled_demo",
      crashAfterArtifact: false,
    });
    return created.jobId;
  }
  await advanceJob(database, created.jobId, created.generation, clock, artifactDir);
  return created.jobId;
}
