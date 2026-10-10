import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
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

export function reclaimExpiredLease(
  database: DatabaseSync,
  jobId: string,
  observedGeneration: number,
  clock: Clock,
  ttlMs = LEASE_TTL_MS,
): ReclaimResult {
  const now = clock.now();
  const nowIso = now.toISOString();
  return transaction(database, () => {
    const job = requireJob(database, jobId);
    if (job.status === "completed" || job.status === "escalated") {
      const result = { ok: false, code: "terminal_job", generation: null, expires_at: null };
      recordReclaim(database, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
      });
      return result;
    }
    const lease = getLease(database, jobId);
    const observed = observeLease(lease, now);
    if (observed.lease_state !== "expired" || observed.generation === null) {
      const result = {
        ok: false,
        code: observed.lease_state === "active" ? "lease_active" : `lease_${observed.lease_state}`,
        generation: observed.generation,
        expires_at: observed.expires_at,
      };
      recordReclaim(database, jobId, result.code, nowIso, {
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
      recordReclaim(database, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
      });
      return result;
    }
    const nextGeneration = observed.generation + 1;
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    const swapped = compareAndSwapLease(
      database,
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
      recordReclaim(database, jobId, result.code, nowIso, {
        observed_generation: observedGeneration,
      });
      return result;
    }
    if (job.status === "running") {
      transitionJob(database, jobId, "stalled", nowIso, null);
    }
    transitionJob(database, jobId, "recovering", nowIso, null);
    const result = {
      ok: true,
      code: "reclaimed",
      generation: nextGeneration,
      expires_at: expiresAt,
    };
    recordReclaim(database, jobId, result.code, nowIso, {
      observed_generation: observedGeneration,
      generation: nextGeneration,
    });
    return result;
  });
}

function recordReclaim(
  database: DatabaseSync,
  jobId: string,
  outcome: string,
  at: string,
  evidence: Record<string, unknown>,
): void {
  insertAttempt(database, {
    id: `attempt_${randomUUID()}`,
    job_id: jobId,
    kind: "reclaim_lease",
    outcome,
    evidence_json: canonicalJson(evidence),
    created_at: at,
  });
}
