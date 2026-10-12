# Recorded Sonnet recovery evidence

This is a readable summary of existing local journals, not a new execution or a neatlogs dashboard screenshot. Both scenarios were controlled fault injections. Use this as source-backed trace replay in the film if actual runtime footage is unavailable.

## Successful recovery

Job: `job_e0dfd0b5-ffd9-4836-b9d8-6bd82569d485`

Source: `data/local/traces/job_e0dfd0b5-ffd9-4836-b9d8-6bd82569d485.json`. The October 10 Sonnet recovery entry in `hackathon.md` records decision source `model`, 7 model calls, 2 repairs and a verified 120-minute artifact.

| Step | Tool                    | Observed result in the journal                 |
| ---- | ----------------------- | ---------------------------------------------- |
| 1    | `inspect_job`           | Job status `stalled`.                          |
| 2    | `inspect_worker`        | Lease `expired`, generation `1`.               |
| 3    | `read_checkpoint`       | Saved checkpoint with generation `1` returned. |
| 4    | `read_recent_errors`    | Error observations returned.                   |
| 5    | `reclaim_expired_lease` | `ok: true`; new generation `2`.                |
| 6    | `resume_job`            | Operation `applied`; job moved to `verifying`. |
| 7    | `verify_artifact`       | `ok: true`; job moved to `completed`.          |

## Earlier failure and subsequent fix

Earlier job: `job_89165069-ee50-4412-a193-17c49d737eef`

Source: `data/local/traces/job_89165069-ee50-4412-a193-17c49d737eef.json` and the October 10 Sonnet recovery entry in `hackathon.md`.

| Earlier observed behavior                                                                             | Later observed behavior                                                      |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Four inspections observed a stalled job and expired generation-1 lease.                               | Four inspections observed a stalled job and expired generation-1 lease.      |
| Reclaim succeeded and created generation `2`.                                                         | Reclaim succeeded and created generation `2`.                                |
| The tool catalog treated the newly reclaimed hold as an active lease and offered escalation.          | The catalog ordering was corrected to offer resume after successful reclaim. |
| `escalate_incident` returned `job_status: escalated`, reason `lease_is_active_cannot_safely_reclaim`. | `resume_job` applied; `verify_artifact` completed the job.                   |

These are different jobs before and after a development fix. Do not present them as one run automatically repairing its own code. This earlier failure is distinct from the intended safety refusal for an unrelated active worker.

Both exports were recorded as `exported` in the build log. The local journals are local evidence; capture the corresponding runs in neatlogs separately to show sponsor usage. No public dashboard URLs for these two runs have been verified here.
