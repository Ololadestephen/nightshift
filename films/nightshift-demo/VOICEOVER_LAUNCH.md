# Launch film voiceover — 120-second edit

The owner approved the local Kokoro `af_heart` sample. This is the final recorded script at speed 1.03. Sentences were generated separately and fitted to the accepted picture edit; the approved opening takes are reused. Earlier long takes remain in the output folder.

| Scene | Voice starts | Voice ends |
| --- | --- | --- |
| hook | 0.450s | 6.828s |
| reveal | 8.200s | 14.646s |
| inspect | 16.350s | 27.431s |
| repair | 28.150s | 37.649s |
| resume | 38.400s | 45.004s |
| verified | 46.350s | 52.711s |
| live | 54.350s | 63.159s |
| safety | 64.350s | 73.685s |
| improvement | 74.350s | 87.265s |
| entire | 88.200s | 97.616s |
| economics | 98.350s | 109.232s |
| close | 110.350s | 118.501s |

**hook** — When a report job stops, its completed work may still be saved. The next step depends on the evidence.

**reveal** — Meet Nightshift. An AI agent for stalled report jobs. Investigate. Repair. Verify.

**inspect** — In this controlled Sonnet run, the job was stalled. The worker lease had expired, and parsing was saved. Nightshift inspected the job, worker, checkpoint, and errors before acting.

**repair** — The model selects the tools. Code enforces scope, leases, generations, and request limits. The expired lease was reclaimed into generation two.

**resume** — Nightshift resumed from the saved checkpoint. The action was applied, and the report moved into verification.

**verified** — Report totals: five rows, one hundred and twenty minutes. Input reconciled. No mismatches.

**live** — Upload non-sensitive data. Download the report. This separate healthy check verified four rows and forty-four minutes, using two model calls.

**safety** — Active workers stay protected. In the labelled safety lab, a deterministic checker escalated the active lease. No reclaim, and no model calls.

**improvement** — neatlogs exposed an earlier sequencing defect. Reclaim succeeded, but resume was not offered next. With the tool catalog corrected, a later run resumed and verified its report.

**entire** — Entire connects coding context to repository checkpoints and commits. These build checkpoints are separate from Nightshift’s runtime recovery checkpoints.

**economics** — cfo.ai helped model recovery pricing and operating costs. We also tested a higher-price scenario. These are assumptions. No actual customers or revenue.

**close** — For small teams running their own report pipelines. Pick up where work stopped. Explore Nightshift in our public repository.

## Export and sound status

Completed export: `out/launch-v5/nightshift-launch.mp4` — exactly 120 seconds, 1080p60, narrated and mixed to −16 LUFS. The accepted white/blue picture is preserved: all 7,200 decoded frame checksums match the earlier cut. Audio synchronization passes with zero-sample lag; decoded true peak is −3.14 dBTP.

Captions: `out/launch-v5/nightshift-launch.srt` contains 28 cues following actual sentence-clip boundaries. The caption-track variant is `out/launch-v5/nightshift-launch-with-captions.mp4`; players control display. The primary MP4 has no subtitle track, preserving the clean picture presentation.

Clean narration: `out/launch-v5/voice-only.wav`. Final mix: `out/launch-v5/soundtrack.wav`. Provenance, exact pronunciation text, hashes and technical QA: `audio/launch-voiceover.json`. Full-cut listening review remains with the owner. Publication and submission remain separate tasks.
