# Nightshift interface

## Seesaw polish direction — October 12, 2026

The owner approved the focused landing/jobs/recovery-detail pass after reviewing Seesaw's Linear and Antimetal references. This is a local edit to the existing Node application; no Sites registration or hosting change. The prior app behavior and session-owned API remain authoritative.

The operator comes to recover an unfinished report and decide whether its deliverable can be trusted. Domain vocabulary: saved work, checkpoints, lease ownership, uncertain acknowledgement, reconciliation, escalation. The signature is a continuous saved-work/action/verification rail, with an uncertain action kept visible even when the artifact verifies. The landing hero uses the actual published Sonnet acknowledgement-loss record, labelled recorded/controlled. The workspace derives each rail from saved API observations, never from invented sample jobs.

Color world: daylight paper, blue-ink report receipts, a dark night-shift desk, pale-blue attention/focus, restrained amber uncertainty and green confirmed verification. Tokens: paper `#f5f8fb`, ink `#16334a`, signal `#2f789f`, workspace `#101a23`, raised workspace `#17232f`, pale blue `#bcd9e6`. Avenir Next remains the local primary font; monospace is reserved for identifiers and evidence. Body/control sizes 13–15px, metadata 11–12px, workspace headings 30–36px, landing display 64–80px. Four/eight-pixel spacing; dense 16px control zones and more open 24–32px outcome panels.

Landing hierarchy: left-aligned purpose/action, then a raised white report receipt over a blue-ink recovery panel. The receipt carries actual report totals and verification; source labels and the evidence link make the recorded state explicit. Jobs hierarchy: report identity, status, then quieter input/date metadata, with native search/filter controls and a truthful unverified state. Detail hierarchy: report outcome first, saved-work rail second, worker/agent/record/download panels after it. Shared tokens, quiet borders and restrained depth replace the orbit illustration and unrelated warm accents; no added motion or decorative metrics.

References: https://www.seesaw.website/websites/linear-v2 and https://www.seesaw.website/websites/antimetal-v3. Frontend-design guides the landing composition; interface-design guides density, hierarchy, states and shared patterns. Native links/buttons, 44px touch targets, visible focus and reduced motion continue to apply.

## Previous direction — October 11, 2026

The user requested a premium landing page and the main application pages, with permission to change the palette. This direction supersedes the original paper-and-verification-stamp workbench. The recovery product and its execution boundaries remain the same.

The audience is an operator investigating an unfinished report. The landing page explains that mission; the workspace leads with the report jobs and whether their outputs have been checked. The application stays connected to the existing session-owned API.

## Design guidance

Read the frontend-design, interface-design and better-ui guidance from the user-provided UI Skills catalog, alongside the installed Sites presentation guidance. No catalog installation or global agent-setting change was needed.

- https://www.ui-skills.com/skills/anthropics/frontend-design
- https://www.ui-skills.com/skills/dammyjay93/interface-design
- https://www.ui-skills.com/skills/jakubkrehel/better-ui

The workbench used interface-design and frontend-ui-engineering guidance. The current request explicitly adds a marketing surface.

## Visual system

Daylight and the night shift form the visual relationship: a pale landing surface opens into a dark operational workspace. The moon mark, checkpoint rings and final verification receipt connect the two. The hero is a code-native illustration explicitly labelled as an example. It does not replay an invented agent run.

| Role                  | Value   |
| --------------------- | ------- |
| Landing paper         | #f7f8f2 |
| Landing ink           | #152724 |
| Recovery illustration | #172e29 |
| Workspace canvas      | #141b1b |
| Workspace panel       | #1a2222 |
| Primary action        | #ce461e |
| Workspace text        | #eff0e8 |

Local Avenir/Avenir Next with a Segoe UI fallback carries headings and controls. Local monospace carries dataset JSON and evidence identifiers. Large display type leads the landing page; smaller type and quieter surfaces organize the workspace. There are no remote fonts or raster assets.

Styles are organized by actual concerns: shared controls/accessibility, landing layout/content/illustration, workspace navigation/overview, jobs, panels and report detail. UI primitives and icon geometry are shared in ui.js. Landing and workspace renderers are separate from the existing report actions and polling.

## Pages

| Route      | Purpose                                                                          |
| ---------- | -------------------------------------------------------------------------------- |
| #/         | Product introduction, recovery steps, verification contract and source           |
| #/desk     | Actual session counts, recent report jobs and environment availability           |
| #/jobs     | Job table, search by ID and filter by status                                     |
| #/new      | JSON input/file submission, supported fields and next steps                      |
| #/jobs/:id | Saved checkpoints, worker state, model availability, actions and report download |
| #/activity | Saved checkpoints and run observations for session-owned reports                 |
| #/settings | Read-only policy, model gate, configured budget and reserved call count          |
| #/lab      | Labelled fault tests, visible only when enabled by the server                    |

## Behavior and accessibility

The operator copy was tightened at the user's request. Overview uses a direct title and session counts; the promotional banner, repeated eyebrows, per-metric footnotes and sidebar slogans are removed. Input help focuses on supported fields and limits. Status, tool and trace labels are concise. Controlled tests, unknown usage, blocked actions and the estimate-based budget allowance remain explicit.

No sample jobs or fabricated outcomes populate the operator UI. Counts are calculated from the API response. Written reports remain unchecked until verified. Fault injection and deterministic checks remain labelled. Missing token usage and trace export are visible as unavailable/local, never zero-cost success.

Model access, spending approval, authorization and lease fencing remain server-owned. The environment page has no controls that can change these settings. Visiting the landing page does not create a session. Opening the workspace retains the existing invite gate and session ownership checks.

Native links, buttons, inputs, selects and table semantics provide keyboard behavior. Focus is visible; the skip link focuses the main region without changing the application route. Navigation identifies the current page. Filter counts and changing job status use live regions. Controls have at least 44px target height. Reduced motion removes transitions and press movement.

The desktop sidebar becomes a horizontal navigation strip on phones. Table overflow stays inside the table region; forms and report sections stack. Async page loads and job polling check the current route before writing into the page. Polling preserves focused controls and updates the status sentence separately from the job ID.
