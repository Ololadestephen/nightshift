import { randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Clock } from "../clock.js";
import { systemClock } from "../clock.js";
import type { ModelClient } from "../controller.js";
import { openDatabase } from "../db.js";
import { seedScenario, type DemoScenario } from "../demo.js";
import { NightshiftError, isNightshiftError } from "../errors.js";
import { observeLease } from "../lease.js";
import { parseStoredJson } from "../report.js";
import { redact } from "../redact.js";
import {
  getArtifact,
  getJob,
  getLease,
  latestCheckpoint,
  listAttempts,
  listCheckpoints,
  listErrors,
} from "../store.js";
import { createJob } from "../pipeline.js";
import { readLiveGate } from "./budget.js";
import {
  assignJob,
  countOwnedJobs,
  countSessions,
  getSession,
  insertSession,
  latestRun,
  listOwnedJobIds,
} from "./records.js";
import {
  enqueueWorker,
  resumeOnBoot,
  startLabRun,
  startLiveRun,
  type RunnerPaths,
} from "./runner.js";
import {
  MAX_BODY_BYTES,
  MAX_JOBS_PER_SESSION,
  MAX_SESSIONS,
  MAX_SESSIONS_PER_HOUR,
  SESSION_WINDOW_MS,
  parseDataset,
} from "./submit.js";
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../public");
const STATIC: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.css": { file: "app.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/ui.js": { file: "ui.js", type: "text/javascript; charset=utf-8" },
  "/landing.js": { file: "landing.js", type: "text/javascript; charset=utf-8" },
  "/workspace.js": { file: "workspace.js", type: "text/javascript; charset=utf-8" },
  "/landing.css": { file: "landing.css", type: "text/css; charset=utf-8" },
  "/workspace.css": { file: "workspace.css", type: "text/css; charset=utf-8" },
};
for (const name of [
  "accessibility",
  "recovery-illustration",
  "landing-content",
  "navigation",
  "overview",
  "panels",
  "jobs",
  "report",
]) {
  STATIC[`/styles/${name}.css`] = { file: `styles/${name}.css`, type: "text/css; charset=utf-8" };
}

export interface AppOptions {
  root: string;
  env: NodeJS.ProcessEnv;
  host?: string;
  port?: number;
  clock?: Clock;
  lab?: boolean;
  model?: ModelClient;
}

export interface RunningApp {
  url: string;
  close: () => Promise<void>;
}

