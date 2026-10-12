# Nightshift judging review — 2026-10-12

Provisional reviewer estimates, based on the evidence available today. These are subjective assessments, not predictions of the judges' scores. Official rubric: https://neatlogs.com/hackathon. Each category is scored out of 100, then weighted.

| Criterion                          | Official weight | Estimate | Weighted points |
| ---------------------------------- | --------------: | -------: | --------------: |
| The agent                          |             30% |       78 |           23.40 |
| Use of neatlogs, Entire and cfo.ai |             25% |       78 |           19.50 |
| Demo video                         |             20% |       84 |           16.80 |
| Building in public                 |             15% |       55 |            8.25 |
| Usefulness and originality         |             10% |       70 |            7.00 |
| Total                              |            100% |          |           74.95 |

Rounded estimate: **75/100**. Individual estimates have substantial judgment uncertainty. Local execution evidence is stronger than evidence currently available through the public submission materials.

This assessment predates the subsequent evidence release. The owner then authorized publishing the evidence/code and adding a runtime failed-action demonstration. Its completed live run and updated validation are indexed in [the evidence page](../evidence/README.md); the scores below remain the earlier assessment rather than an invented post-release regrade.

## Basis and deductions

**Agent — 78.** Actual Sonnet-driven structured tool use and controlled recovery are recorded. SQLite state, saved checkpoints, lease expiry/generation checks, idempotency, artifact reconciliation and escalation are implemented. The successful recorded run progresses from stalled through reclaim, resume and verification with zero mismatches. The separate healthy check verifies a four-row/44-minute report. Scope is one small application-owned pipeline. The tool catalog selects the supported repair class from observations; the model chooses inspections or a supported action/escalation within that catalog. The submission needs a stronger explanation of the model's contribution. Tool exceptions currently trigger immediate code-owned escalation (`src/agent.ts`); the before/after sequencing defect shows an implementation improvement between runs rather than an agent choosing recovery after a failed action inside one run. The official evidence requirement asks for a failed action and what the agent did next. Do not mislabel the development fix as that evidence. Safe escalation can be disclosed honestly; successful retry is not universally required by the published wording. The verifier shares `aggregate()` with the generator, with an independent reference test as a partial safeguard.

**Required-tool usage — 78.** neatlogs exports and actual failed/successful run evidence exist. New instrumentation wraps model/tool execution; historical exported span timings are explicitly distinguished from runtime latency. Entire checkpoint `01M4NC4K7WZ998WC30FYRAQ1X3` is attached locally to commit `7bb0de2`; build checkpoints remain separate from runtime checkpoints. cfo.ai supplied actual baseline/higher-price forecast exports with assumptions for price, inference, infrastructure, revenue and cash. Both scenarios have zero funded runway because the first month's cash is negative; later assumed sales do not remove that gap. Deductions: sponsor evidence is scattered, some strongest materials are local, Entire's contribution to a particular coding decision needs clearer explanation, and business demand/cost assumptions remain unvalidated. No forecast is scored as actual revenue.

**Demo — 84.** The owner approved the white/cool-blue picture and Kokoro voice sample. The narrated cut is exactly two minutes, with actual proof inserts, recovery, safety, neatlogs improvement, Entire and cfo.ai coverage. Format, frame preservation, audio timing and loudness checks pass. Technical quality supports the presentation score; it does not itself prove comprehensibility. Full-cut listening review remains with the owner. Sponsor architecture/implementation/reasoning/result coverage is brief, especially Entire and cfo.ai. The final video currently has no verified public link.

**Building in public — 55.** Public GitHub repository and event-dated commits verified. Owner supplied a live progress post: https://x.com/Stephenololade/status/2109426447471260114. Browser inspection confirmed the project lesson, three tool names, `#neatHack`, an attached image and October 12 date. This raised the initial conservative estimate from 20 to 55. One late-stage update is verified; no sustained progress thread, additional project posts or qualitative community discussion has been verified. Transient view/like counts and follower count were not used to assign the estimate.

**Usefulness/originality — 70.** Picking up an interrupted report and checking its original artifact is a concrete operational problem. Checkpoint reuse and active-worker protection give the prototype a clear safety story. Checkpoint recovery/idempotency are established techniques; the demonstration covers a small synthetic pipeline. No customer interviews, production outcomes, willingness to pay or broad recovery claims are verified. Explain why model-guided investigation helps this bounded use case without claiming an advantage that has not been measured.

## Fresh verification

- `npm run typecheck` passed.
- Initial sandboxed `npm test`: 30 passed; six HTTP tests failed with `listen EPERM` because localhost binding was denied. Reran the unchanged suite with localhost permission: **36 passed, zero failed**, using fixtures/mocked models. No live model calls or sponsor spending.
- Public GitHub API reports `private: false` and `main` at `eda70e8e3e4c06c5e141a05d9b69bb7df14e1734`.
- Local `HEAD` is `7bb0de24bb60d6da4ef81c473901a4294dc16713`; tracking status is ahead by one commit. `.gitignore` and `hackathon.md` are modified; the film project remains untracked, with generated/raw media ignored. Do not equate local evidence with published evidence.
- Current film: `films/nightshift-demo/out/launch-v5/nightshift-launch.mp4`. Its reports and exact narration are recorded in `films/nightshift-demo/audio/launch-voiceover.json`.
- Direct web retrieval of the supplied X post failed; a read-only browser inspection succeeded. No X interaction or publication was performed.

## Next actions, in priority order

1. Prepare a public evidence index: comparable before/after outcomes, failed-action/next-step trace, Entire checkpoint/commit context, cfo.ai forecasts/runway caveat, test results and the verified progress-post URL. Sanitize exports; preserve failures and distinguish fixture/model runs. Review and publish this alongside the current code with authorized Git actions.
2. Demonstrate a failed action and the subsequent safe decision in the labelled environment. Use a supported known case and existing policy. If the next decision is escalation, say so. A live model-driven retry/reconciliation demonstration would strengthen the entry if available; do not invent it or spend credits during this review.
3. Publish the completed video at a judge-accessible URL and check it logged out. Summarize the mechanism and contribution of each sponsor in the evidence index. A publicly hosted repair service is not a stated prerequisite; deploying one is a separate approved task.
4. Verify check-in/team identity and the final Discord cutoff. Prepare the official submission quote post with team, name, project, public repository and demo link. The published planned window is October 12, **14:30–19:25 Lagos time**; Discord controls the final cutoff. The existing progress post is not the official submission quote post.

Expected score improvements are speculative until new evidence is verified. Publication eligibility and completeness are separate from the numerical estimate. No code changes, deployments, Git mutations, public posts or submission occurred in this review. Documentation-only; Desloppify execution skipped under the non-code exception.
