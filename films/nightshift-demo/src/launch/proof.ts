import records from "../evidence/recorded-runs.json";

export const success = records.find((run) => run.job_id.startsWith("job_e0dfd0b5"));
export const failure = records.find((run) => run.job_id.startsWith("job_89165069"));
export const verified = success?.events.find((event) => event.tool === "verify_artifact")?.output;
if (
  !success ||
  !failure ||
  !verified ||
  verified.ok !== true ||
  verified.code !== "verified" ||
  verified.job_status !== "completed" ||
  !verified.report
) {
  throw new Error("Launch film needs the actual recorded completed report and earlier failed run.");
}
export const report = verified.report;
export const observed = success.events.find((event) => event.tool === "inspect_worker")?.output;
export const reclaimed = success.events.find(
  (event) => event.tool === "reclaim_expired_lease",
)?.output;
const resumeOutput = success.events.find((event) => event.tool === "resume_job")?.output;
if (!resumeOutput || !("type" in resumeOutput) || resumeOutput.type !== "applied") {
  throw new Error("Recorded recovery must contain an applied resume.");
}
export const resumed = resumeOutput;
