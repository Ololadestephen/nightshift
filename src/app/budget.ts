import type { Database } from "../database-port.js";
import type { DecisionInput, ModelClient } from "../controller.js";
import type { TokenUsage } from "../trace.js";
import { countLedger, reserveLedger } from "./records.js";
export interface LiveGate {
  available: boolean;
  reason: "ready" | "live_budget_unavailable" | "budget_cap";
  cap_usd: number | null;
  usd_per_call: number | null;
  calls_used: number;
  calls_allowed: number | null;
}
export async function readLiveGate(env: NodeJS.ProcessEnv, database: Database): Promise<LiveGate> {
  const cap = positive(env.NIGHTSHIFT_MODEL_BUDGET_USD);
  const perCall = positive(env.NIGHTSHIFT_USD_PER_CALL);
  const approved = env.NIGHTSHIFT_SPEND_APPROVED === "1";
  const hasKey = Boolean(env.LITELLM_API_KEY);
  const used = await countLedger(database);
  if (!approved || !hasKey || cap === null || perCall === null) {
    return {
      available: false,
      reason: "live_budget_unavailable",
      cap_usd: cap,
      usd_per_call: perCall,
      calls_used: used,
      calls_allowed: null,
    };
  }
  const allowed = Math.floor(cap / perCall);
  if (allowed < 1 || used >= allowed) {
    return {
      available: false,
      reason: "budget_cap",
      cap_usd: cap,
      usd_per_call: perCall,
      calls_used: used,
      calls_allowed: allowed,
    };
  }
  return {
    available: true,
    reason: "ready",
    cap_usd: cap,
    usd_per_call: perCall,
    calls_used: used,
    calls_allowed: allowed,
  };
}
export class CappedModel implements ModelClient {
  readonly source = "model" as const;
  measuredUsage: TokenUsage | null = null;
  constructor(
    private readonly inner: ModelClient,
    private readonly database: Database,
    private readonly allowed: number,
    private readonly runId: string,
    private readonly at: () => string,
  ) {}
  async decide(input: DecisionInput): Promise<unknown> {
    await reserveLedger(this.database, this.allowed, this.runId, this.at());
    const value = await this.inner.decide(input);
    this.measuredUsage = this.inner.measuredUsage;
    return value;
  }
}
function positive(value: string | undefined): number | null {
  if (!value || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
