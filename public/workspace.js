import { badge, formatDate, icon, node, pageHeading, recoveryStages } from "./ui.js";

export function renderOverview(main, jobs, session) {
  main.append(pageHeading("Overview", "Reports in this session."));
  const summary = node("div", "", "summary-grid");
  for (const [label, count, symbol] of [
    ["Report jobs", jobs.length, "report"],
    [
      "Pending",
      jobs.filter((job) => !["completed", "escalated"].includes(job.status)).length,
      "clock",
    ],
    ["Verified reports", jobs.filter((job) => job.status === "completed").length, "shield"],
  ]) {
    const card = node("div", "", "summary-card");
    card.innerHTML = `<span class="summary-label">${label}${icon(symbol)}</span>`;
    card.append(node("strong", String(count)));
    summary.append(card);
  }
  main.append(summary);
  const columns = node("div", "", "overview-columns");
  const recent = node("div", "", "panel");
  const head = node("div", "", "panel-heading");
  head.innerHTML = '<h2>Recent reports</h2><a class="text-link" href="#/jobs">View all</a>';
  recent.append(
    head,
    jobs.length
      ? jobTable(jobs.slice(0, 5))
      : emptyState(
          "No reports yet",
          "Create a report from a JSON dataset.",
          "Create report",
          "#/new",
        ),
  );
  const side = node("aside", "", "panel readiness-panel");
  side.innerHTML = `<div class="panel-heading"><h2>Environment</h2>${icon("shield")}</div><div class="readiness-status"><span class="status-dot"></span> Controlled environment</div><div class="readiness-item"><span>Checkpoints</span><strong>Enabled</strong></div><div class="readiness-item"><span>Active leases</span><strong>Protected</strong></div><div class="readiness-item"><span>Live model</span><strong>${session?.live?.available ? "Available" : "Paused"}</strong></div><a class="text-link" href="#/settings">View settings ${icon("arrow")}</a>`;
  columns.append(recent, side);
  main.append(columns);
}

export function renderJobs(main, jobs) {
  main.append(pageHeading("Report jobs", "Reports in this session."));
  const panel = node("div", "", "panel jobs-panel");
  const toolbar = node("div", "", "table-toolbar");
  toolbar.innerHTML = `<div class="search-field">${icon("search")}<label class="sr-only" for="job-search">Search report jobs</label><input id="job-search" type="search" placeholder="Search by job ID…" /></div><label class="sr-only" for="job-status">Filter by status</label><select id="job-status"><option value="all">All statuses</option><option value="completed">Verified</option><option value="verifying">Awaiting verification</option><option value="stalled">Needs recovery</option><option value="running">Running</option><option value="recovering">Recovering</option><option value="queued">Queued</option><option value="escalated">Escalated</option></select>`;
  const results = node("div");
  const count = node("p", "", "table-count faint");
  count.setAttribute("aria-live", "polite");
  function filter() {
    const query = toolbar.querySelector("input").value.toLowerCase().trim();
    const status = toolbar.querySelector("select").value;
    const selected = jobs.filter(
      (job) => job.id.toLowerCase().includes(query) && (status === "all" || job.status === status),
    );
    count.textContent = `${selected.length} of ${jobs.length} report jobs`;
    results.replaceChildren(
      selected.length
        ? jobTable(selected)
        : emptyState(
            jobs.length ? "No matching reports" : "No reports yet",
            jobs.length ? "Try another ID or status." : "Create a report from a JSON dataset.",
            jobs.length ? null : "Create report",
            "#/new",
          ),
    );
  }
  toolbar.querySelector("input").addEventListener("input", filter);
  toolbar.querySelector("select").addEventListener("change", filter);
  panel.append(toolbar, results, count);
  main.append(panel);
  filter();
}

function jobTable(jobs) {
  const wrapper = node("div", "", "table-scroll");
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "Report job table");
  const table = node("table", "", "jobs-table");
  table.innerHTML =
    '<caption class="sr-only">Report jobs in this session</caption><thead><tr><th scope="col">Report</th><th scope="col">Status</th><th scope="col" class="numeric">Input rows</th><th scope="col">Created</th><th scope="col"><span class="sr-only">Open</span></th></tr></thead>';
  const body = node("tbody");
  for (const job of jobs) {
    const row = node("tr");
    const name = node("td");
    const link = node("a", "", "job-link");
    link.href = `#/jobs/${job.id}`;
    link.title = job.id;
    link.innerHTML = `<span class="file-icon">${icon("report")}</span>`;
    const copy = node("span");
    copy.append(
      node("strong", "Queue activity report"),
      node("span", `${job.id.slice(0, 12)}…${job.id.slice(-6)}`, "mono faint"),
    );
    link.append(copy);
    name.append(link);
    const status = node("td");
    status.append(badge(job.status));
    const end = node("td");
    const open = node("a", "", "row-open");
    open.href = link.href;
    open.setAttribute("aria-label", `Open report ${job.id}`);
    open.innerHTML = icon("arrow");
    end.append(open);
    row.append(
      name,
      status,
      node("td", String(job.row_count), "numeric"),
      node("td", formatDate(job.created_at), "faint"),
      end,
    );
    body.append(row);
  }
  table.append(body);
  wrapper.append(table);
  return wrapper;
}

