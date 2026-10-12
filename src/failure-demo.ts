import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DeterministicController, runAgent, type AgentRun } from "./agent.js";
import { CappedModel, readLiveGate } from "./app/budget.js";
import type { Clock } from "./clock.js";
import type { ModelClient } from "./controller.js";
import { openDatabase } from "./db.js";
import { seedScenario } from "./demo.js";
import { NightshiftError } from "./errors.js";
import { LiteLlmModel, modelConfigFromEnv } from "./model.js";
import { DEFAULT_LIMITS } from "./policy.js";
import { redact } from "./redact.js";

export interface FailureDemoReport {
  environment: "controlled_fault_injection";
  fault: "resume_acknowledgement_lost_after_artifact_commit";
  model: string | null;
  local_report: string;
  run: AgentRun;
  artifact_count: number;
  operations: { operation_id: string; status: string; observed_generation: number }[];
  model_cost: {
    measured_usd: null;
    maximum_reserved_usd: number | null;
    source: string;
  };
}

/** A CLI-only labelled demo. Fault controls are never model tool arguments or HTTP fields. */
export async function failureDemo(
  runtimeRoot: string,
  clock: Clock,
  env: NodeJS.ProcessEnv,
  useModel = false,
): Promise<FailureDemoReport> {
  const demoRoot = join(runtimeRoot, "failure-demo", randomUUID());
  const artifactDir = join(demoRoot, "artifacts");
  mkdirSync(artifactDir, { recursive: true });
  const database = openDatabase(join(demoRoot, "nightshift.sqlite"));
  const budgetDatabase = useModel ? openDatabase(join(runtimeRoot, "nightshift.sqlite")) : null;
  try {
    let model: ModelClient = new DeterministicController();
    let modelName: string | null = null;
    let reservation: number | null = null;
    if (budgetDatabase) {
      const gate = readLiveGate(env, budgetDatabase);
      const remaining = (gate.calls_allowed ?? 0) - gate.calls_used;
      if (!gate.available || remaining < DEFAULT_LIMITS.maxModelCalls) {
        throw new NightshiftError(
          "demo_budget_unavailable",
          "The existing approved budget must have room for eight calls; no model request was made.",
        );
      }
      const config = modelConfigFromEnv(env);
      modelName = config.model;
      model = new CappedModel(
        new LiteLlmModel(config),
        budgetDatabase,
        gate.calls_allowed ?? 0,
        `failure_demo_${randomUUID()}`,
        () => clock.now().toISOString(),
      );
      reservation = DEFAULT_LIMITS.maxModelCalls * (gate.usd_per_call ?? 0);
    }
    const jobId = seedScenario(database, clock, artifactDir, "expired_lease");
    const run = await runAgent({
      database,
      clock,
      artifactDir,
      jobId,
      model,
      limits: DEFAULT_LIMITS,
      journalDir: join(demoRoot, "traces"),
      env: useModel ? env : {},
      controlledFault: "resume_ack_lost",
    });
    const artifacts = database
      .prepare("SELECT COUNT(*) AS count FROM artifacts WHERE job_id = ?")
      .get(jobId) as { count: number };
    const operations = database
      .prepare("SELECT operation_id, status, observed_generation FROM operations WHERE job_id = ?")
      .all(jobId) as FailureDemoReport["operations"];
    const report: FailureDemoReport = {
      environment: "controlled_fault_injection",
      fault: "resume_acknowledgement_lost_after_artifact_commit",
      model: modelName,
      local_report: join(demoRoot, "report.json"),
      run,
      artifact_count: Number(artifacts.count),
      operations,
      model_cost: {
        measured_usd: null,
        maximum_reserved_usd: reservation,
        source: useModel
          ? "Owner-configured USD-per-call estimate and shared application budget ledger; not provider billing."
          : "Deterministic controller; no model requests. USD model cost not measured.",
      },
    };
    writeFileSync(report.local_report, `${JSON.stringify(redact(report), null, 2)}\n`);
    return report;
  } finally {
    database.close();
    budgetDatabase?.close();
  }
}
