# Nightshift UI validation

## October 11 baseline

The landing page and operator pages run in the existing local Node application. This session added no dependencies, model requests, sponsor spending, deployment, commits or pushes.

## Automated checks

- `npm test`: 36 tests passed, including public stylesheet/module delivery under the existing CSP, private-file protection, session ownership, input validation, budget refusal and recovery behavior.
- `npm run typecheck`: passed.
- `npm run format:check`: passed.
- `node --check` on app.js, ui.js, landing.js and workspace.js: passed.
- `git diff --check`: passed.

The first sandboxed test run passed 30 tests and failed six HTTP tests because localhost binding returned EPERM. Rerunning with local socket access passed all 36. The test fixtures do not spend a model budget.

## Browser checks

Used an isolated `data/local/ui-preview` database on localhost:8792, with an empty environment and controlled tests enabled. Existing production/demo credentials were not loaded.

- Landing page, section links, workspace navigation and the original session-owned report API render correctly.
- An invalid day displays `Row 0 has an invalid day` and stays on the form.
- The example creates a real report with two rows and 19 minutes. Its output is labelled written and unchecked; Start Nightshift stays disabled with the model-budget explanation.
- Search for an unknown ID shows no matching reports. Verified filtering excludes the unchecked report and includes the recovered fixture.
- An expired-lease controlled fixture resumes, verifies five rows and 120 minutes, and displays its actual saved repair/tool records. It is explicitly labelled deterministic, with zero model calls and local trace status.
- An active-lease controlled fixture escalates with `active_lease`, preserves the active hold and reports that no report file exists.
- Activity includes saved checkpoint timestamps and actual tool durations. Controlled test records are labelled.
- The environment page reads server policy and budget state; it cannot change permissions or spending.
- The keyboard skip link focuses `main` without changing the route. Native controls and current-page navigation remain available.
- Desktop checked at 1280px; mobile landing at 320px and 390px. The hero switches to one column without page overflow.
- The populated mobile overview initially exposed a positioned table-header label outside its scrolling region. Giving the table wrapper a positioning context fixed this. At 390px, page width is 390px and the table scrolls inside its own region. The table region is keyboard focusable.
- A polling selector initially targeted the job-ID paragraph after the redesign. It now targets the separate live status paragraph. Both successful recovery and active-worker escalation kept the job ID intact.

Sanitized screenshots are local and gitignored:

- `data/local/ui-preview/screenshots/landing-desktop.jpg`
- `data/local/ui-preview/screenshots/landing-mobile.jpg`
- `data/local/ui-preview/screenshots/workspace-desktop.jpg`

## Desloppify

Scanned only this project with the existing exclusions: node_modules, data, dist and coverage. `.desloppify/` remains gitignored. No authored code was excluded, no suppressions/wontfix decisions were added, and no subjective scores were imported.

Before implementation: `desloppify scan --path . --no-badge`, then `desloppify status` and `desloppify next`. After implementation: the same scan/status/next sequence. Final scans used `npm_config_offline=true` because the optional jscpd boilerplate detector exited with errors; that detector remains unverified. The built-in duplicate detector ran. TypeScript is the selected scanner language; browser JavaScript also received syntax and manual behavior checks.

An intermediate scan found two new stylesheet-size findings. Styles were separated by navigation, overview, jobs, panels, report detail, accessibility, landing content and recovery illustration responsibilities. The final scan cleared those two findings and the original app.css size finding.

| Score     | Before | Final |
| --------- | ------ | ----- |
| Overall   | 23.6   | 23.7  |
| Objective | 94.4   | 94.6  |
| Strict    | 22.1   | 22.1  |
| Verified  | 94.4   | 94.6  |

| Mechanical dimension | Health | Strict |
| -------------------- | ------ | ------ |
| Code quality         | 99.1   | 92.9   |
| Duplication          | 100.0  | 100.0  |
| File health          | 97.1   | 91.2   |
| Security             | 100.0  | 97.5   |
| Test health          | 84.7   | 71.7   |

All subjective dimensions are unassessed, represented by the scanner as 0.0. These are not completed review scores.

