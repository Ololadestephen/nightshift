# Nightshift neatHack build record

## Project

Nightshift investigates stalled report-generation jobs, executes bounded repairs, resumes unfinished work and verifies the deliverable in a controlled environment.

## Team

Founder confirmed registration; public team name and publishing details not yet supplied. No teammates or handles are invented.

## Stack

Local TypeScript/Node 25 service using built-in `node:sqlite`, the `neatlogs` 1.1.28 package, and the `openai` 6.49.0 package. `npm run serve` hosts the workbench and the report worker in one process. Live model runs stay off until `NIGHTSHIFT_SPEND_APPROVED=1`, a server-side LiteLLM key, and both `NIGHTSHIFT_MODEL_BUDGET_USD` and `NIGHTSHIFT_USD_PER_CALL` are set. `npm run demo:recover` uses the deterministic controller. `npm run demo:model` can call LiteLLM when spend is approved; one Sonnet run has verified a controlled job. neatlogs spans wrap the live model and tool calls. Entire CLI checkpoints on `main` are recorded below. cfo.ai has an assumption-only Nightshift model; no card was entered by the agent. The workbench has not been deployed.

## Build log

### 2026-10-10 — product lock and handoff

- User selected Nightshift for neatHack, separately from Mosaic/TestSprite S4.
- Prepared concept, bounded report-job recovery mission, architecture, build plan, safety/quality instructions and event checklist.
- Confirmed the destination was empty before copying documents.
- No application code, dependencies, credentials, account actions, model calls, traces, deployment, Git repository, commits or pushes created.
- Desloppify scan deferred for documentation-only work; first scan required once meaningful code exists.
- Official rules reviewed at https://neatlogs.com/hackathon; final Discord cutoff, web check-in and sponsor access still pending.

### 2026-10-10 — sponsor gate and first recovery loop

- Sponsor access checked by name only. `NEATLOGS_API_KEY`, `NEATLOGS_TOKEN`, `LITELLM_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AWS_ACCESS_KEY_ID`, `CFO_API_KEY`, `ENTIRE_API_KEY`, and `NIGHTSHIFT_SPEND_APPROVED` are unset. Web check-in was not completed. No card was entered for cfo.ai. No model spend was approved.
- Runtime: Node v25.7.0, npm 11.10.1. Installed `neatlogs` 1.1.28 and `openai` 6.49.0. `npm audit` reports 14 vulnerabilities (10 moderate, 4 high). They were not force-fixed.
- neatlogs local doctor passed (`neatlogs.doctor/v2`, SDK 1.1.28, four fixture spans, trace `bf29f799ac932b41a9a0ad7476c3f2e7`). That is the doctor's fixture, not a Nightshift workflow trace. Probe and export were not run because no API key is present.
- Entire CLI 0.11.4 enabled with `ENTIRE_NO_AUTO_UPDATE=1 ENTIRE_TELEMETRY_OPTOUT=1 entire enable --init-repo --skip-initial-commit --agent cursor --skip-push-sessions --telemetry=false`. Status: enabled on `main`, Cursor hooks present, automatic checkpoint pushing disabled. Git has 0 commits and no remote. This session started before the hooks, so no Entire checkpoint exists. No login, history import, commit, or push.
- `npx tsc --noEmit` passed. `npm test` passed 22 tests. `npm run demo:recover` completed job `job_57ce70d9-ad1e-426b-8890-2201e5dd45ec`: decision source `deterministic_controller`, tools inspect/reclaim/resume/verify, repairs 2, model calls 7, input hash `9885468a60767576c2a11b36c700f07206b0448cf3b63a54142556b35ed1e42f`, 5 rows, 120 minutes. neatlogs delivery `disabled_missing_api_key`. Local journal only: `data/local/traces/job_57ce70d9-ad1e-426b-8890-2201e5dd45ec.json` (gitignored).
- Uniqueness in this slice: SQLite `UNIQUE` on operation id and on `(job_id, pipeline_version)` for artifacts; lease compare-and-swap on generation plus expiry; checkpoint unique per job and step. A crash after the database commit and before the file rename leaves a missing file that the next publish rewrites from the stored body. This is not exactly-once execution outside the process.
- Desloppify scanned with `desloppify scan --path . --no-badge`. Excludes: `node_modules`, `data`, `dist`, `coverage`. Result: objective 100.0, verified 100.0, overall 25.0, strict 22.7. Open mechanical findings: none. Twenty subjective dimensions are unassessed and scored as 0. No review scores were invented, no subagents were spawned, and no branch or commit was created.
- Mosaic was not opened or modified. The entry is not complete.

