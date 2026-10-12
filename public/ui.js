const PATHS = {
  moon: '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/><path d="m17 3 .5 1.5L19 5l-1.5.5L17 7l-.5-1.5L15 5l1.5-.5Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  report:
    '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  settings:
    '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  code: '<path d="m8 5-6 7 6 7m8-14 6 7-6 7m-3-17-2 20"/>',
  external:
    '<path d="M13 3h8v8m0-8L10 14M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>',
  lab: '<path d="M9 3h6M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 14h8"/>',
};

export function icon(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.report}</svg>`;
}

export function node(tag, text = "", className = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

export function badge(status) {
  const labels = {
    completed: "Verified",
    verifying: "Awaiting verification",
    stalled: "Needs recovery",
    escalated: "Escalated",
    running: "Running",
    queued: "Queued",
    recovering: "Recovering",
  };
  const element = node("span", labels[status] || status, "badge");
  element.dataset.status = status;
  return element;
}

export function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function pageHeading(title, description, action = true) {
  const head = node("div", "", "page-heading");
  const copy = node("div");
  copy.append(node("h1", title));
  if (description) copy.append(node("p", description, "muted"));
  head.append(copy);
  if (action) {
    const link = node("a", "New report", "button");
    link.href = "#/new";
    link.insertAdjacentHTML("afterbegin", icon("plus"));
    head.append(link);
  }
  return head;
}

export function setShell(route, session) {
  const landing = route === "/";
  document.body.dataset.view = landing ? "landing" : "workspace";
  document.querySelector("#marketing-header").hidden = !landing;
  document.querySelector("#sidebar").hidden = landing;
  document.querySelector("#workspace-header").hidden = landing;
  document.querySelector("#lab-link").hidden = !session?.lab;
  const activeRoute = route.startsWith("/jobs/") ? "/jobs" : route;
  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.dataset.route === activeRoute;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector("#breadcrumb").textContent =
    {
      "/desk": "Overview",
      "/jobs": "Report jobs",
      "/new": "New report",
      "/activity": "Activity",
      "/settings": "Environment",
      "/lab": "Controlled tests",
    }[activeRoute] || "Workspace";
  document.title = landing
    ? "Nightshift — Unfinished work, handled."
    : `${document.querySelector("#breadcrumb").textContent} · Nightshift`;
  const live = session?.live?.available;
  document.querySelector("#model-state").textContent = live ? "Model available" : "Model paused";
  document.querySelector("#model-state").dataset.ready = Boolean(live);
}

/** Presentation follows observed outcomes, not the existence of a file. */
export function verificationState(detail) {
  const verification = detail.run?.verification;
  if (
    verification?.ok === false ||
    (Array.isArray(verification?.mismatches) && verification.mismatches.length > 0)
  ) {
    return "failed";
  }
  return detail.report?.verified === true ? "verified" : "pending";
}

export function recoveryStages(detail) {
  const checkpoints = Array.isArray(detail.checkpoints) ? detail.checkpoints : [];
  const checkpoint = checkpoints.at(-1)?.step || detail.worker?.step;
  const events = Array.isArray(detail.run?.trace) ? detail.run.trace : [];
  const repairs = events.filter((event) =>
    ["reclaim_expired_lease", "resume_job"].includes(event.name),
  );
  const uncertain = repairs.find((event) => event.output?.type === "uncertain");
  const lastRepair = repairs.at(-1);
  const checking = ["running", "queued"].includes(detail.run?.status);
  const verified = verificationState(detail);
  let action = { label: "Awaiting action", note: "No recovery action recorded.", state: "pending" };
  if (uncertain) {
    action = {
      label: "Acknowledgement uncertain",
      note: "The saved result must be inspected before repeating a repair.",
      state: "uncertain",
    };
  } else if (lastRepair?.output?.type === "rejected" || lastRepair?.output?.ok === false) {
    action = {
      label: "Action rejected",
      note: "The failure is kept in the record.",
      state: "failed",
    };
  } else if (lastRepair?.output?.type === "applied" || lastRepair?.output?.type === "replay") {
    action = {
      label: "Report resumed",
      note:
        detail.job?.status === "escalated"
          ? "Run escalated after resume."
          : "Continued from saved work.",
      state: "complete",
    };
  } else if (lastRepair?.output?.ok === true) {
    action = {
      label: "Lease reclaimed",
      note:
        detail.job?.status === "escalated"
          ? "Run escalated after reclaim."
          : "Waiting for the next supported action.",
      state: detail.job?.status === "escalated" ? "complete" : "active",
    };
  } else if (detail.job?.status === "escalated") {
    action = {
      label: "Escalated",
      note: "Run stopped. Review the saved evidence.",
      state: "failed",
    };
  } else if (checking) {
    action = {
      label: "Inspecting the report",
      note: "Nightshift is checking the saved evidence.",
      state: "active",
    };
  } else if (detail.report) {
    action = { label: "Report written", note: "No recovery action recorded.", state: "complete" };
  } else if (detail.worker?.lease_state === "active") {
    action = { label: "Worker active", note: "An active lease stays protected.", state: "active" };
  }
  const verification =
    verified === "verified"
      ? {
          label: "Report verified",
          note: "Original input and artifact checks passed.",
          state: "complete",
        }
      : verified === "failed"
        ? {
            label: "Verification failed",
            note: "Review the recorded verification result.",
            state: "failed",
          }
        : checking && detail.report
          ? {
              label: "Checking the report",
              note: "A written file is awaiting its result.",
              state: "active",
            }
          : {
              label: "Awaiting verification",
              note: "Completion requires a checked report.",
              state: "pending",
            };
  return [
    {
      title: "Saved work",
      label: checkpoint ? checkpoint.replaceAll("_", " ") : "No checkpoint yet",
      note: checkpoint ? "Checkpoint preserved." : "Work has not been saved yet.",
      state: checkpoint ? "complete" : "pending",
    },
    { title: "Action", ...action },
    { title: "Verification", ...verification },
  ];
}
