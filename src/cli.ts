import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DeterministicController, runAgent, type AgentRun } from "./agent.js";
import { systemClock, type Clock } from "./clock.js";
import { openDatabase } from "./db.js";
import { seedScenario, type DemoScenario } from "./demo.js";
import { LiteLlmModel, modelConfigFromEnv } from "./model.js";
import { DEFAULT_LIMITS } from "./policy.js";

const command = process.argv[2];
const root = join(process.cwd(), "data", "local");
const databasePath = join(root, "nightshift.sqlite");
const artifactDir = join(root, "artifacts");
const journalDir = join(root, "traces");

export async function demoRecover(
  runtimeRoot: string,
  clock: Clock,
  env: NodeJS.ProcessEnv,
): Promise<AgentRun> {
  const demoArtifacts = join(runtimeRoot, "artifacts");
  const demoJournal = join(runtimeRoot, "traces");
  mkdirSync(demoArtifacts, { recursive: true });
  const database = openDatabase(join(runtimeRoot, "nightshift.sqlite"));
  try {
    const jobId = seedScenario(database, clock, demoArtifacts, "expired_lease");
    return await runAgent({
      database,
      clock,
      artifactDir: demoArtifacts,
      jobId,
      model: new DeterministicController(),
      limits: DEFAULT_LIMITS,
      journalDir: demoJournal,
      env,
    });
  } finally {
    database.close();
  }
}

export function loadEnvFile(filePath: string, env: NodeJS.ProcessEnv): void {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return;
    }
    throw error;
  }
  for (const rawLine of text.split("\n")) {
    const parsed = parseAssignment(rawLine);
    if (parsed && env[parsed.key] === undefined) {
      env[parsed.key] = parsed.value;
    }
  }
}

export async function modelRecover(
  runtimeRoot: string,
  clock: Clock,
  env: NodeJS.ProcessEnv,
): Promise<AgentRun> {
  const demoArtifacts = join(runtimeRoot, "artifacts");
  const demoJournal = join(runtimeRoot, "traces");
  mkdirSync(demoArtifacts, { recursive: true });
  const database = openDatabase(join(runtimeRoot, "nightshift.sqlite"));
  try {
    const jobId = seedScenario(database, clock, demoArtifacts, "expired_lease");
    return await runAgent({
      database,
      clock,
      artifactDir: demoArtifacts,
      jobId,
      model: new LiteLlmModel(modelConfigFromEnv(env)),
      limits: DEFAULT_LIMITS,
      journalDir: demoJournal,
      env,
    });
  } finally {
    database.close();
  }
}

async function main(): Promise<void> {
  loadEnvFile(join(process.cwd(), ".env"), process.env);
  if (command === "serve") {
    const { startApp } = await import("./app/server.js");
    const port = Number(process.env.NIGHTSHIFT_PORT ?? 8787);
    const host = process.env.NIGHTSHIFT_HOST ?? "127.0.0.1";
    const app = await startApp({ root, env: process.env, host, port });
    process.stdout.write(`Nightshift listening at ${app.url}\n`);
    return;
  }
  if (command === "demo-recover") {
    print(await demoRecover(root, systemClock, process.env));
    return;
  }
  if (command === "model-recover") {
    const result = await modelRecover(root, systemClock, process.env);
    print(result);
    process.exitCode = result.outcome === "completed" ? 0 : result.outcome === "blocked" ? 2 : 1;
    return;
  }
  mkdirSync(artifactDir, { recursive: true });
  const database = openDatabase(databasePath);
  try {
    if (command === "seed") {
      const scenario = readScenario(process.argv[3]);
      const jobId = seedScenario(database, systemClock, artifactDir, scenario);
      print({ scenario, job_id: jobId, environment: "controlled_fault_injection" });
      return;
    }
    if (command === "recover-model") {
      const jobId = process.argv[3];
      if (!jobId) {
        throw new Error("Usage: recover-model <job-id>");
      }
      const model = new LiteLlmModel(modelConfigFromEnv(process.env));
      const result = await runAgent({
        database,
        clock: systemClock,
        artifactDir,
        jobId,
        model,
        limits: DEFAULT_LIMITS,
        journalDir,
        env: process.env,
      });
      print(result);
      process.exitCode = result.outcome === "completed" ? 0 : result.outcome === "blocked" ? 2 : 1;
      return;
    }
    throw new Error(
      "Usage: serve | demo-recover | model-recover | seed <expired_lease|active_lease|completed> | recover-model <job-id>",
    );
  } finally {
    database.close();
  }
}

function readScenario(value: string | undefined): DemoScenario {
  if (value === "expired_lease" || value === "active_lease" || value === "completed") {
    return value;
  }
  throw new Error("Scenario must be expired_lease, active_lease, or completed.");
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function parseAssignment(rawLine: string): { key: string; value: string } | null {
  const line = rawLine.trim();
  if (line.length === 0 || line.startsWith("#")) {
    return null;
  }
  const separator = line.indexOf("=");
  if (separator <= 0) {
    return null;
  }
  const key = line.slice(0, separator).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }
  return { key, value: unquote(line.slice(separator + 1).trim()) };
}

function unquote(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  return quoted ? value.slice(1, -1) : value;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("cli.ts") || entry.endsWith("cli.js")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Nightshift command failed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