### 2026-10-10 — handoff/status review

- Read `START_HERE.md` and all referenced project instructions, planning, architecture and evidence records. Inspected the source tree and controller/model boundary without modifying application code.
- Re-ran `npm test`: all 22 tests passed. Re-ran `npm run typecheck`: passed.
- `git status --short` shows the project files are untracked; `git log -1 --oneline` confirms no commits on `main`; `git remote -v` returns no remote.
- Rechecked https://neatlogs.com/hackathon: neatlogs, Entire and cfo.ai remain mandatory. Planned submission window remains October 12, 14:30–19:25 WAT; final cutoff requires Discord confirmation.
- The plan's opening statement that no code exists is stale. README and the first recovery-loop record reflect the implemented local slice. Sponsor/account status is taken from that record, not a new authenticated account inspection.
- The demo's `model_calls` counter counts controller decisions even when `decision_source` is `deterministic_controller`; the recorded seven calls are not evidence of seven live LLM requests.
- No implementation, installation, account change, model spend, deployment, commit, push or submission performed in this review. Desloppify execution skipped for documentation-only work.

### 2026-10-10 — keys present, model spend still closed

- `.env` contains `NEATLOGS_API_KEY` and `LITELLM_API_KEY`. `NIGHTSHIFT_SPEND_APPROVED` is absent, so the LiteLLM client was not called.
- Desloppify scan before the change: objective 100.0, strict 22.7, 20 subjective dimensions unassessed. Imported three review findings, then fixed them: the CLI now loads `.env` without overriding existing variables or logging values; model tool schemas come from the policy argument list; exported workflow output includes the decision source. `npm test` passed 23 tests. Rescan: objective 100.0, verified 100.0, strict 22.7. No dimension scores were invented. No branch or commit.
- `npm run demo:recover` completed job `job_b1b3bc44-441d-4080-be7a-1f632e8a8148` with decision source `deterministic_controller`, verified 120 minutes, and neatlogs status `exported`.
- `npm run demo:model` exited 2 for job `job_2ed6cb03-cdbb-42ab-a0a1-047e00a44e98`: outcome `blocked`, reason `spend_not_approved`, job left `stalled`, no tools executed. The `model_calls` value 1 counts the refused decision, not a live model request. Its neatlogs status was also `exported`.

### 2026-10-10 — approved model attempts

- `NIGHTSHIFT_SPEND_APPROVED=1` was present. Model name `claude-haiku` through the LiteLLM base URL. No key values were recorded.
- First live run, job `job_36a86d54-d5fe-4497-b7c3-d6ed61120ade`: 6 model calls, tools `inspect_job`, `inspect_job`, `read_checkpoint`, `inspect_job`, then `invalid_model_output`. Job escalated. neatlogs `exported`.
- The tool descriptions and observation payload were expanded, and rejected decision codes are now kept on the run. A strict tool schema was tried and removed after the gateway became slow. Elapsed budget moved from 60 seconds to 180 seconds.
- Second live run, job `job_5a92a484-319e-4751-ac70-8dfafc761bb2`: three `inspect_job` calls, then `budget_elapsed`. Job escalated. neatlogs `exported`.
- Third live run, job `job_40d77074-76a6-4e73-ab97-1c70c3d31ad0`: eight `inspect_job` calls, zero rejections, then `budget_steps`. Job escalated. neatlogs `exported`. No further model calls were made.
- `npm test` passed 23 tests after these changes. Desloppify objective dipped to 99.9 on a complexity finding in `src/model.ts`, then returned to 100.0 after that function was split. Strict remains 22.7 because 20 subjective dimensions are unscored. No commit.

### 2026-10-10 — Sonnet recovery