export async function startApp(options: AppOptions): Promise<RunningApp> {
  const artifactDir = join(options.root, "artifacts");
  const journalDir = join(options.root, "traces");
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(journalDir, { recursive: true });
  const database = openDatabase(join(options.root, "nightshift.sqlite"));
  const paths: RunnerPaths = {
    database,
    clock: options.clock ?? systemClock,
    artifactDir,
    journalDir,
    env: options.env,
    ...(options.model ? { model: options.model } : {}),
  };
  const lab = options.lab ?? options.env.NIGHTSHIFT_LAB === "1";
  resumeOnBoot(paths);
  const server = createServer((request, response) => {
    void handle(request, response, paths, lab).catch((error: unknown) => {
      const coded = isNightshiftError(error) ? error.code : "request_failed";
      send(response, 500, { error: coded, message: "The request failed." });
    });
  });
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });
  const address = server.address();
  const bound = typeof address === "object" && address ? address.port : port;
  return {
    url: `http://${host}:${bound}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          database.close();
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
  paths: RunnerPaths,
  lab: boolean,
): Promise<void> {
  const pathname = requestPath(request.url);
  const method = request.method ?? "GET";
  const file = STATIC[pathname];
  if (method === "GET" && file) {
    sendFile(response, file);
    return;
  }
  if (method === "POST" && pathname === "/api/session") {
    await createSession(request, response, paths, lab);
    return;
  }
  const sessionId = sessionFrom(request, paths);
  if (!sessionId) {
    send(response, 401, {
      error: "session_required",
      message: "Open Nightshift to start a session.",
    });
    return;
  }
  if (method === "GET" && pathname === "/api/jobs") {
    const jobs = listOwnedJobIds(paths.database, sessionId).flatMap((id) => {
      const job = jobSummary(paths, id);
      return job ? [publicJob(job)] : [];
    });
    send(response, 200, { jobs });
    return;
  }
  if (method === "POST" && pathname === "/api/jobs") {
    await createReport(request, response, paths, sessionId);
    return;
  }
  if (method === "POST" && pathname === "/api/lab/jobs") {
    await createLab(request, response, paths, sessionId, lab);
    return;
  }
  const labRun = /^\/api\/lab\/jobs\/(job_[0-9a-f-]{36})\/runs$/i.exec(pathname);
  if (method === "POST" && labRun?.[1]) {
    if (!lab) {
      send(response, 404, { error: "not_found", message: "That page does not exist." });
      return;
    }
    const started = startLabRun(paths, labRun[1], sessionId);
    if (!started.ok) {
      send(response, started.status, { error: started.code, message: started.message });
      return;
    }
    send(response, started.created ? 202 : 200, {
      run: publicRun(started.run),
      created: started.created,
      environment: "controlled_fault_injection",
    });
    return;
  }
  const jobMatch = /^\/api\/jobs\/(job_[0-9a-f-]{36})(\/report|\/runs)?$/i.exec(pathname);
  if (!jobMatch || !jobMatch[1]) {
    send(response, 404, { error: "not_found", message: "That page does not exist." });
    return;
  }
  const jobId = jobMatch[1];
  const suffix = jobMatch[2] ?? "";
  if (method === "GET" && suffix === "") {
    const detail = jobDetail(paths, jobId, sessionId);
    if (!detail) {
      send(response, 404, { error: "not_found", message: "That report job was not found." });
      return;
    }
    send(response, 200, detail);
    return;
  }
  if (method === "GET" && suffix === "/report") {
    sendReport(response, paths, jobId, sessionId);
    return;
  }
  if (method === "POST" && suffix === "/runs") {
    const started = startLiveRun(paths, jobId, sessionId);
    if (!started.ok) {
      send(response, started.status, { error: started.code, message: started.message });
      return;
    }
    send(response, started.created ? 202 : 200, {
      run: publicRun(started.run),
      created: started.created,
    });
    return;
  }
  send(response, 404, { error: "not_found", message: "That page does not exist." });
}

async function createSession(
  request: IncomingMessage,
  response: ServerResponse,
  paths: RunnerPaths,
  lab: boolean,
): Promise<void> {
  const existing = sessionFrom(request, paths);
  if (existing) {
    send(response, 200, sessionBody(paths, lab));
    return;
  }
  const invite = paths.env.NIGHTSHIFT_INVITE_CODE?.trim() ?? "";
  if (invite) {
    const body = await readJson(request).catch((error: unknown) => {
      replyInput(response, error);
      return null;
    });
    if (body === null) {
      return;
    }
    const supplied =
      body && typeof body === "object" && "invite" in body
        ? String((body as { invite: unknown }).invite)
        : "";
    if (!sameSecret(supplied, invite)) {
      send(response, 401, {
        error: "invite_required",
        message: "Enter the invite code for this server.",
      });
      return;
    }
  }
  const now = paths.clock.now();
  const hourAgo = new Date(now.getTime() - SESSION_WINDOW_MS).toISOString();
  if (
    countSessions(paths.database, null) >= MAX_SESSIONS ||
    countSessions(paths.database, hourAgo) >= MAX_SESSIONS_PER_HOUR
  ) {
    send(response, 429, {
      error: "session_limit",
      message: "This server is not accepting new sessions right now.",
    });
    return;
  }
  const id = `ses_${randomUUID()}`;
  insertSession(paths.database, id, now.toISOString());
  send(response, 201, sessionBody(paths, lab), sessionCookie(id, paths.env));
}

async function createReport(
  request: IncomingMessage,
  response: ServerResponse,
  paths: RunnerPaths,
  sessionId: string,
): Promise<void> {
  if (countOwnedJobs(paths.database, sessionId) >= MAX_JOBS_PER_SESSION) {
    send(response, 429, {
      error: "job_limit",
      message: "This session has reached its report limit.",
    });
    return;
  }
  let rows;
  try {
    rows = parseDataset(await readJson(request));
  } catch (error) {
    const status = isNightshiftError(error) && error.code === "payload_too_large" ? 413 : 400;
    const message = isNightshiftError(error) ? error.message : "The dataset could not be read.";
    send(response, status, {
      error: isNightshiftError(error) ? error.code : "invalid_input",
      message,
    });
    return;
  }
  const created = createJob(paths.database, rows, paths.clock, sessionId);
  if (created.generation === 0) {
    send(response, 400, { error: "invalid_input", message: "The dataset was not accepted." });
    return;
  }
  enqueueWorker(paths, created.jobId);
  send(response, 202, { job_id: created.jobId });
}

async function createLab(
  request: IncomingMessage,
  response: ServerResponse,
  paths: RunnerPaths,
  sessionId: string,
  lab: boolean,
): Promise<void> {
  if (!lab) {
    send(response, 404, { error: "not_found", message: "That page does not exist." });
    return;
  }
  const body = await readJson(request).catch((error: unknown) => {
    replyInput(response, error);
    return null;
  });
  if (body === null) {
    return;
  }
  const scenario =
    body && typeof body === "object" && "scenario" in body
      ? (body as { scenario: unknown }).scenario
      : "";
  if (scenario !== "expired_lease" && scenario !== "active_lease" && scenario !== "completed") {
    send(response, 400, { error: "invalid_input", message: "Choose a labelled lab scenario." });
    return;
  }
  const jobId = seedScenario(
    paths.database,
    paths.clock,
    paths.artifactDir,
    scenario as DemoScenario,
  );
  assignJob(paths.database, jobId, sessionId, 0);
  send(response, 202, {
    job_id: jobId,
    environment: "controlled_fault_injection",
    scenario,
  });
}

function jobDetail(
  paths: RunnerPaths,
  jobId: string,
  sessionId: string,
): Record<string, unknown> | null {
  const summary = jobSummary(paths, jobId);
  if (!summary || summary.owner_session_id !== sessionId) {
    return null;
  }
  const artifact = getArtifact(paths.database, jobId);
  const run = latestRun(paths.database, jobId);
  const checkpoint = latestCheckpoint(paths.database, jobId);
  const lease = observeLease(getLease(paths.database, jobId), paths.clock.now());
  return {
    job: publicJob(summary),
    worker: {
      lease_state: lease.lease_state,
      generation: lease.generation,
      step: checkpoint?.step ?? null,
    },
    checkpoints: listCheckpoints(paths.database, jobId).map((item) => ({
      step: item.step,
      created_at: item.created_at,
    })),
    attempts: listAttempts(paths.database, jobId).map((attempt) => ({
      kind: attempt.kind,
      outcome: attempt.outcome,
      created_at: attempt.created_at,
    })),
    errors: listErrors(paths.database, jobId)
      .slice(-10)
      .map((entry) => ({
        source: entry.source,
        message: String(redact(entry.message)).slice(0, 240),
      })),
    report: artifact
      ? {
          available: true,
          verified: summary.status === "completed",
          body: parseStoredJson(artifact.body_json),
        }
      : null,
    run: run ? publicRun(run) : null,
    live: readLiveGate(paths.env, paths.database),
    environment: summary.auto_finish === 0 ? "controlled_fault_injection" : "report",
  };
}

function jobSummary(paths: RunnerPaths, jobId: string): ReturnType<typeof getJob> {
  return getJob(paths.database, jobId);
}

function publicJob(job: NonNullable<ReturnType<typeof getJob>>): Record<string, unknown> {
  const parsed = parseStoredJson(job.input_json);
  const rows = parsed && typeof parsed === "object" && "length" in parsed ? parsed : [];
  return {
    id: job.id,
    status: job.status,
    input_hash: job.input_hash,
    escalation_reason: job.escalation_reason,
    row_count: Array.isArray(rows) ? rows.length : 0,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

function publicRun(run: NonNullable<ReturnType<typeof latestRun>>): Record<string, unknown> {
  return {
    id: run.id,
    status: run.status,
    reason: run.reason,
    decision_source: run.decision_source,
    model_calls: run.model_calls,
    tools: parseStoredJson(run.tools_json),
    trace: parseStoredJson(run.trace_json),
    rejections: parseStoredJson(run.rejections_json),
    neatlogs: run.neatlogs,
    trace_id: run.trace_id,
    usage: run.usage_json ? parseStoredJson(run.usage_json) : null,
    verification: run.verification_json ? parseStoredJson(run.verification_json) : null,
    local_record: true,
  };
}

function sendReport(
  response: ServerResponse,
  paths: RunnerPaths,
  jobId: string,
  sessionId: string,
): void {
  const job = getJob(paths.database, jobId);
  if (!job || job.owner_session_id !== sessionId) {
    send(response, 404, { error: "not_found", message: "That report job was not found." });
    return;
  }
  const artifact = getArtifact(paths.database, jobId);
  if (!artifact) {
    send(response, 404, {
      error: "report_not_ready",
      message: "The report has not been written yet.",
    });
    return;
  }
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-disposition": `attachment; filename="${jobId}.json"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(artifact.body_json);
}

