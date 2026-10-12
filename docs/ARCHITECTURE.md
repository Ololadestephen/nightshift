# Proposed Nightshift architecture

The local Node/SQLite application implements the catalog below. `npm run serve` hosts the workbench and the worker in one process. Model calls go through the approved LiteLLM gateway only when spend is approved and both `NIGHTSHIFT_MODEL_BUDGET_USD` and `NIGHTSHIFT_USD_PER_CALL` are set. There is no silent fallback to the deterministic controller. neatlogs wraps those live calls. The cfo.ai assumption model is exported under `evidence/cfo/`. Confirm current primary docs before hosting changes or a public repair route.

## Minimal stack

Strict TypeScript/Node service with runtime-validated schemas, durable SQLite, and a static workbench served by the same process. Browser requests return after the job or run is recorded. The worker and the agent continue on `setImmediate`. Poll `GET /api/jobs/:id` for progress. Single persistent runtime for worker and agent scheduling; avoid serverless storage or request timeouts that silently terminate long jobs. Choose actual libraries and hosting only within authorization.

Use a supported tool-calling model through the approved event gateway. The adapter separates model selection from execution policy. The official neatlogs SDK instruments the provider call and each tool execution. Entire captures build context separately from Nightshift job checkpoints.

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

Do not promise exactly-once behavior across arbitrary remote systems. SQLite transactions wrap each mutation. `operations.operation_id` and `artifacts (job_id, pipeline_version)` are unique. Lease reclaim is a compare-and-swap on the observed generation and expiry. One open agent run per job is a partial unique index. A crash after the database commit and before the artifact file is renamed is repaired by publishing the stored body again. A lost response is reconciled from the operation row before the mutation is repeated. Those are the guarantees. They do not extend to an outside system that accepted a request and then lost the reply.

## Verification contract

Expected deliverable is a structured report built from the frozen input stored for that job. Verifier checks job ID, input hash, pipeline version, artifact schema, row counts and aggregates against a recomputation from that stored input. Check content, not merely a worker status or artifact checksum. Hashing wrong content does not make it correct.

The verifier and the report generator both call `aggregate()` in `src/report.ts`. An independent test sums the same rows without that function and compares the totals. A shared bug in `aggregate()` would not be caught by the verifier alone.

Completed jobs are not repaired. Wrong/corrupt input, missing permissions, unknown checkpoints, unsupported errors and repeated failures escalate. Partial output is not published as complete.

## Agent legitimacy

The actual model consumes observations and selects structured tool calls. Code enforces invariants and mechanics. Tests can stub the model for deterministic boundaries, but the demo needs real model-driven runs clearly distinguished from fixtures.

Use variation in worker state, checkpoints and transient failures to evaluate whether choices respond to evidence. Don't feed the agent scenario labels that reveal the diagnosis or a fixed answer. Don't route a prewritten state-machine solution through an LLM merely to call it autonomous.

The CLI-only `demo-failure` command deliberately loses a resume acknowledgement after artifact commit. It exposes the actual uncertain result in model memory, invalidates the old checkpoint observation and requires a fresh read. A published checkpoint offers artifact verification rather than another resume. The original uncertain operation remains recorded; verification reconciles the deliverable rather than inventing a successful acknowledgement. Live demonstrations reserve every call against the main app's existing budget ledger while using a separate disposable job database. Unsupported exceptions still escalate. The published trace is indexed in `evidence/README.md`.

## Observability and privacy

Attach run/tool/operation/job IDs, code version and observation timestamps. Track trace export success separately from job success. Redact credentials and minimize input content before sending it to neatlogs or a model. Use non-sensitive seeded demo data and disclose it.

Save short decision rationales and evidence references, not hidden chain-of-thought. Count token/cost metrics only from real usage data or declared estimates; null means unavailable. Trace links must be verified and safe to share.

## Required tests

Happy job verification; expired lease reclaim; active lease refusal; generation race; stale worker publish rejection; crash after artifact write/before acknowledgment; duplicate resume; dropped response reconciliation; checkpoint/version mismatch; corrupt artifact; invalid model tool/arguments; prompt injection in evidence; bounded retries/budget; process/database reopen; trace outage disclosure; unauthorized repair; escalation persistence.

## Demo fault injection

Dedicated operator-only controls may expire a disposable job's lease, interrupt a worker between steps or inject one transient tool failure. UI and video say 'controlled fault-injection environment.' No production systems/users are harmed. Keep this surface off public anonymous routes; do not use a repair endpoint as an attack tool.
