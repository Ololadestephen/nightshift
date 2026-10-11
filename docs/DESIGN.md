# Nightshift interface

## Current direction — October 11, 2026

The user requested a premium landing page and the main application pages, with permission to change the palette. This direction supersedes the original paper-and-verification-stamp workbench. The recovery product and its execution boundaries remain the same.

The audience is an operator investigating an unfinished report. The landing page explains that mission; the workspace leads with the report jobs and whether their outputs have been checked. The application stays connected to the existing session-owned API.

## Design guidance

Read the frontend-design, interface-design and better-ui guidance from the user-provided UI Skills catalog, alongside the installed Sites presentation guidance. No catalog installation or global agent-setting change was needed.

- https://www.ui-skills.com/skills/anthropics/frontend-design
- https://www.ui-skills.com/skills/dammyjay93/interface-design
- https://www.ui-skills.com/skills/jakubkrehel/better-ui

The workbench's earlier use of interface-design and frontend-ui-engineering is recorded in hackathon.md. The current request explicitly adds a marketing surface.

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
