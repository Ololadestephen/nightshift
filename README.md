# Nightshift

**The night shift for unfinished background work.**

## Pitch

Nightshift is an AI operations agent that investigates stalled background jobs, performs narrowly authorized repairs, resumes unfinished work and verifies the resulting artifact against the stored original input.

**For judges:** [evidence page](evidence/README.md) — actual before/after runs, a live failed-acknowledgement recovery, Entire checkpoint, cfo.ai forecasts and reproduction/tests.

## Locked first mission

Recover report-generation jobs in a controlled, application-owned environment. A job reads a small non-sensitive dataset, produces a structured report and publishes its result. Nightshift must identify why the job stalled and decide what to do next using actual tool observations.

It does not stop at recommending a restart. It can execute an allowlisted repair, resume a job from a durable checkpoint and check whether the expected report exists and satisfies its contract.

## Current status

The local application stores jobs in SQLite, runs the report worker in the same process, and can ask the model to check or recover a job. `npm run serve` opens the landing page at `http://127.0.0.1:8787`; Open workspace leads to the operator overview. A submitted dataset is stored with its hash. The worker writes the report from those rows. Nightshift does not mark it checked until a run verifies it.

Live model runs stay off until `NIGHTSHIFT_SPEND_APPROVED=1`, a server-side LiteLLM key, `NIGHTSHIFT_MODEL_BUDGET_USD`, and `NIGHTSHIFT_USD_PER_CALL` are all set. The last two have no default. The page says live execution is unavailable and does not fall back to the deterministic controller. `npm run demo:model` remains the older CLI path and calls LiteLLM when spend is approved; one controlled run with `claude-sonnet-4.6` verified the labelled fixture. The CLI loads `.env` without overriding variables already set in the shell, and it does not print those values.

neatlogs spans wrap the live model and tool calls when `NEATLOGS_API_KEY` is present, and the local journal records each call's duration. Token usage is copied from the provider response when that response includes it. A missing or failed export leaves the job result in place and is labelled separately. A fresh invocation can resume a job already in `recovering` when this worker still holds the active lease. A tool exception or an unexpected model error escalates the job and keeps a terminal trace.

While a required observation is missing, the request offers those reads. A verifying or completed job is offered only `verify_artifact`. After an uncertain resume acknowledgement, the model reads a new checkpoint; a published checkpoint then offers verification instead of repeating the repair. An expired lease is offered reclaim and escalate. A reclaimed job is offered resume and escalate. An active, missing, or uncertain hold is offered only escalate. That is a bounded workflow for this pipeline. The narrated two-minute video is locally complete; public video upload and deployment remain open. The cfo.ai workbook under `evidence/cfo/` is an assumption forecast. Entire checkpoints are listed in `hackathon.md`. Web check-in and the final Discord cutoff are still open.

## Run the application

```bash
npm ci
npm test
npm run serve
```

Open `http://127.0.0.1:8787`. Create a report job from JSON with `day`, `queue` (`billing` or `access`), `status` (`open` or `closed`), and whole `minutes`. The example button only fills the box. Closing the browser does not stop a job that has already been accepted. Refreshing loads the same job. A second start does not create a second run.

Copy `.env.example` to `.env` when keys are available. Leave the two budget numbers empty until the owner chooses a cap. `NIGHTSHIFT_INVITE_CODE` requires that code before a session is created. `NIGHTSHIFT_LAB=1` exposes labelled fault scenarios on the same server; those scenarios use the deterministic checker and are not the primary flow. Runtime files stay in `data/local/`, which is gitignored.

```bash
npm run typecheck
npm run demo:recover
npm run demo:model
```

The CLI-only failed-action demonstration is `node --import tsx src/cli.ts demo-failure`. It deliberately loses a resume acknowledgement after artifact commit, re-inspects the checkpoint and verifies the existing report. It defaults to the deterministic controller. Add `--model` for actual model decisions under the existing application budget ledger; room for eight calls is required. Records and isolated demo state are saved under `data/local/failure-demo/`. This fault flag is not a model tool argument or a public HTTP control. See [the real recorded run and limitations](evidence/README.md#start-with-the-failed-action-run).

`npm run demo:recover` seeds one labelled fault, reclaims the expired lease, resumes the unpublished steps, and checks the report. Do not set `NIGHTSHIFT_SPEND_APPROVED=1` unless you intend to use the shared model budget.

## Interface

The landing page introduces the recovery workflow and its verification contract. The workspace includes an overview with real session counts, searchable and filterable report jobs, JSON submission, report detail with checkpoints and recovery evidence, activity, and a read-only environment page. Controlled tests appear only when the server enables the lab. The landing illustration is labelled as an illustrative run; operator data comes from the existing session-owned API.

The interface uses local fonts, native browser controls and responsive layouts. It adds no dependencies or remote assets. Design decisions are recorded in `docs/DESIGN.md`.

## Deployment

Do not put the SQLite file on an ephemeral disk. Point the process at a persistent directory by running it with that directory as the working directory, because `npm run serve` stores `data/local/nightshift.sqlite` and `data/local/artifacts/` under `process.cwd()`. Keep the process running after the shell exits. Bind `NIGHTSHIFT_HOST` only when the port should be reachable, and set `NIGHTSHIFT_COOKIE_SECURE=1` behind HTTPS. Keep `LITELLM_API_KEY` and `NEATLOGS_API_KEY` in the server environment, never in frontend code. A spend flag alone does not enable live runs: both budget numbers must be set as well. This repository has not been deployed.

## Product loop

Observe -> investigate -> propose diagnosis -> enforce repair policy -> perform allowed action -> observe result -> verify artifact -> resolve or escalate.

The agent may ask for more evidence, retry within a budget, or refuse an unsafe operation. While any of the four observations is missing, the model chooses among those reads. After that, the request offers the repair that matches the evidence together with escalate, except when the report is already written: then the only offered action is verification. 'Worker running again' is not proof that the original job finished correctly.

## Why it matters

Background jobs can fail quietly, leave partial output or repeat work after uncertain acknowledgments. A human operator must reconstruct state and determine whether recovery is safe. Nightshift aims to perform that bounded investigation and recovery with durable evidence, preserving checkpoints and preventing duplicate side effects.

The demo environment uses deliberately induced failures. It is a working controlled system, not an invented production incident or proof of broad operational competence.

## Differentiation

- Artifact verification, not merely service liveness.
- Evidence-driven tool use, not a fixed restart script with an AI summary.
- Checkpoint-aware recovery and durable action records.
- Fenced repairs that cannot reclaim active jobs or apply stale actions.
- Explicit escalation for uncertain or unsupported conditions.
- Traceable comparison of a real implementation problem and its correction.

## Required neatHack integrations

- neatlogs: live model and tool spans, sanitized evidence, failure state, and token usage when the provider returns it.
- Entire: coding-agent repository context/checkpoints or graph output; separate from the application's runtime job checkpoints.
- cfo.ai: a produced business plan covering pricing, costs, revenue assumptions and runway. A local planning document is not proof of cfo.ai usage.

## Scope

One report-job pipeline, one controlled application, one agent, a small tool catalog and a minimal operator dashboard. No arbitrary production access, general shell commands, destructive repair, financial operations, broad incident platform or unrelated integrations.

Keep this project separate from Mosaic/TestSprite, Chog Déjà Vu and Recourse. No borrowed finished or half-built project code: neatHack requires event-window code.

## Handoff

Read START_HERE.md, AGENTS.md, PLAN.md, docs/ARCHITECTURE.md and docs/EVENT_AND_SUBMISSION.md. Track actual build evidence in hackathon.md.
