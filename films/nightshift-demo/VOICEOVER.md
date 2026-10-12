# Voiceover for the evidence cut

Picture edit: 175 seconds. This is a draft script for the owner to record after reviewing the picture. Aim for a conversational pace, with small pauses at section changes. The music is a quiet temporary bed; the final mix and exact timing follow the recorded voice.

## 0:00–0:12 — problem

The worker stopped. The input and checkpoint survived. Nightshift uses that evidence to decide what can safely happen next—and checks the result before declaring success.

## 0:12–0:28 — architecture

The model chooses a structured tool. The executor checks lease expiry, generation, job scope and budgets. SQLite records the inputs, checkpoints and outcomes. A plausible explanation cannot count as completion.

## 0:28–1:10 — recovery

This is an earlier recorded Sonnet recovery in a controlled fault scenario. The model inspects the job, the worker, the saved checkpoint and the recent errors. The lease has expired, so reclaim is legal. The executor checks the observed generation and creates a new one. It then resumes from the parsed checkpoint, preserving completed work and the original input. Finally, verification reports no mismatches: five rows, one hundred and twenty minutes, and a completed job. These enlarged results come from the saved tool journal.

## 1:10–1:28 — safety

A different test holds an active worker lease. Nightshift stops and escalates instead of reclaiming that worker. This screen is the deterministic safety lab, with zero model calls.

## 1:28–1:52 — improvement

The earlier model run exposed a sequencing defect: reclaim succeeded, but tool selection led to escalation. We corrected the catalog so successful reclaim offers resume. The later, separate controlled run resumed and verified its report. These traces show the change.

## 1:52–2:14 — live verification

Here is a separate live check in the application. Four submitted rows become a forty-four-minute report. Nightshift checks the artifact, and the page records two model calls with measured token usage. The reconciled output is marked verified and can be downloaded.

## 2:14–2:28 — Entire

Entire links build checkpoints with their commits and saved coding context. Here is the checkpoint attached to a real app change. These build records are separate from the report pipeline's runtime checkpoints.

## 2:28–2:46 — cfo.ai

Our first intended users are small teams with application-owned report pipelines. In cfo.ai, we modeled a forty-nine-dollar recovery price, estimated inference and infrastructure costs, and a higher-price scenario. These are assumptions, with no actual customers or revenue.

## 2:46–2:55 — close

Nightshift investigates, repairs within policy, and checks the deliverable. The code and build record are in the public repository.

## Recording notes

Record clean speech without background music. Separate takes per section are useful; a single continuous take is also fine. Keep a few seconds of room tone at the beginning and end. Do not read the headings or timestamps aloud. The film does not claim production incidents, independent runtime verification code, actual forecast revenue, or an exactly-once guarantee.