function sessionBody(paths: RunnerPaths, lab: boolean): Record<string, unknown> {
  return {
    live: readLiveGate(paths.env, paths.database),
    lab,
  };
}

function sessionFrom(request: IncomingMessage, paths: RunnerPaths): string | null {
  const header = request.headers.cookie ?? "";
  const match = /(?:^|;\s*)ns_session=(ses_[0-9a-f-]{36})/i.exec(header);
  if (!match?.[1]) {
    return null;
  }
  return getSession(paths.database, match[1]) ? match[1] : null;
}

function sessionCookie(id: string, env: NodeJS.ProcessEnv): Record<string, string> {
  const parts = [`ns_session=${id}`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=604800"];
  if (env.NIGHTSHIFT_COOKIE_SECURE === "1") {
    parts.push("Secure");
  }
  return { "set-cookie": parts.join("; ") };
}

function replyInput(response: ServerResponse, error: unknown): void {
  const status = isNightshiftError(error) && error.code === "payload_too_large" ? 413 : 400;
  const message = isNightshiftError(error) ? error.message : "The dataset could not be read.";
  send(response, status, {
    error: isNightshiftError(error) ? error.code : "invalid_input",
    message,
  });
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const text = await readBody(request);
  if (!text) {
    return {};
  }
  try {
    return parseStoredJson(text);
  } catch {
    throw new NightshiftError("invalid_input", "Submit JSON, not another file type.");
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new NightshiftError("payload_too_large", "The upload is larger than 64KB.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function requestPath(value: string | undefined): string {
  const raw = value && value.length > 0 ? value : "/";
  const query = raw.indexOf("?");
  const path = query === -1 ? raw : raw.slice(0, query);
  return path.length > 0 ? path : "/";
}

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function send(
  response: ServerResponse,
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extra,
  });
  response.end(JSON.stringify(body));
}

function sendFile(response: ServerResponse, file: { file: string; type: string }): void {
  response.writeHead(200, {
    "content-type": file.type,
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'",
    "x-content-type-options": "nosniff",
  });
  createReadStream(join(PUBLIC_DIR, file.file)).pipe(response);
}
