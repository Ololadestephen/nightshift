import type { DatabaseSync } from "node:sqlite";
import { escalate, executeTool } from "./actions.js";
import type { Clock } from "./clock.js";
import {
  decideDeterministic,
  emptyMemory,
  remember,
  type AgentMemory,
  type DecisionInput,
  type ModelClient,
} from "./controller.js";
import { isNightshiftError } from "./errors.js";
import {
  authorizeDecision,
  isRepair,
  parseDecision,
  type Limits,
  type ToolDecision,
  type ToolName,
} from "./policy.js";
import { toolsForTurn } from "./model.js";
import { redact } from "./redact.js";
import { requireJob } from "./store.js";
import {
  currentTrace,
  elapsedMs,
  runWithTrace,
  writeJournal,
  type TraceEvent,
  type TraceOpener,
} from "./trace.js";
import type { VerificationResult } from "./verifier.js";

export interface AgentRun {
  decision_source: ModelClient["source"];
  outcome: "completed" | "escalated" | "blocked";
  reason: string;
  job_id: string;
  job_status: string;
  verification: VerificationResult | null;
  tools: string[];
  corrections: number;
  repairs: number;
  model_calls: number;
  trace: TraceEvent[];
  rejections: string[];
  neatlogs: "disabled_missing_api_key" | "exported" | "export_failed";
  trace_id: string | null;
  local_journal: string | null;
}

export interface RunAgentInput {
  database: DatabaseSync;
  clock: Clock;
  artifactDir: string;
  jobId: string;
  model: ModelClient;
  limits: Limits;
  journalDir: string | null;
  env: NodeJS.ProcessEnv;
  controlledFault?: "resume_ack_lost";
  traceOpen?: TraceOpener;
  onProgress?: (progress: RunProgress) => void;
}

export interface RunProgress {
  decision_source: ModelClient["source"];
  model_calls: number;
  tools: string[];
  trace: TraceEvent[];
  rejections: string[];
  verification: VerificationResult | null;
  trace_id: string | null;
}

export class DeterministicController implements ModelClient {
  readonly source = "deterministic_controller" as const;
  measuredUsage = null;

  decide(input: DecisionInput): Promise<unknown> {
    return Promise.resolve(decideDeterministic(input.jobId, input.memory));
  }
}

type RunStop = { outcome: AgentRun["outcome"]; reason: string } | null;

interface RunState {
  memory: AgentMemory;
  tools: string[];
  trace: TraceEvent[];
  rejections: string[];
  corrections: number;
  repairs: number;
  modelCalls: number;
  steps: number;
  rejection: string | null;
  verification: VerificationResult | null;
  started: number;
  perfStarted: number;
}

export async function runAgent(input: RunAgentInput): Promise<AgentRun> {
  const traced = input.traceOpen
    ? await runWithTrace(input.env, () => executeRun(input), input.traceOpen)
    : await runWithTrace(input.env, () => executeRun(input));
  return { ...traced.result, neatlogs: traced.neatlogs };
}

async function executeRun(input: RunAgentInput): Promise<Omit<AgentRun, "neatlogs">> {
  const state = newState(input);
  try {
    while (state.steps < input.limits.maxSteps) {
      const stop = await advanceRun(input, state);
      if (stop) {
        return materialize(input, state, stop.outcome, stop.reason);
      }
      input.onProgress?.(snapshot(input, state));
    }
    safeEscalate(input, "budget_steps");
    return materialize(input, state, "escalated", "budget_steps");
  } catch (error) {
    state.trace.push({
      name: "run",
      rationale: null,
      output: failureOutput(error),
      duration_ms: elapsedMs(state.perfStarted),
      usage: null,
    });
    safeEscalate(input, "run_failed");
    return materialize(input, state, "escalated", "run_failed");
  }
}

function newState(input: RunAgentInput): RunState {
  return {
    memory: emptyMemory(),
    tools: [],
    trace: [],
    rejections: [],
    corrections: 0,
    repairs: 0,
    modelCalls: 0,
    steps: 0,
    rejection: null,
    verification: null,
    started: input.clock.now().getTime(),
    perfStarted: performance.now(),
  };
}

