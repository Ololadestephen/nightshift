# Capture list — Nightshift evidence demo

Updated October 11, 2026. Continue in the existing Remotion project. Owner will record voiceover after the picture edit; keep the score adjustable and leave room for narration.

## Recording setup

- Record landscape at 1920×1080 or higher, preferably 30 or 60 fps. Keep the app readable; browser zoom around 110–125% is a useful starting point.
- Use the configured app at `http://127.0.0.1:8787`, in the same browser/session that owns the reports. Refresh once before recording to load the current UI.
- Record the application window. Close unrelated tabs and turn on Do Not Disturb. Keep `.env`, API keys, account/billing details and private data out of view.
- No microphone or webcam needed. Keep the original clips and pauses; editing can shorten waits while clearly labelling elapsed-time cuts.
- Before and after each action, hold the screen for 3–5 seconds. Move the cursor deliberately and avoid scrolling during important state changes.

## Clips to record

| File                          | What to show                                                                                                                                                                                                                                                                                                                                     | What it proves                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `01-app-workflow.mp4`         | Overview → New report → non-sensitive JSON dataset → report detail. Show input rows, checkpoints and resulting report. An existing completed job can be reviewed without making another model call.                                                                                                                                              | The product has a real input, worker and output.                                                                           |
| `02-live-check.mp4`           | Start Nightshift on the next planned report check, then capture Checking → finished run → Verified → model/tool history → Download report and its contents. If using an existing run, record reviewing its result and label it as recorded run evidence rather than a fresh execution.                                                           | Live model tool use and artifact verification. This healthy-report check is distinct from stalled-job recovery.            |
| `03-model-recovery.mp4`       | In neatlogs, open the existing successful Sonnet controlled recovery for `job_e0dfd0b5-ffd9-4836-b9d8-6bd82569d485`. Expand job/worker/checkpoint/error inspections, expired-lease reclaim, resume and verification. Show the 120-minute result. Record actual runtime footage if available; otherwise label this as replay of a recorded trace. | The model selected inspections and repairs; the agent resumed and checked the artifact.                                    |
| `04-safety.mp4`               | Existing active-lease refusal or escalation, with the reason visible. If using browser Controlled tests, retain the deterministic-checker and controlled-test labels.                                                                                                                                                                            | The executor refuses unsafe repairs. A deterministic boundary test is not proof of live model choice.                      |
| `05-neatlogs-improvement.mp4` | Failed run `job_89165069-ee50-4412-a193-17c49d737eef` beside the later successful recovery. Expand the failed escalation after reclaim and the later resume/verify steps. Include IDs and the relevant code change/version if available.                                                                                                         | Actual failure, development fix and later observed success. Separate jobs are comparison evidence, not one continuous run. |
| `06-entire.mp4`               | An actual checkpoint detail showing its ID, associated commit, changed files and useful build context. Show only safe excerpts of captured context.                                                                                                                                                                                              | Entire's role in preserving build context, separate from Nightshift's runtime checkpoints.                                 |
| `07-cfo.mp4`                  | The actual Nightshift cfo.ai model: pricing assumptions, inference/operating costs, forecast and runway. Keep assumptions labelled and hide billing screens.                                                                                                                                                                                     | cfo.ai produced the business plan. No forecast is claimed as actual revenue.                                               |

Raw clips can be longer than their final slots. Existing evidence should be preferred over spending credits just to record again. No new live recovery is required by this capture plan. The CLI model demo bypasses the app's persistent request ledger; do not use it as though the app budget cap protects it. If a fresh model recovery is desired, first prepare a clearly labelled, budget-capped controlled path.

The main browser lab currently uses the deterministic checker. Do not record its Run labelled check button and describe it as Sonnet performing recovery.

## Screenshots to provide

1. A readable report detail showing Verified, row count, total minutes and the run's measured model usage.
2. A recovery trace with reclaim, resume and verify visible; take additional screenshots for expanded observations/results if one screen is cramped.
3. The failed trace and the later successful trace, with their distinct IDs visible.
4. The active-lease refusal and its reason.
5. Entire checkpoint detail with its commit and changed files.
6. cfo.ai pricing/cost assumptions and forecast/runway panels, in separate screenshots if necessary.

Choose screenshots from the same runs as the clips. Do not mix the healthy 28-row check's usage with the 5-row recovery's results. Preserve the source files so every callout can be checked.

## Storage

Put raw captures in `films/nightshift-demo/captures/`, using the names above, or attach them in the chat. This folder is a proposed intake location, not permission to commit media or publish it. Review captured content before adding files to Git.

## Exact capture entry points — October 11 follow-up

Local servers were started for capture on ports 8787 (configured app) and 8792 (isolated deterministic lab). Keep the original browser session for existing reports; a different browser gets a different report list.

### Live verification

