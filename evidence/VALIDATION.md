# Evidence release validation — October 12, 2026

## Runtime behavior and tests

- `npm run typecheck`: passed for the application.
- `npm test`: **41 passed, zero failed**, using fixture/mocked model calls. HTTP tests were run with localhost binding permission. Tests do not spend model credits.
- `node --import tsx src/cli.ts demo-failure`: passed offline; saved a valid JSON report, one artifact and one uncertain resume operation.
- `node --import tsx src/cli.ts demo-failure --model`: actual Sonnet run completed and neatlogs export succeeded. Eight requests; 9,163 prompt / 1,071 completion / 10,234 total tokens. The failure is explicitly induced after artifact commit, not a production incident. One resume mutation, a fresh checkpoint inspection and artifact verification follow in the same invocation. USD billing is unavailable; maximum reservation was $0.80 using the already approved per-call estimate.
- Actual model evidence: `runs/failed-ack-live.json`. This preserves the uncertain operation, actual tool responses and usage; local file paths are omitted. Source journal and core-code hashes are recorded.
- Snapshot comparisons confirm historical before/after events match their original local journals. Both are separate controlled jobs with the same fixture input hash and pipeline version. The historical recordings use post-run span export, so no recovery-latency improvement is claimed.
- Exact pixel crops were inspected for account/browser/credential areas. Source and asset hashes are in `provenance.json`. The initial inspection screenshots do not imply final outcomes. Final escalation/verification evidence is the linked JSON.
- Entire output was exported from `entire checkpoint explain --commit 7bb0de2 --short --no-pager`; author/session/token lines were omitted, and original output is preserved locally. No generated summary is claimed. cfo.ai workbook exports were already committed; pricing, revenue and runway remain assumptions.

## Film source release checks

The accepted two-minute picture and sound are unchanged. `tsc` passed with both the application's TypeScript 5.9 and the film's TypeScript 7.0.2. The first cross-version check caught a missing `DOM.Iterable` lib declaration; adding it corrected `NodeList` iteration typing without a runtime or picture change. `lint-film.mjs`: 53 files, zero errors/warnings. Raw captures, renders, audio waveforms, model weights and virtual environments remain Git-ignored. The cinetic MIT notice and assistance/template attribution are included.

## Desloppify scope and remaining findings

Application and film are separate programs. The application scan excludes the film project, dependencies, runtime data, build/cache/coverage and worktrees. The film scan excludes its dependencies, Python environment and generated outputs/audio/cache. Authored code within either program is not excluded.

An initial exclusion update interpreted a JSON list as one literal pattern and mixed carried film findings into the default app state. The exclusion configuration was corrected. The earlier state remains preserved; a dedicated `.desloppify/app-evidence-state.json` was then used for **both** coherent application before/after scans. Do not compare its scores with the older mixed-state figures as a code improvement.

| Scope                             | Before overall / objective / strict / verified | After overall / objective / strict / verified |
| --------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Application, same dedicated state | 23.6 / 94.6 / 23.6 / 94.6                      | 23.7 / 94.7 / 23.7 / 94.7                     |
| Film, existing film state         | 18.0 / 72.1 / 17.9 / 72.1                      | 18.0 / 72.1 / 17.9 / 72.1                     |

Application mechanical dimensions:

| Dimension    | Before | After |
| ------------ | -----: | ----: |
| Code quality |   99.1 |  98.6 |
| Security     |  100.0 | 100.0 |
| File health  |   97.1 |  97.2 |
| Duplication  |  100.0 | 100.0 |
| Test health  |   84.5 |  85.2 |

Application has 32 open findings; the film has 106. Twenty subjective dimensions remain unassessed in each state, producing default zero scores; no fabricated reviews were imported. The application has three existing production smells (server nesting/stub heuristic and a submission constant), a low-confidence HTTP-test `async_no_await` warning and test coverage/review findings. The flagged HTTP helper actually awaits `fetch`/JSON below its typed parameter block, and its source was unchanged by this task; the warning remains visible rather than being cosmetically rewritten or suppressed. A newly introduced CLI complexity warning was resolved by separating command dispatch from stored-job handling.

`scan → status → next` completed before/after in each affected scope. The optional jscpd duplicate detector failed offline; built-in duplicate checks completed. No suppressions, wontfix decisions, score-target reviews, repository-wide cleanup or subagents were used. Scanner coverage scores are separate from the observed 41 passing tests.

## Publication checks

The release includes application/film source, sanitized JSON, inspected screenshots, the actual cfo.ai exports, Entire excerpt and documentation. The private `.env`, raw recordings, SQLite state, generated media and provider credentials are excluded. Known local credential values and credential/private-key patterns are checked against publication candidates without printing them. Relative evidence links and core snapshot hashes are checked before committing. Git publication is authorized by the owner; video hosting, public repair deployment, X publication and the official hackathon submission are separate outstanding actions.
