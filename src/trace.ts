import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redact } from "./redact.js";

export interface TokenUsage {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

export interface TraceEvent {
  name: string;
  rationale: string | null;
  output: unknown;
  duration_ms: number;
  usage: TokenUsage | null;
}

export interface TraceRuntime {
  traceId: string | null;
  run<T>(body: () => Promise<T>): Promise<T>;
  tool<T>(name: string, args: unknown, execute: () => T): Promise<T>;
  wrapClient<T extends object>(client: T): T;
  close(): Promise<void>;
}

export type TraceOpener = (env: NodeJS.ProcessEnv) => Promise<TraceRuntime | null>;

export type TraceDelivery = "disabled_missing_api_key" | "exported" | "export_failed";

export interface Traced<T> {
  result: T;
  neatlogs: TraceDelivery;
}

const localRuntime: TraceRuntime = {
  traceId: null,
  run(body) {
    return body();
  },
  tool(_name, _args, execute) {
    return Promise.resolve(execute());
  },
  wrapClient(client) {
    return client;
  },
  close() {
    return Promise.resolve();
  },
};

const activeTrace = new AsyncLocalStorage<TraceRuntime>();

export function currentTrace(): TraceRuntime {
  return activeTrace.getStore() ?? localRuntime;
}

export function elapsedMs(started: number): number {
  return Math.max(0, Math.round(performance.now() - started));
}

export function usageFrom(value: unknown): TokenUsage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const usage = {
    prompt_tokens: finiteNumber(record.prompt_tokens ?? record.input_tokens),
    completion_tokens: finiteNumber(record.completion_tokens ?? record.output_tokens),
    total_tokens: finiteNumber(record.total_tokens),
  };
  if (
    usage.prompt_tokens === null &&
    usage.completion_tokens === null &&
    usage.total_tokens === null
  ) {
    return null;
  }
  return usage;
}

export function neatlogsDelivery(
  env: NodeJS.ProcessEnv,
): "disabled_missing_api_key" | "configured" {
  return env.NEATLOGS_API_KEY ? "configured" : "disabled_missing_api_key";
}

export function writeJournal(directory: string, jobId: string, events: TraceEvent[]): string {
  mkdirSync(directory, { recursive: true });
  const filePath = join(directory, `${jobId}.json`);
  const body = JSON.stringify(
    redact({
      job_id: jobId,
      record: "local_journal",
      events,
    }),
    null,
    2,
  );
  writeFileSync(filePath, body);
  return filePath;
}

export async function runWithTrace<T>(
  env: NodeJS.ProcessEnv,
  body: () => Promise<T>,
  open: TraceOpener = openNeatlogs,
): Promise<Traced<T>> {
  let runtime: TraceRuntime | null;
  try {
    runtime = await open(env);
  } catch {
    return { result: await body(), neatlogs: "export_failed" };
  }
  if (!runtime) {
    return { result: await body(), neatlogs: "disabled_missing_api_key" };
  }
  let result: T;
  try {
    result = await runtime.run(() => activeTrace.run(runtime, body));
  } catch (error) {
    await closeQuietly(runtime);
    throw error;
  }
  try {
    await runtime.close();
  } catch {
    return { result, neatlogs: "export_failed" };
  }
  return { result, neatlogs: "exported" };
}

async function openNeatlogs(env: NodeJS.ProcessEnv): Promise<TraceRuntime | null> {
  if (!env.NEATLOGS_API_KEY) {
    return null;
  }
  const neatlogs = await import("neatlogs");
  const { traceTool, wrapOpenAI } = await import("neatlogs/openai");
  await neatlogs.init({
    apiKey: env.NEATLOGS_API_KEY,
    workflowName: "nightshift-report-recovery",
    registerShutdownHandlers: false,
  });
  const runtime: TraceRuntime = {
    traceId: null,
    async run(body) {
      return neatlogs.trace(
        { name: "nightshift-report-recovery", kind: "WORKFLOW" },
        async (span) => {
          runtime.traceId = span.spanContext().traceId;
          return body();
        },
      );
    },
    async tool(name, args, execute) {
      const traced = traceTool(name, async () => execute());
      return traced(redact(args));
    },
    wrapClient(client) {
      return wrapOpenAI(client);
    },
    async close() {
      await neatlogs.flush();
      await neatlogs.shutdown();
    },
  };
  return runtime;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function closeQuietly(runtime: TraceRuntime): Promise<void> {
  try {
    await runtime.close();
  } catch {
    return undefined;
  }
}