- `NIGHTSHIFT_MODEL` is `claude-sonnet-4.6`. One probe with the job already observed still returned `inspect_job`. The model request now offers only observations that are still missing, then the legal repair.
- Job `job_89165069-ee50-4412-a193-17c49d737eef`: Sonnet inspected, reclaimed, and escalated with `lease_is_active_cannot_safely_reclaim`. The catalog treated the new lease as active and offered only escalation. That ordering was fixed so a successful reclaim offers `resume_job`. neatlogs `exported`.
- Job `job_e0dfd0b5-ffd9-4836-b9d8-6bd82569d485`: decision source `model`, outcome `completed`, reason `verified`, 120 minutes, 7 model calls, 2 repairs, 0 corrections. Tools were inspect job, inspect worker, read checkpoint, read errors, reclaim, resume, and verify. neatlogs `exported`. `npm test` passed 23 tests. Desloppify objective 100.0, strict 22.7, with 20 subjective dimensions still unscored.

### 2026-10-10 — first public commit

- Committed `b267311` on `main` and pushed it to https://github.com/Ololadestephen/nightshift. `.env`, local databases, and Entire metadata stayed untracked.
- `entire checkpoint list` reports 0 checkpoints on `main`. This chat started before the Cursor hooks, so the commit has source history and no agent checkpoint.

### 2026-10-10 — live model call count

- This session started after the Cursor Entire hooks. `model_calls` now increments only after a client whose source is `model` returns a decision. The deterministic controller reports 0. A `spend_not_approved` refusal reports 0 because the client stops before a request. The model-call budget still stops the loop before another request, and a one-call cap reports `model_calls` 1.
- No LiteLLM call was made. cfo.ai was not signed up and no payment details were entered. `.env` was not printed or committed.
- Prettier left `src/agent.ts`, `tests/agent.test.ts`, and `tests/cli.test.ts` unchanged. `npm run typecheck` passed. `npm test` passed 23 tests.
- Desloppify before the change: objective 100.0, verified 100.0, overall 25.0, strict 22.7. After: objective 100.0, verified 100.0, overall 25.0, strict 22.8. Test-health strict moved from 81.9 to 82.0. Twenty subjective dimensions remain unassessed. `next` asks for that review; no scores were invented and no subagents were spawned.
- `entire checkpoint list` is run after this change is pushed.

### 2026-10-10 — Entire checkpoint list after f4ed811

- Pushed `f4ed811` to `origin/main` (`https://github.com/Ololadestephen/nightshift`).
- `entire checkpoint list` printed:

```
  branch       main
  checkpoints  0

No checkpoints found on this branch.
Checkpoints will appear here after you save changes during an agent session.
```

- The list is still empty. No second commit was made.

### 2026-10-10 — cfo.ai assumption model

- Used the existing signed-in cfo.ai workspace. No new account, no payment details, and no LiteLLM call. `.env` was not printed or committed.
- Asked Ari to build a 12-month model for Nightshift from labeled assumptions only. Ari saved three pages and a separate Scenario named Higher price. Main stayed at the baseline price.
- Source chat: https://app.cfo.ai/stephen-cfoai-12753144/chat/a1ab855b-b0d4-4b81-a474-2c51f7e46b46
- Pages: Nightshift — Assumptions `2ac31a36-c6d7-4264-880d-d20de2d99a85`; Nightshift — Monthly baseline `b1537945-194b-4a61-ae09-8d99f2e3780a`; Nightshift — Scenario comparison `4b07d4b9-8ac7-4a13-8f21-60138ec92a44`. Higher price scenario id `4ff8a7f0-e9f8-4583-a7c7-984adf3df060`.
- Assumptions, all labeled and not actuals: price 49 USD per paid run on Main and 79 USD on Higher price; paid runs 0 in November 2026 and 20 per month from December 2026 through October 2027; model cost 0.15 USD per paid run; infrastructure 25 USD per month; starting cash 0. No customers, contracts, payroll, taxes, churn, financing, or collections delay. Revenue is price times paid runs. Cash in equals that revenue. Cash out equals model cost plus infrastructure.
- Main monthly sheet, November 2026 through October 2027: November ending cash -25 USD; each later month adds 952 USD; October ending cash 10,447 USD. Twelve-month assumed revenue 10,780 USD. Twelve-month assumed total cost 333 USD.
- Higher price changes only price. Paid runs, model cost, and infrastructure match Main. December revenue is 1,580 USD and each later operating result is 1,552 USD. October ending cash 17,047 USD. Twelve-month assumed revenue 17,380 USD. Twelve-month assumed total cost stays 333 USD. Variance versus Main is 6,600 USD of assumed revenue and October cash.
- Runway is 0 funded months in both cases because November ending cash is negative. Later positive cash does not remove that gap. No financing was added.
- Sanitized spreadsheet exports, with no account email, card data, or tokens: `evidence/cfo/nightshift-main-monthly.xlsx`, `evidence/cfo/nightshift-higher-price-monthly.xlsx`, and `evidence/cfo/nightshift-scenario-comparison.xlsx`. The comparison workbook's Model inputs sheet also shows months outside November 2026–October 2027, including infrastructure in October 2026 and in November–December 2027. Those months are outside the requested horizon. The summary metrics and the two monthly sheets are the 12-month forecast.
- `entire checkpoint list` is run after this change is pushed.

