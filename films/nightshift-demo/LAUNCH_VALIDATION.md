# White and cool blue launch film — validation

Local picture edit in Remotion 4.0.529. Owner voiceover and the final combined mix remain pending. Older cuts and original captures are preserved.

## Checks completed

- TypeScript `tsc --noEmit`: passed. Frame-driven motion lint: 53 files, zero errors/warnings. Changed-file Prettier and `git diff --check`: passed.
- Timing assertion: 12 contiguous shots, 7,200 frames / 120 seconds; all motion cues fall inside their owning shots.
- Six original/copy SHA-256 pairs still match the capture manifest. Both reduced run records match original journal fields, including the completed report and earlier escalation.
- Representative stills reviewed for all scenes. One live-video crop was corrected to the final report view at source second 36. Entire crops exclude the author email; recordings exclude desktop/account chrome.
- `sheet.py` could not run because local OpenCV is absent; a contact sheet was produced with existing FFmpeg instead. No dependency was installed.
- The temporary locally synthesized bed is 120 seconds, −20 LUFS, −5.37 dBTP and 7.62 LU LRA. Audio generation flags 23 soft picture cues masked by the bed. Final SFX balance/ducking follows narration; this is not a final audio master.
- Half-size motion draft and full-size encode results are appended below when complete.

## Desloppify

Scanned only the film project before and after source changes. Dependency/generated/cache exclusions are unchanged. No authored-code exclusions, suppressions, wontfix decisions or invented subjective reviews. Optional jscpd failed; the built-in duplicate scan completed. `--offline` is not a supported scan flag; the corrected invocation used `npm_config_offline=true desloppify scan --path .`. `status`, `next` and the launch findings were inspected.

| Score     | Before launch reset | After |
| --------- | ------------------: | ----: |
| Overall   |                17.2 |  18.0 |
| Objective |                68.6 |  72.1 |
| Strict    |                17.1 |  17.9 |
| Verified  |                68.6 |  72.1 |

| Dimension         | Health | Strict | Basis                      |
| ----------------- | -----: | -----: | -------------------------- |
| Code quality      |   93.8 |   93.6 | Mechanical                 |
| Security          |   99.1 |   99.1 | Mechanical                 |
| File health       |  100.0 |  100.0 | Mechanical                 |
| Duplication       |  100.0 |  100.0 | Mechanical                 |
| Test health       |    3.5 |    1.8 | Mechanical                 |
| Abstraction fit   |    0.0 |    0.0 | Unassessed scanner default |
| AI generated debt |    0.0 |    0.0 | Unassessed scanner default |
| API coherence     |    0.0 |    0.0 | Unassessed scanner default |
| Auth consistency  |    0.0 |    0.0 | Unassessed scanner default |
| Contracts         |    0.0 |    0.0 | Unassessed scanner default |
| Convention drift  |    0.0 |    0.0 | Unassessed scanner default |
| Cross-module arch |    0.0 |    0.0 | Unassessed scanner default |
| Dep health        |    0.0 |    0.0 | Unassessed scanner default |
| Design coherence  |    0.0 |    0.0 | Unassessed scanner default |
| Error consistency |    0.0 |    0.0 | Unassessed scanner default |
| High elegance     |    0.0 |    0.0 | Unassessed scanner default |
| Stale migration   |    0.0 |    0.0 | Unassessed scanner default |
| Init coupling     |    0.0 |    0.0 | Unassessed scanner default |
| Logic clarity     |    0.0 |    0.0 | Unassessed scanner default |
| Low elegance      |    0.0 |    0.0 | Unassessed scanner default |
| Mid elegance      |    0.0 |    0.0 | Unassessed scanner default |
| Naming quality    |    0.0 |    0.0 | Unassessed scanner default |
| Structure nav     |    0.0 |    0.0 | Unassessed scanner default |
| Test strategy     |    0.0 |    0.0 | Unassessed scanner default |
| Type safety       |    0.0 |    0.0 | Unassessed scanner default |