export function renderRecoveryTimeline(detail) {
  const section = node("section", "", "panel recovery-path");
  const head = node("div", "", "recovery-path-heading");
  head.append(node("h2", "Recovery path"), node("p", "From the saved record", "faint"));
  const list = node("ol", "", "recovery-stages");
  for (const stage of recoveryStages(detail)) {
    const item = node("li", "", "recovery-stage");
    item.dataset.state = stage.state;
    const mark = node("span", "", "stage-mark");
    mark.innerHTML = icon(
      stage.state === "complete" ? "check" : stage.state === "uncertain" ? "clock" : "activity",
    );
    const copy = node("div", "", "stage-copy");
    copy.append(
      node("span", stage.title, "stage-title"),
      node("strong", stage.label),
      node("p", stage.note),
    );
    item.append(mark, copy);
    list.append(item);
  }
  section.append(head, list);
  return section;
}

export async function renderActivity(main, jobs, api, toolLabels) {
  main.append(pageHeading("Activity", "Checkpoints and run history.", false));
  const panel = node("div", "", "panel");
  main.append(panel);
  if (!jobs.length) {
    panel.append(
      emptyState("No activity yet", "Create a report to get started.", "Create report", "#/new"),
    );
    return;
  }
  panel.append(node("p", "Loading the saved record…", "loading-note muted"));
  const details = await Promise.all(jobs.map((job) => api(`/api/jobs/${job.id}`)));
  if (location.hash !== "#/activity") return;
  panel.replaceChildren();
  const failed = details.filter((detail) => !detail || detail.error).length;
  if (failed)
    panel.append(
      node("p", `${failed} report record(s) could not be loaded. Refresh to try again.`, "alert"),
    );
  for (const detail of details) {
    if (!detail || detail.error) continue;
    const group = node("div", "", "activity-group");
    const link = node("a", detail.job.id, "mono activity-job");
    link.href = `#/jobs/${detail.job.id}`;
    group.append(link, badge(detail.job.status));
    if (detail.environment === "controlled_fault_injection") {
      group.append(node("p", "Controlled test · deterministic checker", "faint"));
    }
    const list = node("ol", "", "record");
    for (const entry of detail.checkpoints || []) {
      const item = node("li");
      item.append(
        node("strong", entry.step.replaceAll("_", " ")),
        node("span", formatDate(entry.created_at), "faint"),
      );
      list.append(item);
    }
    for (const event of detail.run?.trace || []) {
      const item = node("li");
      item.append(
        node("strong", toolLabels[event.name] || event.name),
        node(
          "span",
          typeof event.duration_ms === "number"
            ? `${event.duration_ms} ms`
            : "Duration unavailable",
          "faint",
        ),
      );
      list.append(item);
    }
    if (!list.children.length) list.append(node("li", "No saved actions yet.", "muted"));
    group.append(list);
    panel.append(group);
  }
}

export function renderSettings(main, session) {
  main.append(pageHeading("Environment", "Execution policy and model budget.", false));
  const live = session?.live || {};
  const panel = node("div", "", "panel settings-panel");
  panel.innerHTML = `<div class="panel-heading"><h2>${icon("shield")} Execution policy</h2><span class="badge">Server enforced</span></div>`;
  for (const [label, value, description] of [
    ["Environment", "Controlled reports", "Repairs are limited to this pipeline."],
    ["Active leases", "Protected", "Active workers cannot be reclaimed."],
    ["Recovery", "From checkpoints", "Original inputs and completed steps are preserved."],
    ["Completion", "Verified report", "The output must match the submitted dataset."],
    ["Access", "This session", "Only your session’s reports are shown."],
  ])
    panel.append(settingRow(label, value, description));
  main.append(panel);
  const model = node("div", "", "panel settings-panel");
  model.innerHTML = '<div class="panel-heading"><h2>Live model budget</h2></div>';
  model.append(
    settingRow(
      "Availability",
      live.available ? "Ready" : "Paused",
      live.reason === "budget_cap"
        ? "Call allowance exhausted."
        : live.available
          ? "Live runs are enabled."
          : "Model access and budget approval are required.",
    ),
  );
  model.append(
    settingRow(
      "Budget allocation",
      live.cap_usd == null ? "Not configured" : `$${live.cap_usd}`,
      "Call allowance uses the estimate below, not actual billing.",
    ),
  );
  model.append(
    settingRow(
      "Estimated cost per call",
      live.usd_per_call == null ? "Not configured" : `$${live.usd_per_call}`,
      "Server-configured estimate.",
    ),
  );
  model.append(
    settingRow(
      "Reserved calls",
      String(live.calls_used ?? 0),
      live.calls_allowed == null
        ? "No approved allowance."
        : `${live.calls_allowed} calls allowed.`,
    ),
  );
  main.append(model);
  const note = node("div", "", "policy-note");
  note.innerHTML = `${icon("settings")}<p>Read-only. Update settings on the server.</p>`;
  main.append(note);
}

function settingRow(label, value, description) {
  const row = node("div", "", "setting-row");
  const copy = node("div");
  copy.append(node("h3", label), node("p", description, "faint"));
  row.append(copy, node("strong", value));
  return row;
}

function emptyState(title, description, action, href) {
  const empty = node("div", "", "empty-state");
  empty.innerHTML = `<span class="empty-icon">${icon("report")}</span>`;
  empty.append(node("h3", title), node("p", description, "muted"));
  if (action) {
    const link = node("a", action, "button secondary");
    link.href = href;
    empty.append(link);
  }
  return empty;
}