### 2026-10-10 — Entire checkpoint list after f63e6fd

- Pushed `f63e6fd` to `origin/main`.
- `entire checkpoint list` printed:

```
  branch       main
  checkpoints  2

● 01M4KTYJRB6QACT0GFAP5DCW2E  "Continue Nightshift from origin/main. I have registered f..."
  10-10 22:19 (f63e6fd) Save the cfo.ai assumption model for Nightshift.

● 01M4KSYQCJZJ7SJ5GDWBMN9T3A  "so what's next?"
  10-10 22:01 (339cb90) Record that Entire still has no checkpoint after f4ed811.
```

- These are Entire agent checkpoints, not Nightshift job checkpoints. The earlier `f4ed811` list remains 0.

### 2026-10-10 — live traces and a fresh recovery

- neatlogs spans now wrap the provider call and each tool execution. The post-run replay of stored outputs is gone. The local journal records `duration_ms` for each call. Token usage is copied from the provider usage field; a missing field stays null.
- A new invocation adopts the active lease when the job is already `recovering` and the holder is `nightshift-worker`, then resumes. A running job with an active lease still escalates.
- A thrown tool error and an unexpected model error escalate the job and keep a terminal trace. A trace-init failure still returns the recovery result with `export_failed`.
- After the four observations, the model is offered one legal repair. README, `docs/ARCHITECTURE.md`, and this file's status sections now match the cfo.ai export and the Entire checkpoints. The operator UI, public demo, and video remain open.
- `npx tsc --noEmit` passed. `npm test` passed 27 tests. Prettier wrote `src/agent.ts` and `src/trace.ts`.
- Desloppify before the change: objective 100.0, overall 25.0, strict 22.8. A return-type brace briefly flagged `async_no_await` in `src/trace.ts` and dropped objective to 99.9; a named `Traced<T>` type cleared it. After: objective 100.0, verified 100.0, overall 25.0, strict 22.8. Test-health strict is 82.7. Twenty subjective dimensions remain unassessed. `next` asks for that review; no scores were invented and no subagents were spawned.
- `entire checkpoint list` still reports 3 checkpoints on `main`: `01M4KV0MVX5CM0ZADJNZP1AMEW` on `bb56112`, `01M4KTYJRB6QACT0GFAP5DCW2E` on `f63e6fd`, and `01M4KSYQCJZJ7SJ5GDWBMN9T3A` on `339cb90`. This change is uncommitted, so it has no new checkpoint. No LiteLLM call was made. `.env` was not printed or committed.

### 2026-10-10 — local workbench

