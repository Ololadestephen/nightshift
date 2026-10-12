import { icon, pageHeading, setShell, verificationState } from "./ui.js";
import { renderLanding } from "./landing.js";
import {
  renderOverview,
  renderJobs,
  renderActivity,
  renderSettings,
  renderRecoveryTimeline,
} from "./workspace.js";

const EXAMPLE = `{
  "rows": [
    { "day": "2026-10-08", "queue": "billing", "status": "closed", "minutes": 12 },
    { "day": "2026-10-09", "queue": "access", "status": "open", "minutes": 7 }
  ]
}`;

const TOOL_LABELS = {
  inspect_job: "Inspect job",
  inspect_worker: "Inspect worker",
  read_checkpoint: "Read checkpoint",
  read_recent_errors: "Read errors",
  reclaim_expired_lease: "Reclaim expired lease",
  resume_job: "Resume report",
  verify_artifact: "Verify report",
  escalate_incident: "Escalate",
  model_decision: "Model decision",
};

const main = document.querySelector("#main");
const labLink = document.querySelector("#lab-link");
let session = null;
let pollTimer = 0;
let shown = "";
let navigationVersion = 0;

document.querySelectorAll("[data-icon]").forEach((element) => {
  element.innerHTML = icon(element.dataset.icon);
});

window.addEventListener("hashchange", () => {
  void render();
});

document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});

void boot();

async function boot() {
  await render();
}

async function ensureSession() {
  if (session && !session.error) return true;
  session = await api("/api/session", { method: "POST", body: "{}" });
  if (!session || session.error) {
    if (session?.error === "invite_required") renderInvite();
    else {
      main.replaceChildren(el("h1", "Workspace unavailable"));
      showAlert(main, session?.message || "The server did not respond. Refresh to try again.");
    }
    return false;
  }
  return true;
}

function renderInvite() {
  main.replaceChildren();
  const form = document.createElement("form");
  form.className = "panel invite-panel";
  form.innerHTML = `
    <h1>Invite</h1>
    <p class="muted">Enter your invite code to open the workspace.</p>
    <div class="field">
      <label for="invite">Invite code</label>
      <input id="invite" name="invite" type="text" autocomplete="off" required />
    </div>
    <div id="form-alert"></div>
    <div class="actions"><button type="submit">Open Nightshift</button></div>
  `;
  main.append(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const alertBox = form.querySelector("#form-alert");
    const opened = await api("/api/session", {
      method: "POST",
      body: JSON.stringify({ invite: form.querySelector("#invite").value }),
    });
    if (!opened || opened.error) {
      showAlert(
        alertBox,
        opened && opened.message ? opened.message : "The invite was not accepted.",
      );
      return;
    }
    session = opened;
    if (session.lab) labLink.hidden = false;
    await render();
  });
}

function stopPolling() {
  window.clearInterval(pollTimer);
  pollTimer = 0;
}

function watchJob(jobId, detail) {
  if (!shouldPoll(detail)) {
    stopPolling();
    return;
  }
  if (pollTimer) {
    return;
  }
  pollTimer = window.setInterval(() => {
    void refreshJob(jobId);
  }, 1000);
}