| Subjective dimension      | Scanner score | Assessment |
| ------------------------- | ------------- | ---------- |
| Abstraction fit           | 0.0           | Unassessed |
| AI generated debt         | 0.0           | Unassessed |
| API coherence             | 0.0           | Unassessed |
| Authorization consistency | 0.0           | Unassessed |
| Contracts                 | 0.0           | Unassessed |
| Convention drift          | 0.0           | Unassessed |
| Cross-module architecture | 0.0           | Unassessed |
| Dependency health         | 0.0           | Unassessed |
| Design coherence          | 0.0           | Unassessed |
| Error consistency         | 0.0           | Unassessed |
| High-level elegance       | 0.0           | Unassessed |
| Incomplete migration      | 0.0           | Unassessed |
| Initialization coupling   | 0.0           | Unassessed |
| Logic clarity             | 0.0           | Unassessed |
| Low-level elegance        | 0.0           | Unassessed |
| Mid-level elegance        | 0.0           | Unassessed |
| Naming quality            | 0.0           | Unassessed |
| Package organization      | 0.0           | Unassessed |
| Test strategy             | 0.0           | Unassessed |
| Type safety               | 0.0           | Unassessed |

The final scan has 30 open items: 20 assessment requests and 10 existing mechanical findings. Remaining mechanical findings concern large server/HTTP-test files, transitive-only coverage of four backend modules, and existing async/nested-closure/stub/magic-number heuristics. They were not expanded into an unrelated backend cleanup. `next` requests an initial subjective review. Full review and optional boilerplate detection remain incomplete.

This completes the requested local interface work. It does not complete the hackathon entry, deployment, video or submission.

## Follow-up: operator copy cleanup

Removed repeated headings, the overview promotional banner, per-metric footnotes, sidebar slogans and lengthy input instructions. Status/tool/trace labels and empty states are shorter. Input constraints, controlled-test attribution, verification results, blocked-action reasons and usage/export uncertainty remain visible. Budget language identifies an allocation enforced through estimated call reservations, rather than implying measured-dollar enforcement.

All 36 tests, type checks, formatting, frontend syntax checks and diff whitespace checks passed again. Browser review covered the compact overview, report input, existing verified recovery evidence and read-only budget page. A light canvas strip exposed by the shorter page was fixed with a full-height body. No live model call was made, and `.env` was not inspected or changed.

Scan/status/next were repeated on the same project. Scores and the 30 existing open items are unchanged from the tables above; optional jscpd remains unverified. Screenshot: `data/local/ui-preview/screenshots/workspace-copy-cleanup.jpg`.

## October 12 — Seesaw-informed polish

- Landing now uses a blue-ink recovery record and a white verification receipt. All five-row/120-minute/eight-call values match `evidence/runs/failed-ack-live.json`. Recorded/controlled labels and evidence links are visible; landing visits do not create sessions or model requests.
- Jobs have clearer type, full-ID tooltips, stronger status hierarchy, native filters/search and contained table scrolling. Search padding was corrected after visual review found icon/placeholder overlap.
- Detail pages show saved work, actual action outcome and verification separately. Uncertain acknowledgement remains visible when the report verifies. Failed/mismatched checks take precedence over completion flags. The historical escalated run is not shown as awaiting another repair. Report data uses native disclosure and retains its open/focus state during progress refreshes.
- Browser QA used isolated `data/local/ui-polish` on port 8794 with empty credentials, labelled deterministic checks and no model budget. A normal two-row/19-minute report stayed unchecked; an expired-lease fixture recovered and verified five rows/120 minutes. No model calls or sponsor credits. Search/no-results/status filter and report disclosure passed. Desktop 1280px, jobs 390px and landing/detail 320px layouts passed; page width matches the phone viewport and table overflow stays contained. Temporary viewport overrides were reset.
- Screenshots are local under `data/local/ui-polish/qa/`. The owned QA server was stopped; the already-stopped main server was restarted on localhost:8787 with saved configuration. Finished landing verified there. Backend endpoints, schema, budgets and repair controls unchanged.
- All **46 tests** pass, including five presentation-boundary checks. App typechecking, frontend syntax, formatter and diff checks pass. Same app-scoped Desloppify before/after remains overall/strict 23.7, objective/verified 94.7, 32 open findings. Twenty subjective dimensions remain unassessed; previous findings and offline jscpd limitation remain. No suppressions or score-target cleanup.
