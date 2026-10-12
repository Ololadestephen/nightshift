import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startApp } from "../src/app/server.js";
import type { DecisionInput, ModelClient } from "../src/controller.js";
const ROWS = {
  rows: [
    { day: "2026-10-08", queue: "billing", status: "closed", minutes: 12 },
    { day: "2026-10-09", queue: "access", status: "open", minutes: 7 },
  ],
};
test("submission validates input, writes the report, and keeps sessions apart", async () => {
  await withApp({}, undefined, async (base) => {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /New report/);
    const script = await fetch(`${base}/app.js`);
    assert.match(await script.text(), /Create a report job/);
    for (const path of [
      "ui.js",
      "landing.js",
      "workspace.js",
      "landing.css",
      "workspace.css",
      "styles/accessibility.css",
      "styles/recovery-illustration.css",
      "styles/landing-content.css",
      "styles/navigation.css",
      "styles/overview.css",
      "styles/panels.css",
      "styles/jobs.css",
      "styles/report.css",
    ]) {
      const asset = await fetch(`${base}/${path}`);
      assert.equal(asset.status, 200);
      assert.match(
        asset.headers.get("content-type") ?? "",
        path.endsWith(".js") ? /javascript/ : /text\/css/,
      );
      assert.match(asset.headers.get("content-security-policy") ?? "", /script-src 'self'/);
    }
    for (const path of [".env", "src/app/server.ts", "data/local/nightshift.sqlite"]) {
      const privateFile = await fetch(`${base}/${path}`);
      assert.equal(privateFile.status, 401);
    }
    const opened = await session(base);
    assert.equal(opened.status, 201);
    const rejected = await call(base, "/api/jobs", opened.cookie, {
      method: "POST",
      body: JSON.stringify({
        rows: [{ day: "yesterday", queue: "billing", status: "open", minutes: 1 }],
      }),
    });
    assert.equal(rejected.status, 400);
    const listed = await call(base, "/api/jobs", opened.cookie);
    assert.deepEqual(record(listed.body).jobs, []);
    const remote = await call(base, "/api/jobs", opened.cookie, {
      method: "POST",
      body: JSON.stringify({ path: "/tmp/events.json", command: "cat" }),
    });
    assert.equal(remote.status, 400);
    const jobId = await createJob(base, opened.cookie, ROWS);
    const detail = await waitJob(base, opened.cookie, jobId, "verifying");
    const job = record(detail.job);
    assert.equal(job.row_count, 2);
    const steps = detail.checkpoints as {
      step: string;
    }[];
    assert.ok(steps.some((item) => item.step === "artifact_written"));
    const report = record(detail.report);
    assert.equal(report.verified, false);
    const body = record(report.body);
    assert.equal(body.total_minutes, independentMinutes(ROWS.rows));
    assert.equal(body.row_count, ROWS.rows.length);
    const again = await call(base, `/api/jobs/${jobId}`, opened.cookie);
    assert.equal(record(record(again.body).job).input_hash, job.input_hash);
    const downloaded = await call(base, `/api/jobs/${jobId}/report`, opened.cookie);
    assert.equal(downloaded.status, 200);
    assert.ok((downloaded.headers.get("content-disposition") ?? "").includes(jobId));
    assert.equal(record(downloaded.body).total_minutes, 19);
    const blocked = await call(base, `/api/jobs/${jobId}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(blocked.status, 403);
    assert.equal(record(blocked.body).error, "live_budget_unavailable");
    const still = await call(base, `/api/jobs/${jobId}`, opened.cookie);
    assert.equal(record(record(still.body).job).status, "verifying");
    const other = await session(base);
    const hidden = await call(base, `/api/jobs/${jobId}`, other.cookie);
    assert.equal(hidden.status, 404);
    const hiddenReport = await call(base, `/api/jobs/${jobId}/report`, other.cookie);
    assert.equal(hiddenReport.status, 404);
    const lab = await call(base, "/api/lab/jobs", opened.cookie, {
      method: "POST",
      body: JSON.stringify({ scenario: "expired_lease" }),
    });
    assert.equal(lab.status, 404);
  });
});
test("an injected model verifies once and a repeat start does not spend again", async () => {
  const calls = { n: 0 };
  await withApp(liveEnv(), verifyingModel(calls), async (base) => {
    const opened = await session(base);
    const jobId = await createJob(base, opened.cookie, ROWS);
    await waitJob(base, opened.cookie, jobId, "verifying");
    const started = await call(base, `/api/jobs/${jobId}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(started.status, 202);
    assert.equal(record(started.body).created, true);
    const done = await waitJob(base, opened.cookie, jobId, "completed");
    const run = record(done.run);
    assert.equal(run.model_calls, 2);
    assert.equal(run.decision_source, "model");
    assert.equal(record(done.report).verified, true);
    assert.equal(record(record(done.report).body).total_minutes, 19);
    const usage = record(run.usage);
    assert.equal(usage.prompt_tokens, 6);
    assert.equal(usage.completion_tokens, null);
    assert.equal(run.neatlogs, "disabled_missing_api_key");
    const names = (
      run.trace as {
        name: string;
        duration_ms: number;
      }[]
    ).map((event) => event.name);
    assert.ok(names.includes("model_decision"));
    assert.ok(names.includes("inspect_job"));
    assert.ok(names.includes("verify_artifact"));
    for (const event of run.trace as {
      duration_ms: number;
    }[]) {
      assert.equal(typeof event.duration_ms, "number");
    }
    const repeat = await call(base, `/api/jobs/${jobId}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(repeat.status, 200);
    assert.equal(record(repeat.body).created, false);
    assert.equal(record(record(repeat.body).run).id, run.id);
    assert.equal(calls.n, 2);
  });
});
test("a second click during a run and a second job share one model call", async () => {
  let release = (): void => undefined;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls = { n: 0 };
  const model: ModelClient = {
    source: "model",
    measuredUsage: null,
    async decide(input: DecisionInput): Promise<unknown> {
      calls.n += 1;
      if (calls.n === 1) {
        await hold;
      }
      this.measuredUsage = null;
      return decisionFor(input);
    },
  };
  const root = mkdtempSync(join(tmpdir(), "nightshift-http-"));
  const app = await startApp({ root, env: liveEnv("4", "1"), port: 0, model });
  try {
    const opened = await session(app.url);
    const first = await createJob(app.url, opened.cookie, ROWS);
    const second = await createJob(app.url, opened.cookie, {
      rows: [{ day: "2026-10-11", queue: "billing", status: "open", minutes: 4 }],
    });
    await waitJob(app.url, opened.cookie, first, "verifying");
    await waitJob(app.url, opened.cookie, second, "verifying");
    const started = await call(app.url, `/api/jobs/${first}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(started.status, 202);
    await waitUntil(() => calls.n === 1);
    const duplicate = await call(app.url, `/api/jobs/${first}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(duplicate.status, 200);
    assert.equal(record(duplicate.body).created, false);
    assert.equal(record(record(duplicate.body).run).id, record(record(started.body).run).id);
    const busy = await call(app.url, `/api/jobs/${second}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(busy.status, 409);
    assert.equal(record(busy.body).error, "concurrency_limit");
    assert.equal(calls.n, 1);
    release();
    await waitJob(app.url, opened.cookie, first, "completed");
    assert.equal(calls.n, 2);
  } finally {
    release();
    await app.close();
  }
});
test("restart keeps the finished job and does not open another run", async () => {
  const calls = { n: 0 };
  const root = mkdtempSync(join(tmpdir(), "nightshift-http-"));
  const env = liveEnv();
  const first = await startApp({ root, env, port: 0, model: verifyingModel(calls) });
  let cookie = "";
  let jobId = "";
  let hash = "";
  try {
    const opened = await session(first.url);
    cookie = opened.cookie;
    jobId = await createJob(first.url, cookie, ROWS);
    await waitJob(first.url, cookie, jobId, "verifying");
    await call(first.url, `/api/jobs/${jobId}/runs`, cookie, { method: "POST", body: "{}" });
    const done = await waitJob(first.url, cookie, jobId, "completed");
    hash = String(record(done.job).input_hash);
  } finally {
    await first.close();
  }
  const second = await startApp({ root, env, port: 0, model: verifyingModel(calls) });
  try {
    const detail = await call(second.url, `/api/jobs/${jobId}`, cookie);
    assert.equal(detail.status, 200);
    assert.equal(record(record(detail.body).job).status, "completed");
    assert.equal(record(record(detail.body).job).input_hash, hash);
    const repeat = await call(second.url, `/api/jobs/${jobId}/runs`, cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(repeat.status, 200);
    assert.equal(record(repeat.body).created, false);
    assert.equal(calls.n, 2);
  } finally {
    await second.close();
  }
});
test("budget, invalid model output, public access, size, and labelled faults stay explicit", async () => {
  const calls = { n: 0 };
  await withApp(liveEnv("2", "1"), verifyingModel(calls), async (base) => {
    const opened = await session(base);
    const first = await createJob(base, opened.cookie, ROWS);
    await waitJob(base, opened.cookie, first, "verifying");
    await call(base, `/api/jobs/${first}/runs`, opened.cookie, { method: "POST", body: "{}" });
    await waitJob(base, opened.cookie, first, "completed");
    const second = await createJob(base, opened.cookie, {
      rows: [{ day: "2026-10-11", queue: "access", status: "closed", minutes: 3 }],
    });
    await waitJob(base, opened.cookie, second, "verifying");
    const capped = await call(base, `/api/jobs/${second}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(capped.status, 403);
    assert.equal(record(capped.body).error, "budget_cap");
    const after = await call(base, `/api/jobs/${second}`, opened.cookie);
    assert.equal(record(record(after.body).job).status, "verifying");
    assert.equal(calls.n, 2);
  });
  const invalidCalls = { n: 0 };
  const invalid: ModelClient = {
    source: "model",
    measuredUsage: null,
    async decide(): Promise<unknown> {
      invalidCalls.n += 1;
      this.measuredUsage = null;
      return await Promise.resolve({ tool: "not-a-tool", rationale: "no", arguments: {} });
    },
  };
  await withApp(liveEnv("4", "1"), invalid, async (base) => {
    const opened = await session(base);
    const jobId = await createJob(base, opened.cookie, ROWS);
    await waitJob(base, opened.cookie, jobId, "verifying");
    const started = await call(base, `/api/jobs/${jobId}/runs`, opened.cookie, {
      method: "POST",
      body: "{}",
    });
    assert.equal(started.status, 202);
    const stopped = await waitJob(base, opened.cookie, jobId, "escalated");
    assert.equal(record(stopped.job).escalation_reason, "invalid_model_output");
    assert.equal(invalidCalls.n, 2);
  });
  await withApp(
    { VERCEL: "1", NIGHTSHIFT_COOKIE_SECURE: "1", NIGHTSHIFT_INVITE_CODE: "legacy-unused" },
    undefined,
    async (base) => {
      const response = await fetch(`${base}/api/session`, { method: "POST" });
      assert.equal(response.status, 201);
      const cookie = response.headers.get("set-cookie") ?? "";
      assert.match(cookie, /^ns_session=/);
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /Secure/);
      const script = await (await fetch(`${base}/app.js`)).text();
      assert.doesNotMatch(script, /invite_required|renderInvite/);
    },
  );
  await withApp({}, undefined, async (base) => {
    const opened = await session(base);
    const oversized = await fetch(`${base}/api/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: opened.cookie },
      body: JSON.stringify({ note: "x".repeat(70000) }),
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(oversized.status, 413);
  });
  const throwing: ModelClient = {
    source: "model",
    measuredUsage: null,
    decide(): Promise<unknown> {
      throw new Error("live model must not run for an active labelled lease");
    },
  };
  await withApp(
    liveEnv(),
    throwing,
    async (base) => {
      const opened = await session(base);
      const created = await call(base, "/api/lab/jobs", opened.cookie, {
        method: "POST",
        body: JSON.stringify({ scenario: "active_lease" }),
      });
      assert.equal(created.status, 404);
    },
    false,
  );
  await withApp(
    {},
    undefined,
    async (base) => {
      const opened = await session(base);
      const created = await call(base, "/api/lab/jobs", opened.cookie, {
        method: "POST",
        body: JSON.stringify({ scenario: "active_lease" }),
      });
      assert.equal(created.status, 202);
      assert.equal(record(created.body).environment, "controlled_fault_injection");
      const jobId = String(record(created.body).job_id);
      const detail = await call(base, `/api/jobs/${jobId}`, opened.cookie);
      assert.equal(record(detail.body).environment, "controlled_fault_injection");
      const live = await call(base, `/api/jobs/${jobId}/runs`, opened.cookie, {
        method: "POST",
        body: "{}",
      });
      assert.equal(live.status, 409);
      assert.equal(record(live.body).error, "worker_active");
      const labelled = await call(base, `/api/lab/jobs/${jobId}/runs`, opened.cookie, {
        method: "POST",
        body: "{}",
      });
      assert.equal(labelled.status, 202);
      const stopped = await waitJob(base, opened.cookie, jobId, "escalated");
      assert.equal(record(stopped.job).escalation_reason, "active_lease");
      const finished = await call(base, "/api/lab/jobs", opened.cookie, {
        method: "POST",
        body: JSON.stringify({ scenario: "expired_lease" }),
      });
      const stalledId = String(record(finished.body).job_id);
      await call(base, `/api/lab/jobs/${stalledId}/runs`, opened.cookie, {
        method: "POST",
        body: "{}",
      });
      const recovered = await waitJob(base, opened.cookie, stalledId, "completed");
      assert.equal(record(record(recovered.report).body).total_minutes, 120);
      assert.equal(record(recovered.run).decision_source, "deterministic_controller");
    },
    true,
  );
});
test("new sessions stop after the hourly cap", async () => {
  await withApp({}, undefined, async (base) => {
    for (let index = 0; index < 30; index += 1) {
      const opened = await session(base);
      assert.equal(opened.status, 201);
    }
    const blocked = await session(base);
    assert.equal(blocked.status, 429);
    assert.equal(record(blocked.body).error, "session_limit");
  });
});
function liveEnv(cap = "4", perCall = "1"): NodeJS.ProcessEnv {
  return {
    LITELLM_API_KEY: "test-key-not-sent",
    NIGHTSHIFT_SPEND_APPROVED: "1",
    NIGHTSHIFT_MODEL_BUDGET_USD: cap,
    NIGHTSHIFT_USD_PER_CALL: perCall,
  };
}
function verifyingModel(calls: { n: number }): ModelClient {
  return {
    source: "model",
    measuredUsage: null,
    async decide(input: DecisionInput): Promise<unknown> {
      calls.n += 1;
      this.measuredUsage = { prompt_tokens: 3, completion_tokens: null, total_tokens: null };
      return decisionFor(input);
    },
  };
}
function decisionFor(input: DecisionInput): unknown {
  const status = input.memory.job?.status;
  if (status === "verifying" || status === "completed") {
    return {
      tool: "verify_artifact",
      arguments: { job_id: input.jobId },
      rationale: "The report is written and should be checked.",
    };
  }
  return {
    tool: "inspect_job",
    arguments: { job_id: input.jobId },
    rationale: "Read whether the report is already written.",
  };
}
function independentMinutes(
  rows: {
    minutes: number;
  }[],
): number {
  let total = 0;
  for (const row of rows) {
    total += row.minutes;
  }
  return total;
}
async function withApp(
  env: NodeJS.ProcessEnv,
  model: ModelClient | undefined,
  run: (base: string) => Promise<void>,
  lab = false,
): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "nightshift-http-"));
  const app = await startApp({
    root,
    env,
    port: 0,
    lab,
    ...(model ? { model } : {}),
  });
  try {
    await run(app.url);
  } finally {
    await app.close();
  }
}
interface SessionResponse {
  status: number;
  cookie: string;
  body: unknown;
}
interface ApiResponse {
  status: number;
  body: unknown;
  headers: Headers;
}
async function session(base: string): Promise<SessionResponse> {
  const response = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const body: unknown = await response.json();
  const match = /ns_session=[^;]+/.exec(response.headers.get("set-cookie") ?? "");
  return { status: response.status, cookie: match?.[0] ?? "", body };
}
async function call(
  base: string,
  path: string,
  cookie: string,
  init?: {
    method?: string;
    body?: string;
  },
): Promise<ApiResponse> {
  const request: RequestInit = {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json", cookie },
  };
  if (init?.body !== undefined) {
    request.body = init.body;
  }
  const response = await fetch(`${base}${path}`, request);
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? (JSON.parse(text) as unknown) : null,
  };
}
async function createJob(base: string, cookie: string, payload: unknown): Promise<string> {
  const response = await call(base, "/api/jobs", cookie, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 202, JSON.stringify(response.body));
  return String(record(response.body).job_id);
}
async function waitJob(
  base: string,
  cookie: string,
  jobId: string,
  status: string,
): Promise<Record<string, unknown>> {
  let last = "";
  let lastBody: Record<string, unknown> = {};
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await call(base, `/api/jobs/${jobId}`, cookie);
    const body = record(response.body);
    lastBody = body;
    const job = record(body.job);
    last = String(job.status);
    if (last === status) {
      return body;
    }
    await delay(30);
  }
  throw new Error(
    `job stayed ${last}, expected ${status}: ${JSON.stringify(lastBody.job)} ${JSON.stringify(lastBody.run)}`,
  );
}
async function waitUntil(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (ready()) {
      return;
    }
    await delay(20);
  }
  throw new Error("condition was not reached");
}
function record(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
