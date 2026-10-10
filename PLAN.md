# Nightshift build plan

Planning only; no code or integration has been implemented. Build the smallest substantive recovery task, prove it and leave time for the required video/integration evidence.

## Mission

Given an unfinished report job, investigate its observable state, safely resume permitted work, verify the completed report or escalate. A long task can involve parsing, aggregation and publication; the agent must reason across tool results and changing state, not just call a single scripted restart.

## Phase 0 — access and rules gate

1. Confirm the founder's Luma registration and web check-in status. No account changes without permission.
2. Confirm final cutoff and submission post in Discord. Public page: October 12 planned 19:00–23:55 IST = 14:30–19:25 WAT. Final cutoff remains organizer-confirmed.
3. Read current neatlogs SDK, Entire tooling/agent compatibility and model-gateway docs. Record exact versions and supported capabilities.
4. Obtain locally configured credentials from the user without printing them. Confirm explicit model/service budget; sponsor availability is not automatic authorization to consume it.
5. Arrange user-completed cfo.ai signup/billing review and actual business-plan production.
6. Enable meaningful Entire build-context capture early where supported; disclose any missing support and organizer guidance.

Blocked gates do not authorize fabricated evidence. Local pure-engine work can proceed within authorization, while integration gaps remain visible.

## Phase 1 — real controlled job system

- Create the minimal typed Node/TypeScript service and report pipeline, not a fork of an existing project.
- Use durable SQLite or another explicitly approved database with migrations, unique operation keys and transaction tests.
- Report input is a small labelled dataset, stored locally with its hash. Output includes deterministic counts/aggregations and a JSON/Markdown artifact; monetary fields, if any, use exact units.
- State: queued, running, stalled/failed, recovering, verifying, completed, escalated. Freeze exact transition contracts during implementation.
- Worker checkpoints: input accepted -> parsed -> aggregated -> artifact written -> reconciled. Persist enough evidence for resumption and immutable artifact references.
- Define lease/fencing ownership and graceful controlled failure injection.
- Test restart/resume, terminal-state behavior, stale transitions, duplicate acknowledgment, artifact collisions and transaction rollback.
- Perform initial Desloppify scan once meaningful code exists.

## Phase 2 — bounded agent plus neatlogs

- Agent receives a goal and job ID; structured read tools supply job state, lease, checkpoint, recent sanitized errors and artifact evidence.
- Actual model chooses inspections and supported repairs. Reject invalid outputs; allow at most one bounded correction attempt before escalation.
- Policy restricts job, action, observed generation, retry count, elapsed time and budget. The model cannot increase its own allowance.
- Trace the loop with the official neatlogs integration: tool/model calls, returned data, relevant state, errors, retries, usage/latency and terminal verification. Redact before export.
- Baseline valid job: inspect and verify without unnecessary mutation.
- Recoverable expired-lease case: inspect, verify expiry, reclaim with fencing, resume checkpoint, verify original artifact.
- Recovery complication: a real injected transient tool error causes a bounded retry or new observation; no repeated action after uncertain success.
- Unsafe case: active worker or corrupt/mismatched input causes refusal/escalation.
- Agent interruption: application checkpoint resumes without losing completed actions or duplicating publication.

Gate: actual tool calls and state changes are visible in real traces. A fixed state machine with an LLM writing commentary is not sufficient as the agent story.

## Phase 3 — prove recovery and improvement

- Verify artifact input hash, job identity, schema, counts/aggregates and deterministic reference output. A file existing or an HTTP 200 is insufficient.
- Define successful recovery rate only over a declared scenario set; label controlled tests and publish misses/escalations. No production-generalization claim.
- Measure tools/attempts, wall time and model usage. Explain timing/model nondeterminism; do not claim byte-identical live traces.
- Capture a genuine implementation failure from development and a comparable post-fix run, tying trace IDs to code/version/test evidence. If none exists, report no observed defect rather than manufacturing one to inflate a story.
- Keep intentionally injected runtime faults separately labelled; these demonstrate recovery, not spontaneous production incidents.
- Complete change-related Desloppify issues; prioritize authorization, state correctness and tests rather than cosmetic score inflation.

## Phase 4 — business and demonstration

- Minimal UI: jobs and output, agent timeline, checkpoint/lease evidence, attempted repairs, verification result and trace link.
- Authenticated operator control; only disposable local/demo jobs can be fault-injected. No open anonymous repair API.
- cfo.ai plan: target small SaaS teams, narrow supported pipeline; compare pricing options and per-run model/infra/support costs using explicit assumptions and actual measured data where available.
- Preserve actual cfo.ai output and explain sponsor roles. Do not invent contracts, customers, savings or revenue.
- Entire evidence: actual checkpoint/context or graph artifacts, sanitized and attributed to this repo.
- A <=3-minute video must show agent mission, actual recovery, verification, failure handling and meaningful neatlogs/Entire/cfo.ai usage.
- Public progress updates only when authorized; retain genuine #neatHack links. No bots/bought engagement.

## Suggested remaining-time allocation

Use hours relative to the confirmed deadline, not a claim of 48 hours remaining:

- Initial 3h: gates, minimal worker/checkpoint engine, sponsor setup.
- Next 6h: tool contracts, actual model loop, tracing, one end-to-end recovery.
- Next 5h: fencing/idempotency/failure tests and outcome verification.
- Next 3h: operator UI and measured before/after evidence.
- Next 2h: actual cfo.ai business artifact and Entire evidence reconciliation.
- Reserve at least final 5h: QA/clean clone, authorized deployment, recording, submission and confirmation.

If less time remains, cut UI richness and extra scenarios, not required integrations or repair safety.

## Cut order

Cut multi-agent coordination, arbitrary connectors, sophisticated visuals and additional repair classes first. No universal shell tooling, auto code patches, alerts/integrations or production access. Never cut durable checkpoints, artifact verification, active-lease protection, genuine model tool use, evidence labels or required sponsor usage.

## Release checklist

- Clean clone and documented setup; actual runtime/SDK versions and dependency/resource disclosures.
- Formatter, typecheck, unit/integration tests and smoke demo pass; relevant Desloppify findings reported.
- Failed tool/retry, active-worker refusal, stale generation, duplicate publication, interrupted agent and wrong artifact are tested.
- Credentials/local state excluded from tree/history; exported traces/screenshots sanitized.
- Demo video and public repo verified after approved publication; all three sponsor artifacts shown.
- Official X quote submission published only with user authorization; retain actual confirmation/link, not a draft.