async function advanceRun(input: RunAgentInput, state: RunState): Promise<RunStop> {
  const budget = budgetStop(input, state);
  if (budget) {
    return budget;
  }
  if (countsModelCall(input) && state.modelCalls >= input.limits.maxModelCalls) {
    escalate(input, "budget_model");
    return { outcome: "escalated", reason: "budget_model" };
  }
  const asked = await askModel(input, state);
  if (asked.type === "blocked") {
    return { outcome: "blocked", reason: asked.reason };
  }
  if (asked.type === "stopped") {
    return { outcome: asked.outcome, reason: asked.reason };
  }
  if (countsModelCall(input)) {
    state.modelCalls += 1;
  }
  return await applyDecision(input, state, asked.value);
}

function countsModelCall(input: RunAgentInput): boolean {
  return input.model.source === "model";
}

function budgetStop(input: RunAgentInput, state: RunState): RunStop {
  if (input.clock.now().getTime() - state.started > input.limits.maxElapsedMs) {
    escalate(input, "budget_elapsed");
    return { outcome: "escalated", reason: "budget_elapsed" };
  }
  if (state.memory.verified && state.memory.job?.status === "completed") {
    return { outcome: "completed", reason: "verified" };
  }
  return null;
}

type Asked =
  | { type: "decision"; value: unknown }
  | { type: "blocked"; reason: string }
  | { type: "stopped"; outcome: "escalated"; reason: string };

async function askModel(input: RunAgentInput, state: RunState): Promise<Asked> {
  const started = performance.now();
  try {
    const value = await input.model.decide({
      jobId: input.jobId,
      memory: state.memory,
      rejection: state.rejection,
    });
    recordModel(input, state, started, { ok: true }, input.model.measuredUsage);
    return { type: "decision", value };
  } catch (error) {
    const blocked = blockedModelReason(error);
    const code = blocked ?? "model_decision_failed";
    recordModel(input, state, started, { ok: false, code }, null);
    if (blocked) {
      return { type: "blocked", reason: blocked };
    }
    safeEscalate(input, "model_decision_failed");
    return { type: "stopped", outcome: "escalated", reason: "model_decision_failed" };
  }
}

function recordModel(
  input: RunAgentInput,
  state: RunState,
  started: number,
  output: { ok: boolean; code?: string },
  usage: RunState["trace"][number]["usage"],
): void {
  if (input.model.source !== "model") {
    return;
  }
  state.trace.push({
    name: "model_decision",
    rationale: null,
    output,
    duration_ms: elapsedMs(started),
    usage,
  });
}

async function applyDecision(
  input: RunAgentInput,
  state: RunState,
  raw: unknown,
): Promise<RunStop> {
  const screened = screenDecision(raw, input.jobId, state.memory, state.corrections);
  state.corrections = screened.corrections;
  if (screened.type === "retry") {
    state.rejection = screened.reason;
    state.rejections.push(screened.reason);
    return null;
  }
  if (screened.type === "stop") {
    state.rejections.push(screened.detail);
    escalate(input, screened.reason);
    return { outcome: "escalated", reason: screened.reason };
  }
  state.rejection = null;
  if (isRepair(screened.decision.tool)) {
    state.repairs += 1;
    if (state.repairs > input.limits.maxRepairs) {
      escalate(input, "budget_repairs");
      return { outcome: "escalated", reason: "budget_repairs" };
    }
  }
  const started = performance.now();
  let output: unknown;
  try {
    output = await currentTrace().tool(screened.decision.tool, screened.decision.arguments, () =>
      executeTool(input, screened.decision, state.memory),
    );
  } catch (error) {
    state.tools.push(screened.decision.tool);
    state.trace.push({
      name: screened.decision.tool,
      rationale: screened.decision.rationale,
      output: failureOutput(error),
      duration_ms: elapsedMs(started),
      usage: null,
    });
    state.steps += 1;
    safeEscalate(input, "tool_failed");
    return { outcome: "escalated", reason: "tool_failed" };
  }
  state.tools.push(screened.decision.tool);
  state.trace.push({
    name: screened.decision.tool,
    rationale: screened.decision.rationale,
    output: redact(output),
    duration_ms: elapsedMs(started),
    usage: null,
  });
  remember(state.memory, screened.decision.tool, output);
  state.steps += 1;
  const terminal = terminalOutcome(screened.decision.tool, output);
  if (!terminal) {
    return null;
  }
  if (terminal.verification) {
    state.verification = terminal.verification;
  }
  return { outcome: terminal.outcome, reason: terminal.reason };
}

