import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Clock } from "./clock.js";
import { CODE_VERSION } from "./constants.js";
import { transaction } from "./db.js";
import {
  aggregate,
  canonicalJson,
  hashRows,
  parseStoredJson,
  reportsMatch,
  sha256,
  validateRows,
  type ReportBody,
} from "./report.js";
import {
  getArtifact,
  getLease,
  insertAttempt,
  insertCheckpoint,
  insertError,
  requireJob,
  transitionJob,
} from "./store.js";

export interface VerificationResult {
  ok: boolean;
  code: string;
  job_status: string;
  mismatches: string[];
  report: ReportBody | null;
}

export function verifyArtifact(
  database: DatabaseSync,
  jobId: string,
  clock: Clock,
  artifactDir: string,
): VerificationResult {
  const now = clock.now().toISOString();
  return transaction(database, () => {
    const job = requireJob(database, jobId);
    const mismatches: string[] = [];
    const rows = validateRows(parseStoredJson(job.input_json));
    const expected = aggregate(rows, job.id, job.pipeline_version);
    if (hashRows(rows) !== job.input_hash) {
      mismatches.push("input_hash");
    }
    const artifact = getArtifact(database, jobId);
    let actual: ReportBody | null = null;
    if (!artifact) {
      mismatches.push("artifact_missing");
    } else {
      if (artifact.job_id !== job.id) {
        mismatches.push("job_id");
      }
      if (artifact.pipeline_version !== job.pipeline_version) {
        mismatches.push("pipeline_version");
      }
      if (artifact.input_hash !== job.input_hash) {
        mismatches.push("artifact_input_hash");
      }
      try {
        const parsedBody = parseStoredJson(artifact.body_json);
        actual = parsedBody && typeof parsedBody === "object" ? (parsedBody as ReportBody) : null;
      } catch {
        actual = null;
      }
      if (!actual || !reportsMatch(actual, expected)) {
        mismatches.push("report_body");
      }
      if (sha256(artifact.body_json) !== artifact.content_hash) {
        mismatches.push("content_hash");
      }
      const filePath = join(artifactDir, `${jobId}.json`);
      let fileText: string | null = null;
      try {
        fileText = readFileSync(filePath, "utf8");
      } catch {
        fileText = null;
      }
      if (fileText === null) {
        mismatches.push("artifact_file_missing");
      } else if (fileText !== artifact.body_json) {
        mismatches.push("artifact_file_mismatch");
      }
    }

    const ok = mismatches.length === 0;
    if (ok && job.status === "verifying") {
      transitionJob(database, jobId, "completed", now, null);
      insertCheckpoint(database, {
        id: `checkpoint_${randomUUID()}`,
        job_id: jobId,
        step: "reconciled",
        generation: getLease(database, jobId)?.generation ?? 0,
        payload_json: canonicalJson({ step: "reconciled", input_hash: job.input_hash }),
        created_at: now,
      });
    } else if (!ok && job.status !== "completed" && job.status !== "escalated") {
      transitionJob(database, jobId, "escalated", now, "verification_failed");
    }
    const status = requireJob(database, jobId).status;
    insertAttempt(database, {
      id: `attempt_${randomUUID()}`,
      job_id: jobId,
      kind: "verify_artifact",
      outcome: ok ? "passed" : "failed",
      evidence_json: canonicalJson({ mismatches, code_version: CODE_VERSION }),
      created_at: now,
    });
    if (!ok) {
      insertError(database, {
        id: `error_${randomUUID()}`,
        job_id: jobId,
        message: `Verification failed: ${mismatches.join(", ")}`,
        source: "verifier",
        created_at: now,
      });
    }
    return {
      ok,
      code: ok ? "verified" : "verification_failed",
      job_status: status,
      mismatches,
      report: ok ? expected : actual,
    };
  });
}
