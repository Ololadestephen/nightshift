# Nightshift

**The night shift for unfinished background work.**

## Pitch

Nightshift is an AI operations agent that investigates stalled background jobs, performs narrowly authorized repairs, resumes unfinished work and independently verifies the resulting artifact.

## Locked first mission

Recover report-generation jobs in a controlled, application-owned environment. A job reads a small non-sensitive dataset, produces a structured report and publishes its result. Nightshift must identify why the job stalled and decide what to do next using actual tool observations.

It does not stop at recommending a restart. It can execute an allowlisted repair, resume a job from a durable checkpoint and check whether the expected report exists and satisfies its contract.

## Current status

The first slice is a local controlled report pipeline. It stores jobs in SQLite, resumes from checkpoints, fences leases, and verifies the report counts. `npm run demo:recover` uses the deterministic controller. `npm run demo:model` uses the LiteLLM client and stays blocked until `NIGHTSHIFT_SPEND_APPROVED=1`. With that approval and `NIGHTSHIFT_MODEL=claude-sonnet-4.6`, one controlled run verified the report. The CLI loads `.env` without overriding variables already set in the shell. neatlogs export runs only when `NEATLOGS_API_KEY` is present. Entire CLI 0.11.4 is enabled for Cursor with local capture only; this session started before the hooks loaded, and no checkpoint exists until an authorized commit. cfo.ai is not signed up. Web check-in and the final Discord cutoff are still open.

## Run the controlled demo

```bash
npm test
npm run typecheck
npm run demo:recover
npm run demo:model
```

`npm run demo:recover` seeds one labelled fault, reclaims the expired lease, resumes the unpublished steps, and checks the report. Runtime files stay in `data/local/`, which is gitignored. Copy `.env.example` when keys are available. Do not set `NIGHTSHIFT_SPEND_APPROVED=1` unless you intend to use the shared model budget.

## Product loop

Observe -> investigate -> propose diagnosis -> enforce repair policy -> perform allowed action -> observe result -> verify artifact -> resolve or escalate.

The agent may ask for more evidence, retry within a budget or refuse an unsafe operation. 'Worker running again' is not proof that the original job finished correctly.

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

- neatlogs: actual agent/model/tool runs, sanitized evidence, failure/retry state and measured usage where available.
- Entire: coding-agent repository context/checkpoints or graph output; separate from the application's runtime job checkpoints.
- cfo.ai: a produced business plan covering pricing, costs, revenue assumptions and runway. A local planning document is not proof of cfo.ai usage.

## Scope

One report-job pipeline, one controlled application, one agent, a small tool catalog and a minimal operator dashboard. No arbitrary production access, general shell commands, destructive repair, financial operations, broad incident platform or unrelated integrations.

Keep this project separate from Mosaic/TestSprite, Chog Déjà Vu and Recourse. No borrowed finished or half-built project code: neatHack requires event-window code.

## Handoff

Read START_HERE.md, AGENTS.md, PLAN.md, docs/ARCHITECTURE.md and docs/EVENT_AND_SUBMISSION.md. Track actual build evidence in hackathon.md.
