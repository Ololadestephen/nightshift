# Creative picture edit — validation record

This is a local picture-edit preview. Narration is still to be recorded by the owner, then timed and mixed. It is not a published or submitted entry.

## Scope and provenance

- Remotion 4.0.529, React/TypeScript, 1920×1080 at 60 fps, 175 seconds including the tail.
- Original 101-second composition/video preserved. The earlier evidence layout was stopped after owner feedback; the new creative cut uses a report document as its opening/payoff and puts model recovery first.
- Five original recordings and one Entire screenshot were copied without altering their originals. SHA-256 checks match the six source files and staged copies.
- Reduced displayed tool outputs match the original two journals field by field. Successful recovery remains 5 rows / 120 minutes; the later live app check remains a separate 4-row / 44-minute run.
- Browser/file-picker and account/profile areas are cropped out; the Entire author-email line is outside the selected crops. Source stills and representative rendered frames were inspected.
- Historical neatlogs timings are labelled as post-run export timing. The safety test remains labelled deterministic. Financial figures remain assumptions. The paper report is an illustrated state summary, not a recreated product screen.

## Checks

- TypeScript `tsc --noEmit`: passed.
- `lint-film.mjs`: zero errors and warnings; existing brand exceptions retained.
- Timing-grid check: 9 contiguous sections, 175 seconds, zero errors/warnings, two-second evidence/narration grid.
- Changed-file Prettier and `git diff --check`: checked during implementation.
- Two visual review passes: enlarged trace/output text and corrected the recovery receipt's wrapping. Source/crop and metadata checks supplement rendering; no implementation-mirroring unit tests were added for this reversible video edit.
- A locally synthesized quiet music bed is temporary for review. Its target is −20 LUFS, not a final combined voice/music master. Audio generation reports LRA 4.42 LU and six soft section bells masked by the bed; final sound design/mixing remains for the owner's narration.
- Full encode passed: 1920×1080 at 60 fps, 10,500 frames, exactly 175 seconds, H.264/yuv420p with BT.709 limited-range tags, stereo AAC at 48 kHz. Output is about 21.4 MB. Decoded audio synchronization has zero-sample lag at all three checks; true peak −5.68 dBTP and loudness −20.01 LUFS. Reports are preserved under `out/creative-v3/qa/`.
- A post-encode source-only change moved the identical sanitized journal JSON beside its consuming module, so typechecking does not require raw capture files. Byte equality was verified; video content and timing are unchanged.

## Desloppify

Scanned only `films/nightshift-demo`, independent of the application project. Availability and Git ignore were checked. Excluded dependency, virtual-environment, generated output/audio and cache directories only: `node_modules`, `.venv`, `out`, `.remotion`, `public/audio`, `dist`, `coverage`.

| Score     | Before | After |
| --------- | -----: | ----: |
| Overall   |   16.4 |  17.2 |
| Objective |   65.6 |  68.6 |
| Strict    |   16.4 |  17.1 |
| Verified  |   65.6 |  68.6 |

All reported dimensions follow. Twenty subjective dimensions are unassessed; their zeros are scanner defaults, not authored reviews.

| Dimension         | Health | Strict | Basis                       |
| ----------------- | -----: | -----: | --------------------------- |
| Code quality      |   93.6 |   93.3 | Mechanical detector         |
| Security          |   98.9 |   98.9 | Mechanical detector         |
| File health       |  100.0 |  100.0 | Mechanical detector         |
| Duplication       |  100.0 |  100.0 | Mechanical detector         |
| Test health       |    0.0 |    0.0 | Mechanical detector         |
| Abstraction fit   |    0.0 |    0.0 | Unassessed; scanner default |
| AI generated debt |    0.0 |    0.0 | Unassessed; scanner default |
| API coherence     |    0.0 |    0.0 | Unassessed; scanner default |
| Auth consistency  |    0.0 |    0.0 | Unassessed; scanner default |
| Contracts         |    0.0 |    0.0 | Unassessed; scanner default |
| Convention drift  |    0.0 |    0.0 | Unassessed; scanner default |
| Cross-module arch |    0.0 |    0.0 | Unassessed; scanner default |
| Dep health        |    0.0 |    0.0 | Unassessed; scanner default |
| Design coherence  |    0.0 |    0.0 | Unassessed; scanner default |
| Error consistency |    0.0 |    0.0 | Unassessed; scanner default |
| High elegance     |    0.0 |    0.0 | Unassessed; scanner default |
| Stale migration   |    0.0 |    0.0 | Unassessed; scanner default |
| Init coupling     |    0.0 |    0.0 | Unassessed; scanner default |
| Logic clarity     |    0.0 |    0.0 | Unassessed; scanner default |
| Low elegance      |    0.0 |    0.0 | Unassessed; scanner default |
| Mid elegance      |    0.0 |    0.0 | Unassessed; scanner default |
| Naming quality    |    0.0 |    0.0 | Unassessed; scanner default |
| Structure nav     |    0.0 |    0.0 | Unassessed; scanner default |
| Test strategy     |    0.0 |    0.0 | Unassessed; scanner default |
| Type safety       |    0.0 |    0.0 | Unassessed; scanner default |

The final film scan has 96 open items, including 20 unassessed subjective dimensions. Mechanical findings largely concern the inherited starter's untested visual helpers/scripts and static smells. New film rendering modules have no formal unit-test coverage; rendered frame review, actual asset/journal checks and format/audio gates are the relevant verification for this change. The two added non-coverage warnings flag `EvidenceFilm.tsx` as single-use (it is the registered composition) and `evidence/sync.ts` as orphaned (it is loaded by the cue-export CLI's dynamic path); neither was suppressed or excluded. The two pre-existing security heuristics flag unguarded CLI JSON parsing and a seeded visual PRNG. Optional jscpd boilerplate detection failed; the built-in duplicate detector completed. No subjective scores, suppressions, authored-code exclusions or wontfix decisions were invented.

`scan`, `status` and `next` were run before/after. This was not a repository-wide cleanup campaign. The application engine was not changed or re-scored during this film task.