- Read `AGENTS.md`, `START_HERE.md`, `PLAN.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/EVENT_AND_SUBMISSION.md`, and this file before editing. The recovery engine, one recorded Sonnet run, the cfo.ai assumption export, and the three Entire checkpoints on `main` were left in place.
- UI skills were loaded with `npx ui-skills start`, `categories`, `list --category frontend`, and `get`. Used `dammyjay93/interface-design` and `addyosmani/frontend-ui-engineering`. No landing-page skill and no catalog install. The choices are in `docs/DESIGN.md`.
- `npm run serve` now serves the workbench from the same process as the worker. A session cookie owns jobs. JSON submission stores a normalized snapshot and hash. The worker writes the report. Nightshift does not check it until a run starts, and a live run is refused until both budget numbers are set. There is no deterministic fallback on that path. `NIGHTSHIFT_LAB=1` is the labelled fault surface.
- `npx tsc --noEmit` passed. `npm test` passed 36 tests, including HTTP tests against the server, an independent minute sum, and a version-1 database migration. Prettier was run. No LiteLLM call was made. `.env` was not printed.
- Browser check on `http://127.0.0.1:8791` with a clean environment and the lab flag: invalid day stayed on the form with “Row 0 has an invalid day”; a custom 15-minute and 4-minute submission produced a report of 19 minutes and stayed unchecked; Start Nightshift stayed disabled with the budget explanation; reload kept the same job; the labelled check on an expired hold verified the fixture report (120 minutes) and showed Verified. A 390px-wide layout did not overflow. The automation Tab key did not move focus; the controls are native and the focus rule is in the stylesheet.
- Desloppify scan of this project only, excludes `node_modules`, `data`, `dist`, `coverage`. Before this application work the recorded scan was objective 100.0, overall 25.0, strict 22.8. After: objective 94.4, verified 94.4, overall 23.6, strict 22.1. Test-health strict is 71.6. Twenty subjective dimensions remain unassessed. `next` asks for that review. No scores were invented and no subagents were spawned. Remaining mechanical findings: `src/app/server.ts` and `tests/http.test.ts` are large; `public/app.css` is one stylesheet; four app modules are marked transitive-only even though the HTTP tests exercise them; a few smell hits remain (`nested_closure`, `stub_function` on `send`, `SESSION_WINDOW_MS`, and `async_no_await` on a test helper that does await).
- This work is uncommitted, so Entire has no new checkpoint. The three checkpoints on `main` are unchanged. No deploy, push, or submission.

### 2026-10-11 — landing page and operator pages

- User authorized a premium landing page and main application pages, including a palette change. Read the supplied UI Skills catalog's frontend-design, interface-design and better-ui guidance and the installed Sites/Desloppify instructions. No subagents or global skill installations.
- Built a pale landing page with a labelled recovery illustration, workflow, verification contract and integration context. The dark workspace now has an overview, searchable/filterable jobs, report submission, report detail, activity, a read-only environment page and the existing gated controlled tests. Operator counts and records come from the session-owned API. No invented customers, outcomes, production incidents or metrics.
- Kept the existing backend authorization, model budget gate and repair policy. Public asset delivery uses an explicit stylesheet/module allowlist under the existing CSP. The landing page does not open a session; the workspace retains the invite gate. No model or neatlogs credentials were loaded in browser QA.
- `npm test`: 36 passed. `npm run typecheck`, `npm run format:check`, JavaScript syntax checks and `git diff --check`: passed. Initial sandboxed HTTP checks failed with localhost EPERM; the permitted rerun passed. Extended HTTP checks cover public assets, CSP and private-file refusal.
- Browser QA on an isolated localhost:8792 database: invalid input stayed on the form, a submitted two-row report totalled 19 minutes and remained unchecked, model execution stayed disabled, search/filtering worked, the labelled expired-lease case verified five rows/120 minutes, and the active-lease case escalated with active_lease. The keyboard skip link focused main without routing away. Mobile layout was checked at 320px/390px and desktop at 1280px.
- Fixed two UI defects found during review: polling now changes the status paragraph rather than the job-ID paragraph; positioned table-header accessibility text no longer creates mobile page overflow. At 390px, page width remains 390px and tables scroll in their own keyboard-focusable region.
- Desloppify scan/status/next before and after, same project/exclusions. Before: overall 23.6, objective/verified 94.4, strict 22.1. Final: overall 23.7, objective/verified 94.6, strict 22.1. Twenty subjective dimensions remain unassessed. Final scan has 30 open items, including 10 existing mechanical findings. Two intermediate stylesheet findings and the original app.css finding cleared after separating styles by responsibility. No authored exclusions, suppressions, invented scores or wontfix decisions. Optional jscpd boilerplate detection failed; final scans used npm offline mode and disclose that limit.
- Full validation and score tables: `docs/UI_VALIDATION.md`. Design: `docs/DESIGN.md`. Sanitized screenshots: `data/local/ui-preview/screenshots/landing-desktop.jpg` and `landing-mobile.jpg` (gitignored). These are interface evidence, not sponsor traces.
- No dependencies installed, sponsor credits spent, accounts changed, deployment, commit, push, video or submission performed. Existing uncommitted work was preserved. The interface session has no new Entire checkpoint.