function snapshot(input: RunAgentInput, state: RunState): RunProgress {
  return {
    decision_source: input.model.source,
    model_calls: state.modelCalls,
    tools: state.tools,
    trace: state.trace,
    rejections: state.rejections,
    verification: state.verification,
    trace_id: currentTrace().traceId,
  };
}

function materialize(
  input: RunAgentInput,
  state: RunState,
  outcome: AgentRun["outcome"],
  reason: string,
): Omit<AgentRun, "neatlogs"> {
  return {
    decision_source: input.model.source,
    outcome,
    reason,
    job_id: input.jobId,
    job_status: jobStatus(input),
    verification: state.verification,
    tools: state.tools,
    corrections: state.corrections,
    repairs: state.repairs,
    model_calls: state.modelCalls,
    trace: state.trace,
    rejections: state.rejections,
    trace_id: currentTrace().traceId,
    local_journal: input.journalDir
      ? writeJournal(input.journalDir, input.jobId, state.trace)
      : null,
  };
}

function jobStatus(input: RunAgentInput): string {
  try {
    return requireJob(input.database, input.jobId).status;
  } catch {
    return "unknown";
  }
}

function safeEscalate(input: RunAgentInput, reason: string): void {
  try {
    escalate(input, reason);
  } catch {
    return undefined;
  }
}

function failureOutput(error: unknown): { ok: false; code: string } {
  if (isNightshiftError(error)) {
    return { ok: false, code: error.code };
  }
  return { ok: false, code: "tool_failed" };
}

function blockedModelReason(error: unknown): string | null {
  if (!isNightshiftError(error)) {
    return null;
  }
  if (
    error.code === "model_unavailable" ||
    error.code === "spend_not_approved" ||
    error.code === "model_request_failed" ||
    error.code === "budget_cap"
  ) {
    return error.code;
  }
  return null;
}

function screenDecision(
  raw: unknown,
  jobId: string,
  memory: AgentMemory,
  corrections: number,
):
  | { type: "retry"; reason: string; corrections: number }
  | { type: "stop"; reason: "invalid_model_output"; detail: string; corrections: number }
  | { type: "run"; decision: ToolDecision; corrections: number } {
  const parsed = parseDecision(raw);
  if (!parsed.ok) {
    const next = corrections + 1;
    return next > 1
      ? { type: "stop", reason: "invalid_model_output", detail: parsed.reason, corrections: next }
      : { type: "retry", reason: parsed.reason, corrections: next };
  }
  const authorized = authorizeDecision(
    parsed.decision,
    jobId,
    memory.worker?.generation ?? null,
    memory.checkpoint?.id ?? null,
    memory.reclaimedGeneration,
  );
  if (!authorized.ok) {
    const next = corrections + 1;
    return next > 1
      ? {
          type: "stop",
          reason: "invalid_model_output",
          detail: authorized.reason,
          corrections: next,
        }
      : { type: "retry", reason: authorized.reason, corrections: next };
  }
  if (!toolsForTurn(memory).includes(parsed.decision.tool)) {
    const next = corrections + 1;
    return next > 1
      ? {
          type: "stop",
          reason: "invalid_model_output",
          detail: "tool_not_offered",
          corrections: next,
        }
      : { type: "retry", reason: "tool_not_offered", corrections: next };
  }
  return { type: "run", decision: parsed.decision, corrections };
}

type Terminal = {
  outcome: "completed" | "escalated";
  reason: string;
  verification: VerificationResult | null;
};

function terminalOutcome(tool: ToolName, output: unknown): Terminal | null {
  if (tool === "verify_artifact") {
    const verification = output as VerificationResult;
    if (verification.ok && verification.job_status === "completed") {
      return { outcome: "completed", reason: "verified", verification };
    }
    if (!verification.ok) {
      return { outcome: "escalated", reason: "verification_failed", verification };
    }
  }
  if (tool === "escalate_incident") {
    return {
      outcome: "escalated",
      reason: String((output as { reason: string }).reason),
      verification: null,
    };
  }
  return null;
}
