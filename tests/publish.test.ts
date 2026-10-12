import assert from "node:assert/strict";
import { renameSync } from "node:fs";
import test from "node:test";
import { isNightshiftError } from "../src/errors.js";
import { prepareArtifactFile, publishFile, storeArtifact } from "../src/publish.js";
import { canonicalJson, sha256 } from "../src/report.js";
import { createJob } from "../src/pipeline.js";
import { loadFixture } from "../src/report.js";
import { fixturePath } from "../src/demo.js";
import { countArtifacts } from "../src/store.js";
import { workspace } from "./helpers.js";
test("artifact publication keeps one row and rejects a different body", async () => {
  const env = workspace();
  const created = await createJob(env.database, loadFixture(fixturePath()), env.clock);
  await assert.rejects(
    async () => await publishFile(env.database, created.jobId, env.artifacts),
    (error: unknown) => isNightshiftError(error) && error.code === "artifact_missing",
  );
  const body = canonicalJson({ job_id: created.jobId, total_minutes: 120 });
  const hash = sha256(body);
  const prepared = await prepareArtifactFile(
    env.database,
    created.jobId,
    env.artifacts,
    body,
    hash,
    env.clock.now(),
  );
  await storeArtifact(env.database, created.jobId, prepared.finalPath, body, hash, env.clock.now());
  renameSync(prepared.tempPath, prepared.finalPath);
  await publishFile(env.database, created.jobId, env.artifacts);
  assert.equal(await countArtifacts(env.database, created.jobId), 1);
  await assert.rejects(
    async () =>
      await prepareArtifactFile(
        env.database,
        created.jobId,
        env.artifacts,
        canonicalJson({ job_id: created.jobId, total_minutes: 1 }),
        sha256("different"),
        env.clock.now(),
      ),
    (error: unknown) => isNightshiftError(error) && error.code === "artifact_collision",
  );
  assert.equal(await countArtifacts(env.database, created.jobId), 1);
});
