# Nightshift neatHack build record

## Project

Nightshift investigates stalled report-generation jobs, executes bounded repairs, resumes unfinished work and verifies the deliverable in a controlled environment.

## Team

Founder confirmed registration; public team name and publishing details not yet supplied. No teammates or handles are invented.

## Stack

Local TypeScript/Node 25 service using built-in `node:sqlite`, the `neatlogs` 1.1.28 package, and the `openai` 6.49.0 package. The recovery command uses a deterministic controller. No LiteLLM call has been made. Entire CLI 0.11.4 is enabled for local Cursor capture. cfo.ai has an assumption-only Nightshift model; no card was entered in this session.

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

## Demo

Local commands recover one labelled stalled report job and verify the artifact. `npm run demo:model` has done that with Sonnet when spend is approved. The public repository is https://github.com/Ololadestephen/nightshift. The cfo.ai assumption model is exported under `evidence/cfo/`. `entire checkpoint list` reports 2 checkpoints on `main`, including `01M4KTYJRB6QACT0GFAP5DCW2E` on `f63e6fd`. No public demo URL, video, or neatlogs trace link is claimed.

## Known limitations

`npm run demo:recover` uses the deterministic controller. `npm run demo:model` has verified one controlled job with Sonnet, and neatlogs accepted that trace without a public trace link. Entire is enabled. The list after `f4ed811` was 0. After `f63e6fd`, `entire checkpoint list` reports 2 checkpoints on `main`: `01M4KTYJRB6QACT0GFAP5DCW2E` and `01M4KSYQCJZJ7SJ5GDWBMN9T3A`. The cfo.ai model is an assumption forecast, not customers, contracts, or actual revenue. The operator UI, the video, and submission are still open. Uniqueness is SQLite constraints plus lease compare-and-swap, not exactly-once execution across external systems. No production incidents, customers, outcomes, or revenue exist for this project.

## Submission

Not submitted. Confirm exact cutoff and official quote post. Complete sponsor evidence, repo/video requirements and authorized publication before recording submission success.