106 open findings remain. Ten concern new launch files: seven visual-module coverage findings, two single-use composition/study findings and one cue module loaded dynamically by CLI. These were left visible; a registered composition and a CLI cue module are intentional boundaries. No implementation-mirroring unit tests were added for this reversible film work. Mechanical code-quality/security scores did not regress. Two inherited low-confidence security heuristics and twenty unassessed subjective dimensions remain. The application engine was not changed or rescanned.

## Draft render and handoff correction

The 960×540 silent draft encoded 7,200 frames / 120 seconds. The wrapper initially checked against 1920×1080 because `--spec` was omitted; rerunning `probe.py` with `--spec 960x540@60 --audio none` passed all checks. It remains a development artifact: a later frame review found description/lockup overlap during the dock. The description now enters after the dock ends. Corrected handoff frames 670/700/750 were rendered and reviewed. The reveal and close now use a cool-blue stage with white type. The full-size render bundles this corrected source; the earlier draft does not. Final source scan/status/next repeated without score or finding changes.

## Corrected 1080p encode

`out/launch-v4/preview.mp4` completed in 392 seconds, approximately 8.5 MB. All export gates pass: 1920×1080 at 60 fps, 7,200 frames, exactly 120 seconds, H.264/yuv420p and BT.709 limited-range tags, stereo AAC at 48 kHz with matching duration. Decoded audio synchronization is zero samples at all three checks; true peak −5.37 dBTP and loudness −20.01 LUFS. Reports are preserved in `out/launch-v4/qa/`. Twelve decoded scene frames were reviewed; the corrected logo handoff, evidence crops and repository close are present. Flat-field decoded RGB samples are blue [47,121,161] versus token [47,120,159] and white [243,247,251] versus token [244,248,252], within two levels per channel.

This is the completed picture-edit preview with a temporary music bed. Owner narration, final mix/ducking and captions remain for the next production pass. Nothing has been published or submitted.

## Narrated launch export — October 12

The owner approved the local Kokoro voice sample. `out/launch-v5/nightshift-launch.mp4` is the complete two-minute narrated cut. All 7,200 decoded frame checksums match the approved `launch-v4` picture. The original compressed-stream hash comparison differed after remuxing; decoded pixels were therefore compared in full. The clean primary export's video/audio stream hashes match the separately verified caption-track variant.

Narration uses `af_heart`, speed 1.03, with explicit sponsor/acronym pronunciations. The approved opening takes are reused. Six sentence takes were shortened and regenerated to fit their scenes; earlier takes remain. Each final take ends within its scene with at least 0.3 seconds of tail. The successful neatlogs proof is narrated when the after-card appears. All generated samples were checked for finite values; no speech is cropped to meet the edit.

FFmpeg applies narration normalization, music sidechain ducking and two-pass linear mix normalization. Final export gates pass: 120.000 seconds, 1920×1080 at 60 fps, 7,200 frames, H.264/yuv420p/BT.709, stereo AAC 48 kHz, approximately 7.79 MB. Decoded loudness is −16.0 LUFS, true peak −3.14 dBTP, LRA 2.7 LU. Encoded audio matches the source mix with zero-sample lag at three checkpoints.

The SRT has 28 cues aligned to actual sentence clips; opening cues follow the complete approved takes. Bounds and overlap checks pass. Extracted embedded subtitle text matches the SRT. MP4 muxing marked its first subtitle track as default despite the requested disposition, so the clean primary MP4 is supplied separately from `nightshift-launch-with-captions.mp4`. No captions are burned into the picture.

Reports, exact takes and prior attempts are preserved under `out/launch-v5/`; the asset ledger is `audio/launch-voiceover.json`. A one-off assembly assertion expected 27 rather than 28 cues and was corrected. FFmpeg's trailing progress text initially caused loudness JSON parsing to fail; decoding the JSON object separately fixed it before successful mastering/export. No application or composition code changed, so this media/documentation pass uses the non-code Desloppify exception. Earlier scanner findings remain unchanged. Full-cut listening review remains with the owner; nothing has been published or submitted.