### 2026-10-11 — next milestone review

- Read the current handoff, README, build record and submission checklist; inspected the working-tree status. No application code, account settings, credentials, model budget or external systems changed.
- Next milestone: prove the current application with a budget-approved live model run and inspectable neatlogs evidence, including a clearly labelled controlled recovery. The browser lab currently uses the deterministic checker, so it cannot stand in for live-model recovery evidence.
- Then reconcile genuine failure/fix traces, Entire checkpoint evidence and the existing cfo.ai forecast; harden the shared generator/verifier reference boundary; prepare an authorized clean release, deployment, video and submission. Web check-in and the final Discord cutoff still require confirmation in the record.
- Current engine/workbench changes remain uncommitted. No commit, push, deployment or submission performed. Documentation-only review; no Desloppify execution.

### 2026-10-11 — budget configuration guidance

- Inspected `.env.example`, the model adapter, application budget gate and CLI paths. Confirmed that `.env` exists without reading or printing its contents.
- Rechecked https://neatlogs.com/hackathon: the advertised LiteLLM allowance is $20 per checked-in team/solo, shared across the team. Actual remaining credit was not inspected.
- Recommended a $5 initial testing allocation with a provisional $0.10 reservation per request, configured in the local `.env` only after approval. This yields a total allowance of 50 reserved requests for the application's persistent ledger, less any already reserved. The per-request amount is an assumption, not measured pricing or a guaranteed upper bound.
- The current application guard enforces request count derived from that estimate, not actual billed dollars. CLI model-demo paths do not use the application's ledger. The isolated UI preview uses an empty environment; the normal `npm run serve` command loads the project `.env`.
- No secrets read, environment values edited, spending approved, model calls made, or external settings changed. Documentation-only session; no Desloppify execution.

### 2026-10-11 — operator copy cleanup

- User reported setting the budget and requested removing unnecessary wording from the main app. Tightened operator copy only: direct Overview title, shorter empty states and tool/status labels; removed the promotional banner, repeated page eyebrows, metric footnotes, sidebar slogans and long input-step explanations. Kept required input limits, controlled-test labels, verification evidence, failure reasons, unknown model usage and trace-delivery status.
- Budget wording now says allocation and estimated cost per call, with the estimate-based call allowance explained briefly. The environment page remains read-only. No `.env` values were read or changed, no model calls or spending performed. Browser QA used the existing isolated preview, which intentionally does not load the user's `.env`.
- Removed styles for deleted UI content. A browser check exposed a light strip under the shortened dark page; `min-height: 100vh` now keeps the canvas filled.
- `npm test`: 36 passed. Typecheck, full formatting check, frontend JavaScript syntax checks and `git diff --check`: passed. Browser checks covered Overview, supported input fields/limits, an existing verified controlled recovery and the estimate/budget explanations. No new test jobs were created.
- Desloppify scan/status/next before and after, same project and exclusions. Scores remain overall 23.7, objective/verified 94.6, strict 22.1. No new findings; 30 items remain open, including 20 unassessed subjective dimensions. Optional jscpd boilerplate detection remains unavailable; existing full score tables and limitations are in `docs/UI_VALIDATION.md`. No suppressions, authored-code exclusions or invented scores.
- Sanitized UI screenshot: `data/local/ui-preview/screenshots/workspace-copy-cleanup.jpg` (gitignored). No deployment, commits, pushes or submission.

### 2026-10-11 — configured server status

- Investigated why the user still saw “Model paused” on port 8792. That isolated UI preview was started with `env: {}` and therefore does not load the project budget or provider credentials.
- Started the normal server with `NIGHTSHIFT_HOST=127.0.0.1 NIGHTSHIFT_PORT=8787 npm run serve`. Verified its Environment page shows “Model available” and “Ready”, a $10 allocation, a $0.10 per-call estimate, 100 allowed calls and zero reserved calls.
- No credentials were printed, configuration changed or model requests made. The configured local app is `http://127.0.0.1:8787/#/settings`; port 8792 remains the isolated preview. Documentation-only record; no Desloppify execution.

