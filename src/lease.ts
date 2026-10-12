import { randomUUID } from "node:crypto";
import type { Database } from "./database-port.js";
import type { Clock } from "./clock.js";
import { LEASE_HOLDER, LEASE_TTL_MS } from "./constants.js";
import { transaction } from "./db.js";
import { canonicalJson } from "./report.js";
import {
  compareAndSwapLease,
  getLease,
  insertAttempt,
  requireJob,
  transitionJob,
  type LeaseRecord,
} from "./store.js";
export type LeaseState = "active" | "expired" | "missing" | "uncertain";
export interface LeaseObservation {
  lease_state: LeaseState;
  generation: number | null;
  holder: string | null;
  expires_at: string | null;
}
export interface ReclaimResult {
  ok: boolean;
  code: string;
  generation: number | null;
  expires_at: string | null;
}
export function observeLease(lease: LeaseRecord | null, now: Date): LeaseObservation {
  if (!lease) {
    return { lease_state: "missing", generation: null, holder: null, expires_at: null };
  }
  const expiresAt = Date.parse(lease.expires_at);
  if (Number.isNaN(expiresAt)) {
    return {
      lease_state: "uncertain",
      generation: lease.generation,
      holder: lease.holder,
      expires_at: lease.expires_at,
    };
  }
  return {
    lease_state: expiresAt > now.getTime() ? "active" : "expired",
    generation: lease.generation,
    holder: lease.holder,
    expires_at: lease.expires_at,
  };
}
export async function reclaimExpiredLease(
  database: Database,
  jobId: string,
  observedGeneration: number,
  clock: Clock,
  ttlMs = LEASE_TTL_MS,
): Promise<ReclaimResult> {
  const now = clock.now();
  const nowIso = now.toISOString();
  return await transaction(database, async (boundDatabase) => {
    const job = await requireJob(boundDatabase, jobId);
    if (job.status === "completed" || job.status === "escalated") {
      const result = { ok: false, code: "terminal_job", generation: null, expires_at: null };
      await recordReclaim(boundDatabase, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
      });
      return result;
    }
    const lease = await getLease(boundDatabase, jobId);
    const observed = observeLease(lease, now);
    if (observed.lease_state !== "expired" || observed.generation === null) {
      const result = {
        ok: false,
        code: observed.lease_state === "active" ? "lease_active" : `lease_${observed.lease_state}`,
        generation: observed.generation,
        expires_at: observed.expires_at,
      };
      await recordReclaim(boundDatabase, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
        lease_state: observed.lease_state,
      });
      return result;
    }
    if (observed.generation !== observedGeneration) {
      const result = {
        ok: false,
        code: "stale_generation",
        generation: observed.generation,
        expires_at: observed.expires_at,
      };
      await recordReclaim(boundDatabase, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
      });
      return result;
    }
    const nextGeneration = observed.generation + 1;
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    const swapped = await compareAndSwapLease(
      boundDatabase,
      jobId,
      observedGeneration,
      nextGeneration,
      LEASE_HOLDER,
      expiresAt,
      nowIso,
    );
    if (!swapped) {
      const result = {
        ok: false,
        code: "lease_conflict",
        generation: observed.generation,
        expires_at: null,
      };
      await recordReclaim(boundDatabase, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
      });
      return result;
    }
    if (job.status === "running") {
      await transitionJob(boundDatabase, jobId, "stalled", nowIso, null);
    }
    await transitionJob(boundDatabase, jobId, "recovering", nowIso, null);
    const result = {
      ok: true,
      code: "reclaimed",
      generation: nextGeneration,
      expires_at: expiresAt,
    };
    await recordReclaim(boundDatabase, jobId, result.code, nowIso, {
      observed_generation: observedGeneration,
      generation: nextGeneration,
    });
    return result;
  });
}
async function recordReclaim(
  database: Database,
  jobId: string,
  outcome: string,
  at: string,
  evidence: Record<string, unknown>,
): Promise<void> {
  await insertAttempt(database, {
    id: `attempt_${randomUUID()}`,
    job_id: jobId,
    kind: "reclaim_lease",
    outcome,
    evidence_json: canonicalJson(evidence),
    created_at: at,
  });
}
