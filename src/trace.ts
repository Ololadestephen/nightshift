import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redact } from "./redact.js";

export interface TraceEvent {
  name: string;
  rationale: string | null;
  output: unknown;
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

export async function exportConfiguredTrace(
  env: NodeJS.ProcessEnv,
  events: TraceEvent[],
  decisionSource: string,
): Promise<"disabled_missing_api_key" | "exported" | "export_failed"> {
  if (!env.NEATLOGS_API_KEY) {
    return "disabled_missing_api_key";
  }
  try {
    const neatlogs = await import("neatlogs");
    await neatlogs.init({
      apiKey: env.NEATLOGS_API_KEY,
      workflowName: "nightshift-report-recovery",
      registerShutdownHandlers: false,
    });
    const workflow = neatlogs.span(
      { kind: "WORKFLOW", name: "nightshift-report-recovery", captureInput: false },
      async () => {
        for (const event of events) {
          const tool = neatlogs.span(
            { kind: "TOOL", name: event.name, toolName: event.name, captureInput: false },
            async () => redact(event.output),
          );
          await tool();
        }
        return { event_count: events.length, decision_source: decisionSource };
      },
    );
    await workflow();
    await neatlogs.flush();
    await neatlogs.shutdown();
    return "exported";
  } catch {
    return "export_failed";
  }
}
