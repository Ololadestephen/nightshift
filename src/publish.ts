import { randomUUID } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { NightshiftError } from "./errors.js";
import {
  getArtifact,
  insertArtifact,
  requireJob,
  setArtifactId,
  type ArtifactRecord,
} from "./store.js";

export function prepareArtifactFile(
  database: DatabaseSync,
  jobId: string,
  artifactDir: string,
  body: string,
  contentHash: string,
  now: Date,
): { tempPath: string; finalPath: string; body: string } {
  const existing = getArtifact(database, jobId);
  if (existing && existing.content_hash !== contentHash) {
    throw new NightshiftError(
      "artifact_collision",
      "An artifact already exists with different content.",
    );
  }
  mkdirSync(artifactDir, { recursive: true });
  const finalPath = join(artifactDir, `${jobId}.json`);
  const tempPath = `${finalPath}.${now.getTime()}.partial`;
  writeFileSync(tempPath, body);
  return { tempPath, finalPath, body };
}

export function storeArtifact(
  database: DatabaseSync,
  jobId: string,
  filePath: string,
  body: string,
  contentHash: string,
  now: Date,
): void {
  const job = requireJob(database, jobId);
  const existing = getArtifact(database, jobId);
  if (existing) {
    if (existing.content_hash !== contentHash) {
      throw new NightshiftError(
        "artifact_collision",
        "An artifact already exists with different content.",
      );
    }
    return;
  }
  const artifact: ArtifactRecord = {
    id: `artifact_${randomUUID()}`,
    job_id: jobId,
    pipeline_version: job.pipeline_version,
    input_hash: job.input_hash,
    content_hash: contentHash,
    body_json: body,
    file_path: filePath,
    created_at: now.toISOString(),
  };
  insertArtifact(database, artifact);
  setArtifactId(database, jobId, artifact.id, now.toISOString());
}

export function publishFile(database: DatabaseSync, jobId: string, artifactDir: string): void {
  const artifact = getArtifact(database, jobId);
  if (!artifact) {
    throw new NightshiftError("artifact_missing", "The job has no stored artifact to publish.");
  }
  mkdirSync(artifactDir, { recursive: true });
  const finalPath = join(artifactDir, `${jobId}.json`);
  const tempPath = `${finalPath}.rewrite`;
  writeFileSync(tempPath, artifact.body_json);
  renameSync(tempPath, finalPath);
}
