# Proposed Nightshift architecture

The first slice implements the catalog below in a local Node/SQLite demo. The operator UI, model calls, neatlogs export, and cfo.ai plan are not connected yet. Confirm current primary docs before adding those integrations.

## Minimal stack

Strict TypeScript/Node service with runtime-validated schemas, durable SQLite, and a small React/Vite UI served with the API. Single persistent runtime for worker and agent scheduling; avoid serverless storage or request timeouts that silently terminate long jobs. Choose actual libraries and hosting only within authorization.

Use an actual supported tool-calling model. Direct OpenAI-compatible access through an approved event gateway is a candidate, not a claimed working integration. Adapter separates model selection/usage from execution policy. Official neatlogs SDK instruments runtime. Entire captures build context separately.

## Boundaries

| Component          | Owns                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| Job service/worker | Pipeline steps, durable checkpoints, artifact storage, lease and fencing generation |
| Evidence tools     | Read job/checkpoint/worker/error/artifact observations with freshness and IDs       |
| Model agent        | Select next inspection/action and concise evidence-backed rationale                 |
| Policy engine      | Allowed environment/job/actions, authorization, versions, budget and retry limits   |
| Repair executor    | Fenced, validated state mutations and idempotent operation records                  |
| Verifier           | Independent artifact/result reconciliation, not model self-approval                 |
| Scheduler          | Durable run state, bounded retries and resumption                                   |
| Trace adapter      | Actual sanitized model/tool/state events and delivery status                        |
| Operator UI        | Clear state, recovery progress, receipts and public-safe evidence                   |

## Initial tool catalog

- `inspect_job(job_id)`
- `inspect_worker(job_id)`
- `read_checkpoint(job_id)`
- `read_recent_errors(job_id)`
- `reclaim_expired_lease(job_id, observed_generation)`
- `resume_job(job_id, checkpoint_id, operation_id)`
- `verify_artifact(job_id)`
- `escalate_incident(job_id, reason, evidence_ids)`

The first slice implements this catalog in the controlled demo. `escalate_incident` takes a reason and records observation ids already held in memory. No arbitrary file paths/URLs/SQL/shell commands. Limit observations to the authorized job; model input cannot change the environment or act as another operator. Protected state requires a real authenticated permission check, not a field saying `authorized: true` supplied by the model.

## Fencing and uncertain outcomes

Every worker carries a generation token. Lease reclaim requires an expired, observed generation and atomically creates a new generation. Stale workers are prevented from advancing checkpoints or publishing results. Active/missing/uncertain lease evidence does not permit reclaim.

Each mutating operation has a unique idempotency key and persisted outcome. If a tool response is lost, inspect the operation/state before repeating it. Report generation retries reuse completed checkpoints only if input/version hashes still match. Output commit uses unique job/version keys; verify content before acknowledging completion.

Do not promise exactly-once behavior across arbitrary remote systems. The first slice covers this controlled database/artifact environment and documents residual failure boundaries.

## Verification contract

Expected deliverable is a structured report built from a frozen labelled input. Verifier checks job ID, input hash, pipeline version, artifact schema, row counts and aggregates against deterministic reference computation. Check content, not merely a worker status or artifact checksum. Hashing wrong content does not make it correct.

Completed jobs are not repaired. Wrong/corrupt input, missing permissions, unknown checkpoints, unsupported errors and repeated failures escalate. Partial output is not published as complete.

## Agent legitimacy

The actual model consumes observations and selects structured tool calls. Code enforces invariants and mechanics. Tests can stub the model for deterministic boundaries, but the demo needs real model-driven runs clearly distinguished from fixtures.

Use variation in worker state, checkpoints and transient failures to evaluate whether choices respond to evidence. Don't feed the agent scenario labels that reveal the diagnosis or a fixed answer. Don't route a prewritten state-machine solution through an LLM merely to call it autonomous.

## Observability and privacy

Attach run/tool/operation/job IDs, code version and observation timestamps. Track trace export success separately from job success. Redact credentials and minimize input content before sending it to neatlogs or a model. Use non-sensitive seeded demo data and disclose it.

Save short decision rationales and evidence references, not hidden chain-of-thought. Count token/cost metrics only from real usage data or declared estimates; null means unavailable. Trace links must be verified and safe to share.

## Required tests

Happy job verification; expired lease reclaim; active lease refusal; generation race; stale worker publish rejection; crash after artifact write/before acknowledgment; duplicate resume; dropped response reconciliation; checkpoint/version mismatch; corrupt artifact; invalid model tool/arguments; prompt injection in evidence; bounded retries/budget; process/database reopen; trace outage disclosure; unauthorized repair; escalation persistence.

## Demo fault injection

Dedicated operator-only controls may expire a disposable job's lease, interrupt a worker between steps or inject one transient tool failure. UI and video say 'controlled fault-injection environment.' No production systems/users are harmed. Keep this surface off public anonymous routes; do not use a repair endpoint as an attack tool.
