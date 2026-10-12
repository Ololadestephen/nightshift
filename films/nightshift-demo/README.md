# Nightshift demo film

The original 101-second motion-design draft remains the `Film` composition and `out/preview.mp4`. The revised `EvidenceFilm` composition is a 175-second picture edit using the owner's actual recordings, an architecture explanation, and source-backed recovery/failure results. Voiceover is still to follow.

## Preview and source

- Revised creative output: `out/creative-v3/preview.mp4`.
- Scenes and timing: `src/evidence/`.
- Voiceover draft: `VOICEOVER.md`.
- Source files: the five `.mov` recordings and `terminal.png` in the parent `films/` directory.
- Capture provenance and original SHA-256 hashes: `CAPTURE_MANIFEST.json`.
- Local staged copies and extracted frames: `public/captures/` (gitignored).
- Minimal source-verified tool results: `src/evidence/recorded-runs.json` (derived from the two original journals named in `RECOVERY_EVIDENCE.md`; no credentials, prompts or private inputs).

## Source and claim boundaries

The app recording shows a healthy four-row report being verified (44 minutes). It is separate from the October 10 model-driven controlled recovery (five rows, 120 minutes). The two neatlogs recordings show job/worker/checkpoint inspections and repair evidence; the supplied clips do not hold on the final verification or escalation output. Those outcomes are therefore displayed as explicitly labelled local-journal excerpts, checked against the original records.

The earlier neatlogs export replayed stored events after the run, so its tiny span durations do not measure full model/recovery latency. The safety clip is explicitly a deterministic lab. Entire evidence is an actual checkpoint/commit listing; it is not relabelled as a runtime checkpoint. cfo.ai footage shows assumption-only pricing, cost and forecast figures; $49 is a price per paid recovery run. No customer or revenue traction is claimed.

Framing removes unrelated file-picker views and account/profile areas. The Entire crops exclude the author-email line. Original captures are preserved, and their hashes were checked against the staged copies. Raw recordings, source screenshots, generated media, virtual environments and render caches remain ignored by Git.

## Local checks

From this directory:

```sh
./node_modules/.bin/tsc --noEmit
node scripts/lint-film.mjs src
node --import tsx scripts/grid-check.ts src/evidence/timeline.ts --max-gap 120
```

The longer walkthrough uses a two-second timing grid for readable evidence and later narration. Its 175-second duration includes the tail and stays under the three-minute limit.

## Audio and render

The temporary synthesized music is generated locally; no model/API credit is used. It is mastered around −20 LUFS for a quiet review bed. Final voiceover mixing will replace this temporary mix decision.

```sh
node --import tsx scripts/export-cues.ts --sync src/evidence/sync.ts --timeline src/evidence/timeline.ts --out out/creative-v3/cues.json
.venv/bin/python scripts/audio/score.py --cues out/creative-v3/cues.json --score audio/evidence-score.json --out public/audio/creative-bed.wav --stems out/creative-v3/stems --json out/creative-v3/qa/score.json
bash scripts/render.sh EvidenceFilm out/creative-v3/preview.mp4 --preview --audio public/audio/creative-bed.wav --concurrency 3
```

The renderer bundles the source once, renders the local captures and frame-driven graphics, muxes AAC audio with FFmpeg, and checks format and synchronization. Do not edit scene code during a render. Review frames/reports live in `out/creative-v3/`; full validation and film-specific scan scores are in `VALIDATION.md`. This draft is not a published or submitted entry.

## Current launch/demo picture edit

The owner-selected white and cool blue cut is `LaunchFilm`, 120 seconds at 1920×1080 / 60 fps. Its source is `src/launch/`; earlier compositions and cuts are preserved. The completed current export is `out/launch-v6/nightshift-launch.mp4`, with the owner-approved local Kokoro `af_heart` narration and ducked music retained. Captions are in `out/launch-v6/nightshift-launch.srt`; a separate caption-track MP4 is `out/launch-v6/nightshift-launch-with-captions.mp4`. Player support controls caption display.

Seconds 74–88 now use the owner's `films/new video.mov`: seconds 6–10 show the actual incident Evidence page; seconds 22–26 show escalation/reclaim outputs; seconds 39–45 show resume/verification outputs. Stage an exact copy as `public/captures/incident-review.mov` to render. [CAPTURE_MANIFEST.json](CAPTURE_MANIFEST.json) records its hash and metadata. The October 12 incident review is retrospective and does not claim to have caused the October 10 fix; the captured incident is still Open. [Public evidence](../../evidence/README.md#actual-incident-page-and-final-tool-outputs) includes sanitized source crops and provenance.

To render only the updated section:

```bash
bash scripts/render.sh LaunchFilm out/launch-v6/neatlogs-section.mp4 \
  --preview --crf 14 --frames 4440-5279 --no-audio --concurrency 2
```

The delivered cut assembles the accepted v5 frames 0–4439, this 840-frame insert, then v5 frames 5280–7199, copying the original AAC stream intact. The video is re-encoded; outside-section picture encoding is not claimed bit-identical. Generated delivery files and original captures remain local, excluded from Git. Public video hosting is still pending.

```bash
node_modules/.bin/tsc --noEmit
node scripts/lint-film.mjs src
node --import tsx scripts/export-cues.ts --sync src/launch/sync.ts --timeline src/launch/timeline.ts --out out/launch-v4/cues.json
.venv/bin/python scripts/audio/score.py --cues out/launch-v4/cues.json --score audio/launch-score.json --out public/audio/launch-bed.wav --stems out/launch-v4/stems --json out/launch-v4/score.json
bash scripts/render.sh LaunchFilm out/launch-v4/preview.mp4 --preview --audio public/audio/launch-bed.wav --concurrency 3
```

Use `VOICEOVER_LAUNCH.md` for the current narration, `PITCH_LAUNCH.md` for the pitch rationale, and `LAUNCH_VALIDATION.md` for provenance, checks and remaining scanner findings. Source media is local and gitignored; `CAPTURE_MANIFEST.json` identifies the owner-provided files.

## Assistance and reused material

Nightshift's app was built with AI coding assistance; this film was directed and implemented with Codex. The Remotion film scaffold, animation utilities and render/audio/QA scripts adapt [Leon Lin's cinetic](https://github.com/Leonxlnx/cinetic), with its [MIT notice preserved](licenses/cinetic-MIT.txt). Anthony Riera's [product-film skill](https://github.com/Rieranthony/product-film-skill) informed the product framing; the pitch structure follows [Nader Dabit's guide](https://gist.github.com/dabit3/caef5eee4753dd7d23767bc31e70da28). The owner supplied the actual screen captures, selected the white/blue palette and approved the voice sample. Dependencies remain attributed through their package metadata and licenses. Kokoro model/runtime sources and licenses are recorded in `audio/launch-voiceover.json`.

The included source does not contain the owner's original recordings or generated voice/model assets. Rendering the evidence-film compositions requires those local captures; installing dependencies alone does not recreate them. The application and offline failure demonstration can be reproduced independently using the root README and `evidence/README.md`.