### 2026-10-11 — authorized commit and push

- User explicitly requested committing and pushing the pending changes. Reviewed the 40 changed/new application, UI, test and documentation files on `main`, targeting `origin` at `https://github.com/Ololadestephen/nightshift.git`.
- Pre-commit checks passed: all 36 tests, TypeScript, full Prettier check, frontend JavaScript syntax and `git diff --check`. A local credential check found no common credential patterns or matches for configured secret values; values were never displayed. `.env`, runtime SQLite data and `.desloppify/` remain ignored.
- Entire reports automatic checkpoint pushing disabled (`push_sessions=false`). Existing Cursor sessions are recorded by Entire; this Codex commit is not claimed as a new supported-agent checkpoint. No model calls, deployment or hackathon submission were performed.
- No application code changed during this release session; the preceding Desloppify results remain the latest code-health assessment. Commit and remote push results are verified and reported after execution.

### 2026-10-11 — workbench live verification

- The owner submitted `fixtures/sample-report.json` through the main app at `http://127.0.0.1:8787` and started Nightshift. While the first model request was open, the page correctly showed the run as running, with 0 model calls and usage unavailable, because those fields are saved when the request finishes.
- Job `job_9546fc1b-069b-4b1c-8994-207863d6b233` completed as verified. Run `run_8e719773-567d-4202-9ffc-638a85fbf503` used decision source `model`, 2 calls (`inspect_job`, `verify_artifact`), and recorded usage of 2163 prompt tokens, 316 completion tokens, and 2479 total tokens. The report is 4 rows and 44 minutes, matching the submitted file. neatlogs export status is `exported`; trace id `0260da9b6a652ed3a1eecf9383c6a890`. No public neatlogs dashboard URL is claimed. The ledger reserved 2 of 100 calls. No deployment or submission.
- The job page only started polling when it first opened. A report already waiting for verification did not poll after Start Nightshift, so the finished result stayed hidden until reload. `public/app.js` now keeps checking any job that is not finished, including one awaiting verification, and stops when it ends. A fresh page load on the isolated preview kept requesting the job while it was awaiting verification, and the status changed to Verified without another reload after the stored job completed. An already open tab keeps the earlier script until the browser reloads the document.
- A running check no longer says the model is unavailable. The page says Nightshift is checking the report, and token counts appear when the model responds. Each finished model step is saved immediately. A preview page moved from that in-progress line to “Run completed: verified. Model calls: 2. Tokens: 2165 in / 321 out.” without a reload.

## Demo

`npm run serve` opens the local workbench. A person can submit their own rows, watch the worker write the report, and download it. Live model checking stays off until the owner sets both budget numbers. The labelled lab, behind `NIGHTSHIFT_LAB=1`, can recover an intentionally stalled fixture with the deterministic checker. `npm run demo:model` has verified one controlled job with Sonnet. The workbench has also verified the owner's sample file, `fixtures/sample-report.json`, with two live model calls and an exported neatlogs trace. The public repository is https://github.com/Ololadestephen/nightshift. The cfo.ai assumption model is exported under `evidence/cfo/`. Entire checkpoints on `main` are listed above. No public demo URL, video, or neatlogs dashboard link is claimed.

## Known limitations

Live model runs are unavailable until `NIGHTSHIFT_MODEL_BUDGET_USD` and `NIGHTSHIFT_USD_PER_CALL` are set, along with the existing spend approval and server-side key. The workbench does not invent a result or switch to the deterministic controller. A healthy submitted job is written by the worker and stays unchecked until a model run verifies it. The verifier and the generator share `aggregate()`; an independent test sums minutes without that function. A fresh agent invocation re-reads evidence rather than restoring hidden reasoning. Uniqueness is SQLite transactions, unique operation and artifact keys, lease compare-and-swap, and one open run per job. That is not exactly-once behavior across external systems. The public deployment, the video, and submission are still open. The cfo.ai model is an assumption forecast: there are no customers, contracts, or actual revenue. No production incidents, customers, outcomes, or revenue exist for this project.

## Submission

Not submitted. Confirm exact cutoff and official quote post. Complete sponsor evidence, repo/video requirements and authorized publication before recording submission success.