async function render() {
  stopPolling();
  const version = ++navigationVersion;
  const route = location.hash.replace(/^#/, "") || "/";
  const section = ["/how-it-works", "/safety", "/evidence"].includes(route);
  setShell(section ? "/" : route, session);
  main.replaceChildren();
  if (route === "/" || section) {
    renderLanding(main);
    if (section) document.getElementById(route.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
    return;
  }
  main.append(el("p", "Loading your workspace…", "loading-note muted"));
  if (!(await ensureSession()) || version !== navigationVersion) return;
  setShell(route, session);
  main.replaceChildren();
  window.scrollTo(0, 0);
  if (route === "/settings") {
    const current = await api("/api/session", { method: "POST", body: "{}" });
    if (version !== navigationVersion) return;
    if (current?.error) {
      showAlert(main, current.message || "The environment could not be loaded.");
      return;
    }
    session = current;
    setShell(route, session);
    renderSettings(main, session);
    return;
  }
  if (route === "/new") {
    renderSubmit();
    return;
  }
  if (route === "/lab") {
    renderLab();
    return;
  }
  const job = /^\/jobs\/(job_[0-9a-f-]{36})$/i.exec(route);
  if (job) {
    await renderJob(job[1]);
    return;
  }
  if (!["/desk", "/jobs", "/activity"].includes(route)) {
    main.append(
      pageHeading("Page not found", "Return to your workspace to continue.", false),
      linkButton("Open overview", "#/desk"),
    );
    return;
  }
  const listed = await api("/api/jobs");
  if (version !== navigationVersion) return;
  if (listed?.error) {
    showAlert(main, listed.message || "The report jobs could not be loaded.");
    return;
  }
  const jobs = Array.isArray(listed?.jobs) ? listed.jobs : [];
  if (route === "/jobs") renderJobs(main, jobs);
  else if (route === "/activity") await renderActivity(main, jobs, api, TOOL_LABELS);
  else renderOverview(main, jobs, session);
}

function renderSubmit() {
  main.replaceChildren();
  main.append(pageHeading("Create a report job", "", false));
  const form = document.createElement("form");
  form.className = "panel submit-panel";
  form.innerHTML = `
    <div class="panel-heading"><h2>Report input</h2><span class="badge">JSON dataset</span></div>
    <p class="muted">Paste JSON or upload a file. Use non-sensitive data.</p>
    <div class="field">
      <label for="dataset">Dataset</label>
      <textarea id="dataset" name="dataset" required spellcheck="false" aria-describedby="dataset-help"></textarea>
      <p id="dataset-help" class="faint">Maximum 100 rows · 64KB.</p>
    </div>
    <div class="field">
      <label for="file">JSON file</label>
      <input id="file" name="file" type="file" accept="application/json,.json" />
    </div>
    <div id="form-alert"></div>
    <div class="actions">
      <button type="button" class="secondary" id="example">Use example</button>
      <button type="submit" id="create">Create a report job</button>
    </div>
  `;
  const layout = el("div", "", "submit-layout");
  const help = el("aside", "", "panel input-guide");
  help.innerHTML = `<div class="panel-heading"><h2>Supported fields</h2>${icon("report")}</div><div class="input-contract"><dl><dt>day</dt><dd>YYYY-MM-DD</dd><dt>queue</dt><dd>billing or access</dd><dt>status</dt><dd>open or closed</dd><dt>minutes</dt><dd>Whole number, 0–100,000</dd></dl></div>`;
  layout.append(form, help);
  main.append(layout);
  const dataset = form.querySelector("#dataset");
  const file = form.querySelector("#file");
  const alertBox = form.querySelector("#form-alert");
  form.querySelector("#example").addEventListener("click", () => {
    dataset.value = EXAMPLE;
    dataset.focus();
  });
  file.addEventListener("change", async () => {
    const chosen = file.files && file.files[0];
    if (!chosen) {
      return;
    }
    if (chosen.size > 65536) {
      showAlert(alertBox, "Choose a JSON file smaller than 64KB.");
      file.value = "";
      return;
    }
    try {
      dataset.value = await chosen.text();
    } catch {
      showAlert(alertBox, "The file could not be read. Choose it again or paste your JSON.");
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertBox.replaceChildren();
    const button = form.querySelector("#create");
    button.disabled = true;
    let body;
    try {
      body = JSON.parse(dataset.value);
    } catch {
      showAlert(alertBox, "That text is not JSON.");
      button.disabled = false;
      return;
    }
    const created = await api("/api/jobs", { method: "POST", body: JSON.stringify(body) });
    button.disabled = false;
    if (!created || created.error) {
      showAlert(
        alertBox,
        created && created.message ? created.message : "The job was not created.",
      );
      return;
    }
    location.hash = `#/jobs/${created.job_id}`;
  });
}

function renderLab() {
  main.replaceChildren();
  if (!session || !session.lab) {
    main.append(
      el("h1", "Labelled tests are off"),
      el("p", "This server does not expose fault injection."),
    );
    return;
  }
  const wrap = el("div");
  wrap.className = "panel lab-panel";
  main.append(
    pageHeading("Controlled tests", "Non-production scenarios · deterministic checker.", false),
  );
  wrap.append(
    el("h2", "Controlled faults"),
    el("p", "Choose a controlled test scenario.", "muted"),
  );
  const actions = el("div", "", "actions");
  for (const scenario of ["expired_lease", "active_lease", "completed"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = scenario.replaceAll("_", " ");
    button.addEventListener("click", async () => {
      button.disabled = true;
      const created = await api("/api/lab/jobs", {
        method: "POST",
        body: JSON.stringify({ scenario }),
      });
      button.disabled = false;
      if (created && created.job_id) {
        location.hash = `#/jobs/${created.job_id}`;
      } else showAlert(wrap, created?.message || "The test job could not be created.");
    });
    actions.append(button);
  }
  wrap.append(actions);
  main.append(wrap);
}

async function renderJob(jobId) {
  const detail = await api(`/api/jobs/${jobId}`);
  if (location.hash !== `#/jobs/${jobId}`) return;
  main.replaceChildren();
  if (!detail || detail.error) {
    main.append(el("h1", "Job not found"), el("p", "This session does not have that report."));
    return;
  }
  const back = el("a", "Back to report jobs", "detail-breadcrumb text-link");
  back.href = "#/jobs";
  main.append(back);
  const head = el("div", "", "job-head");
  const stamp = el("div", stampLabel(detail), "stamp");
  stamp.dataset.state = stampState(detail);
  const copy = el("div");
  copy.append(
    el("p", detail.job.id, "mono faint job-id"),
    el("h1", "Queue activity report"),
    el("p", sentence(detail), "lede"),
  );
  copy.querySelector(".lede").id = "status-line";
  copy.querySelector(".lede").setAttribute("aria-live", "polite");
  head.append(stamp, copy);
  const grid = el("div", "", "detail-grid");
  grid.append(
    renderRecoveryTimeline(detail),
    workerSection(detail),
    agentSection(detail),
    recordSection(detail),
    reportSection(detail, jobId),
  );
  main.append(head, grid);
  shown = signature(detail);
  watchJob(jobId, detail);
}

async function refreshJob(jobId) {
  if (location.hash !== `#/jobs/${jobId}`) {
    stopPolling();
    return;
  }
  const activeId = document.activeElement && document.activeElement.id;
  const reportOpen = main.querySelector(".report-data")?.open === true;
  const detail = await api(`/api/jobs/${jobId}`);
  if (location.hash !== `#/jobs/${jobId}`) return;
  if (!detail || detail.error) {
    return;
  }
  const next = signature(detail);
  if (next === shown) {
    watchJob(jobId, detail);
    return;
  }
  shown = next;
  const stamp = main.querySelector(".stamp");
  const line = document.querySelector("#status-line");
  if (stamp) {
    stamp.textContent = stampLabel(detail);
    stamp.dataset.state = stampState(detail);
  }
  if (line) {
    line.textContent = sentence(detail);
  }
  const fresh = el("div");
  fresh.append(
    renderRecoveryTimeline(detail),
    workerSection(detail),
    agentSection(detail),
    recordSection(detail),
    reportSection(detail, jobId),
  );
  main.querySelector(".detail-grid")?.replaceChildren(...fresh.children);
  if (reportOpen && main.querySelector(".report-data")) {
    main.querySelector(".report-data").open = true;
  }
  if (activeId) {
    const restored = document.getElementById(activeId);
    if (restored) restored.focus();
  }
  watchJob(jobId, detail);
}

function workerSection(detail) {
  const section = el("section");
  section.append(el("h2", "Worker"));
  section.className = "panel detail-panel";
  const step =
    detail.worker && detail.worker.step ? detail.worker.step.replaceAll("_", " ") : "not started";
  const lease = detail.worker ? detail.worker.lease_state : "missing";
  section.append(el("p", `Checkpoint: ${step}. Lease: ${lease}.`, "muted"));
  const steps = Array.isArray(detail.checkpoints) ? detail.checkpoints : [];
  if (steps.length > 0) {
    const list = el("ol", "", "record");
    for (const item of steps) {
      list.append(el("li", item.step.replaceAll("_", " ")));
    }
    section.append(list);
  }
  return section;
}

function agentSection(detail) {
  const section = el("section");
  section.append(el("h2", "Nightshift"));
  section.className = "panel detail-panel";
  if (detail.environment === "controlled_fault_injection") {
    section.append(el("p", "Controlled test · deterministic checker.", "muted"));
    const button = document.createElement("button");
    button.type = "button";
    button.id = "start-lab";
    button.className = "secondary";
    button.textContent = "Run labelled check";
    const running =
      detail.run && (detail.run.status === "running" || detail.run.status === "queued");
    const terminal = detail.job.status === "completed" || detail.job.status === "escalated";
    button.disabled = running || terminal;
    button.addEventListener("click", async () => {
      button.disabled = true;
      watchJob(detail.job.id, { job: detail.job, run: { status: "running" } });
      const started = await api(`/api/lab/jobs/${detail.job.id}/runs`, {
        method: "POST",
        body: "{}",
      });
      if (started && started.error) {
        section.append(el("p", started.message, "alert"));
      }
      await refreshJob(detail.job.id);
    });
    section.append(button);
    appendRunLine(section, detail);
    return section;
  }
  const live = detail.live ||
    (session && session.live) || { available: false, reason: "live_budget_unavailable" };
  const note = el("p", live.available ? "Live model ready." : liveReason(live.reason), "muted");
  note.id = "live-note";
  section.append(note);
  const button = document.createElement("button");
  button.type = "button";
  button.id = "start-nightshift";
  button.textContent = "Start Nightshift";
  const running = detail.run && (detail.run.status === "running" || detail.run.status === "queued");
  const terminal = detail.job.status === "completed" || detail.job.status === "escalated";
  const workerBusy = detail.worker.lease_state === "active" && detail.job.status === "running";
  button.disabled = !live.available || running || terminal || workerBusy;
  button.addEventListener("click", async () => {
    button.disabled = true;
    watchJob(detail.job.id, { job: detail.job, run: { status: "running" } });
    const started = await api(`/api/jobs/${detail.job.id}/runs`, { method: "POST", body: "{}" });
    if (started && started.error) {
      note.textContent = started.message;
    }
    await refreshJob(detail.job.id);
  });
  section.append(button);
  appendRunLine(section, detail);
  return section;
}

function appendRunLine(section, detail) {
  if (!detail.run) {
    return;
  }
  const open = detail.run.status === "running" || detail.run.status === "queued";
  const usage = detail.run.usage
    ? formatUsage(detail.run.usage)
    : open
      ? "Token counts appear when the model responds"
      : "Model usage unavailable";
  section.append(
    el(
      "p",
      `Run ${detail.run.status}${detail.run.reason ? `: ${detail.run.reason}` : ""}. Model calls: ${detail.run.model_calls}. ${usage}.`,
      "faint",
    ),
  );
}

function recordSection(detail) {
  const section = el("section");
  section.append(el("h2", "What happened"));
  section.className = "panel detail-panel timeline-panel";
  const list = el("ol", "", "record");
  const attempts = Array.isArray(detail.attempts) ? detail.attempts : [];
  for (const attempt of attempts) {
    list.append(el("li", `${attempt.kind.replaceAll("_", " ")}: ${attempt.outcome}.`));
  }
  const events = detail.run && Array.isArray(detail.run.trace) ? detail.run.trace : [];
  if (attempts.length === 0 && events.length === 0) {
    list.append(el("li", "No actions yet.", "muted"));
  }
  for (const event of events) {
    const label = TOOL_LABELS[event.name] || event.name;
    const usage = event.usage ? ` · ${formatUsage(event.usage)}` : "";
    const item = el("li", `${label} · ${event.duration_ms} ms${usage}`);
    list.append(item);
  }
  section.append(list);
  section.append(traceNote(detail.run));
  return section;
}

function reportSection(detail, jobId) {
  const section = el("section");
  section.append(el("h2", "Report"));
  section.className = "panel detail-panel report-panel";
  if (!detail.report) {
    section.append(el("p", "Report not ready.", "muted"));
    return section;
  }
  const body = detail.report.body || {};
  const checked = verificationState(detail) === "verified";
  section.append(
    el(
      "p",
      `${checked ? "Verified" : "Unchecked"} · ${body.row_count ?? "?"} rows · ${body.total_minutes ?? "?"} minutes.`,
    ),
  );
  const verification = detail.run && detail.run.verification;
  if (
    verification &&
    Array.isArray(verification.mismatches) &&
    verification.mismatches.length > 0
  ) {
    section.append(el("p", `Mismatches: ${verification.mismatches.join(", ")}.`, "alert"));
  } else if (checked) {
    section.append(el("p", "Input, identity, totals and artifact checks passed.", "muted"));
  }
  const download = linkButton("Download report", `/api/jobs/${jobId}/report`, "secondary");
  download.setAttribute("download", `${jobId}.json`);
  section.append(download);
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(body, null, 2);
  const data = document.createElement("details");
  data.className = "report-data";
  const toggle = el("summary", "View report data");
  toggle.id = "report-data-toggle";
  data.append(toggle, pre);
  section.append(data);
  return section;
}

function traceNote(run) {
  if (!run) {
    return el("p", "No trace yet.", "faint");
  }
  if (run.neatlogs === "exported" && run.trace_id) {
    return el("p", `neatlogs trace: ${run.trace_id}`, "faint");
  }
  if (run.neatlogs === "export_failed") {
    return el("p", "Trace export failed. Saved locally.", "faint");
  }
  if (run.neatlogs === "disabled_missing_api_key") {
    return el("p", "Local trace · export disabled.", "faint");
  }
  if (run.status === "running" || run.status === "queued") {
    return el("p", "Trace appears when the check finishes.", "faint");
  }
  return el("p", "Trace ID unavailable.", "faint");
}

function stampLabel(detail) {
  const state = stampState(detail);
  if (state === "verified") return "Verified";
  if (verificationState(detail) === "failed") return "Check failed";
  if (state === "escalated") return "Stopped";
  if (state === "checking") return "Checking";
  if (state === "working") return "Writing";
  if (detail.report) return "Unchecked";
  return "Waiting";
}

function stampState(detail) {
  const checked = verificationState(detail);
  if (checked === "failed") return "escalated";
  if (checked === "verified") return "verified";
  if (detail.job.status === "escalated") return "escalated";
  if (detail.run && (detail.run.status === "running" || detail.run.status === "queued")) {
    return "checking";
  }
  if (detail.job.status === "running" || detail.job.status === "queued") return "working";
  return "waiting";
}

function sentence(detail) {
  if (verificationState(detail) === "failed") {
    return "Verification failed. Review the recorded mismatches.";
  }
  if (verificationState(detail) === "verified") {
    return "Verified against the submitted dataset.";
  }
  if (detail.job.status === "escalated") {
    return `Escalated${detail.job.escalation_reason ? `: ${detail.job.escalation_reason}` : "."}`;
  }
  if (detail.run && (detail.run.status === "running" || detail.run.status === "queued")) {
    return "Nightshift is checking this report.";
  }
  if (detail.job.status === "running" && detail.worker.lease_state === "active") {
    return "Worker active. Recovery is blocked.";
  }
  if (detail.job.status === "verifying") {
    return "Awaiting verification.";
  }
  if (detail.worker.lease_state === "expired") {
    return "Interrupted before completion.";
  }
  return "Waiting for a safe next step.";
}

function signature(detail) {
  const run = detail.run || {};
  const trace = Array.isArray(run.trace) ? run.trace.length : 0;
  return [
    detail.job.status,
    detail.job.escalation_reason,
    detail.worker.step,
    detail.worker.lease_state,
    run.status,
    run.reason,
    run.model_calls,
    trace,
    detail.report ? detail.report.verified : false,
  ].join("|");
}

function shouldPoll(detail) {
  if (!detail || !detail.job) return false;
  if (detail.job.status === "completed" || detail.job.status === "escalated") {
    const runStatus = detail.run && detail.run.status;
    return runStatus === "running" || runStatus === "queued";
  }
  return true;
}

function liveReason(reason) {
  if (reason === "budget_cap") return "Model call allowance exhausted.";
  return "Configure model access and an approved budget to enable live runs.";
}

function formatUsage(usage) {
  const prompt =
    usage.prompt_tokens === null || usage.prompt_tokens === undefined
      ? "unavailable"
      : usage.prompt_tokens;
  const completion =
    usage.completion_tokens === null || usage.completion_tokens === undefined
      ? "unavailable"
      : usage.completion_tokens;
  return `Tokens: ${prompt} in / ${completion} out`;
}

function showAlert(container, message) {
  const box = el("div", message, "alert");
  box.setAttribute("role", "alert");
  container.replaceChildren(box);
}

function linkButton(text, href, className) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.className = className ? `button ${className}` : "button";
  anchor.textContent = text;
  return anchor;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function api(path, options = {}, retry = true) {
  try {
    const response = await fetch(path, {
      method: options.method || "GET",
      headers: { "content-type": "application/json" },
      body: options.body,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : { error: "empty", message: "Empty response." };
    if (response.status === 401 && retry && path !== "/api/session") {
      const opened = await api("/api/session", { method: "POST", body: "{}" }, false);
      if (opened && !opened.error) {
        session = opened;
        if (session.lab) labLink.hidden = false;
        return api(path, options, false);
      }
    }
    return body;
  } catch {
    return { error: "network", message: "The server did not respond." };
  }
}