1. Open `http://127.0.0.1:8787/#/jobs` in the browser you used for the real report.
2. Open a Verified report and capture its result, checkpoints, Nightshift tool history and Download report. This needs no new model request. Existing sample job: `job_9546fc1b-069b-4b1c-8994-207863d6b233` (4 rows, 44 minutes; 2 model calls).
3. For actual Checking → Verified footage, start recording before the next planned live check. Use New report, choose `fixtures/sample-report.json`, submit, and click Start Nightshift once available. This makes live model calls and consumes the configured allowance. Do not rerun solely because a completed report cannot be started again.

### Safety refusal

1. Open `http://127.0.0.1:8792/#/lab`.
2. Start recording before clicking `active lease`, then click `Run labelled check` on the resulting job page immediately. The test lease must still be active when checked.
3. Hold on the escalation/refusal and tool history. If the lease expires while waiting, that is not the active-lease scenario needed for this shot; prepare another labelled test instead of describing an expired lease as active.
4. Retain the on-screen controlled/deterministic labels. Port 8792's Model paused badge is expected; this isolated lab has no provider credentials.

### Actual model recovery and neatlogs improvement

1. Open the signed-in neatlogs dashboard at `https://app.neatlogs.com` and choose Traces. Its documented trace view lists workflow runs; opening a row reveals the span tree and inputs/outputs.
2. Choose workflow `nightshift-report-recovery` and include October 10 in the date range. Find the successful Sonnet run by expanding `inspect_job` and matching job `job_e0dfd0b5-ffd9-4836-b9d8-6bd82569d485`.
3. Record the tree, then expand `inspect_worker`, `read_checkpoint`, `reclaim_expired_lease`, `resume_job` and `verify_artifact`. Keep the IDs and observed results readable.
4. For the improvement comparison, open earlier failed job `job_89165069-ee50-4412-a193-17c49d737eef`; capture its successful reclaim followed by escalation. Then capture the later recovery's resume and verification. These are different jobs around a development fix.
5. If those runs are not visible in the dashboard, do not assume a filter/search feature or claim the dashboard evidence exists. Capture the available Traces list so the run can be located. `RECOVERY_EVIDENCE.md` already summarizes the real local journals and can support a clearly labelled local trace replay; it does not replace actual neatlogs sponsor evidence.

Reference for the verified Traces navigation: https://docs.neatlogs.com/docs/features/traces.

### Entire

Entire evidence can be captured in the terminal; there is no need to locate a browser dashboard. In the project directory, run these read-only commands:

```sh
cd /Users/apple/Desktop/nightshift
entire checkpoint list
entire checkpoint explain --commit 7bb0de2 --short --no-pager
git show --stat --oneline 7bb0de2
```

Capture the checkpoint ID `01M4NC4K7WZ998WC30FYRAQ1X3`, associated commit and changed-file summary. The checkpoint exists locally; the CLI warned that its remote could not be reached during this inspection. Do not imply it is publicly accessible. The short explanation currently has no generated summary; summary generation is not needed for the capture. Do not show full unreviewed transcripts or run `--generate` just for the film.

If Terminal reports `Unable to read current working directory: Operation not permitted`, check its macOS Desktop-folder permission in System Settings → Privacy & Security → Files & Folders → Terminal. The owner can enable Desktop Folder access, quit/reopen Terminal and rerun the commands. This error is consistent with macOS file-access restrictions; adding Git `safe.directory` does not address it. The same repository/checkpoint commands were verified successfully from Codex on October 11. No OS permissions were changed by the agent.

### cfo.ai

Open the existing source chat in the browser signed into the owner's account:

https://app.cfo.ai/stephen-cfoai-12753144/chat/a1ab855b-b0d4-4b81-a474-2c51f7e46b46

The inspection browser currently redirects to sign-in; the owner should use their existing signed-in browser or sign in normally. In that saved chat, capture Ari's Nightshift model result and open the generated model pages. Show Main pricing/cost inputs, the 12-month forecast, and Higher price comparison, keeping scenario labels visible. The recorded baseline is $49 **per paid run**, not a monthly subscription. No new model prompt, account or subscription is required.

If the chat cannot be opened, the sanitized workbooks under `evidence/cfo/` already contain the actual exported model. Their inputs and monthly sheets are usable as exported cfo.ai evidence, labelled as such.

## What the Remotion edit supplies

An opening problem statement, a simple architecture diagram, explanatory callouts, close-ups of the supplied footage, transitions, consistent branding and an ending with reproducible links. Actual product behavior and sponsor evidence must come from the captures. Music-only playback stays a draft until the owner's narration is recorded and mixed.

Pitch reference: [Nader Dabit — How to Give a Killer Pitch or Hackathon Demo](https://gist.github.com/dabit3/caef5eee4753dd7d23767bc31e70da28). Apply its clear hook, concrete solution, focused demo and simple visuals. For Nightshift, demonstrated engineering milestones provide evidence; no customer/revenue traction is invented.
