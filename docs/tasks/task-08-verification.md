# Task 08 — Branching and exports

Completed 13 November 2026 on `feat/task-08-branches-exports`, based on the user's Task07 commit `bc4c8f0`. Changes are uncommitted and unpushed.

## Result

The studio lists branches, forks a saved revision and switches to an explicit project/branch URL. Forks preserve authored IDs and immutable assets while starting separate command and undo histories. Fork creation uses an expected revision, stable retry identity and an immutable lineage receipt in Alembic migration0003. It does not advance the source head or enter its undo stack.

Read-only three-way comparison resolves the actual common ancestor and reports independent edits, equal edits and conflicts, including missing versus null values and deletions. Arrays are atomic fields. Comparison never applies either side. Actual merge resolution and optional MP4/FFmpeg remain deferred.

The independent player exports the saved/local manifest as a bounded WebM preview: selected aspect, 24fps, up to720p, maximum30 seconds and64MiB, optional embedded stereo audio. Recording requires an explicit click; cancellation produces no partial download. It shares composition and audio evaluation with playback. Reactive analyser glow is excluded; custom or inherited SVG fonts need paths or an explicit generic font. No microphone, screen capture, remote encoding, new dependency or canonical document upgrade was introduced.

## Verification

| Check | Result |
| --- | --- |
| `pnpm test` | 790 passed:458 API,125 schema,207 web;1 existing host-limited skip |
| `pnpm lint` | ESLint, Ruff and script checks pass |
| `pnpm typecheck` | TypeScript, mypy20 source files and13 generated contracts pass |
| `pnpm build` | Production build passes after development smoke |
| `pnpm verify:preserved` |178 original files preserved byte-for-byte |
| Production Playwright, desktop/mobile |104 passed using installed Edge |
| Development lifecycle smoke, desktop |7 selected cases pass, including branch switching and real WebM |
| `git diff --check` | Pass |
| Impeccable mechanical detector | One final scan of changed UI, exit0, `[]` |

Browser cases prove source/fork isolation, reload/undo, true divergent-field conflicts, a lost-response retry using the same fork identity, bounded mobile layout, cancel/unsupported guidance, actual WebM bytes and playback. The portrait export decodes at720×1280, contains one audio track and produces nonzero audio with decoded duration1 second within5ms. Tests use isolated databases/assets; the user project receives no commands or forks.

This host's MediaRecorder returned zero bytes even for a plain canvas in headed/headless Edge with VP8/VP9 and audio disabled. A bounded WebCodecs VP8/Opus fallback handles completed empty recordings. Native encoder probes and real file decoding verified the fallback. Final video block duration, Opus pre-skip/trailing padding and partial PCM inputs have regressions, including a123ms nonaligned clip. It may encode faster than real time; UI discloses both paths. Unsupported browsers retain portable JSON export.

Fresh whole-branch review found no remaining material branch/proxy issues. Its fallback duration finding was fixed with final BlockDuration and audio DiscardPadding, then checked through native audio decoding. One batched CUA desktop/mobile pass verified fork creation, comparison and successful WebM download readiness; viewport reset and temporary tab closed. Automated captures below retain the conflict and export views. Local Edge results do not assert Safari/Firefox support or remote CI success; CI retains Chromium and the expanded smoke selection.

## Artifacts

- [Desktop conflict](task-08-desktop-branch-diff.png), [mobile conflict](task-08-mobile-branch-diff.png)
- [Desktop WebM ready](task-08-desktop-webm-ready.png), [mobile WebM ready](task-08-mobile-webm-ready.png)
- [Playable portrait WebM](task-08-desktop-portrait-preview.webm)

## Preservation and handoff

User baseline is revision11, history11 and one branch, sorted Python JSON SHA256 `08900480a857680b617c79a43b4418fef0522b81105737a120ba31093f73ce38`. Original kit, landing, archives, document schemas0.1/0.2/0.3 and seed remain preserved. Alembic0003 adds only fork lineage storage. Preview uses the final build at http://127.0.0.1:3000/ and API at http://127.0.0.1:8000/. Open **Branches** to fork/compare; open **Player** for **WebM preview**. No commit, push, merge or PR was created. Task08 completes the initial ordered task board.

## Encoding references

Container decisions were checked against [WebM container guidance](https://www.webmproject.org/docs/container/), [WebCodecs](https://www.w3.org/TR/webcodecs/), [Opus registration](https://www.w3.org/TR/webcodecs-opus-codec-registration/), [Matroska elements](https://www.matroska.org/technical/elements.html) and [Opus codec mapping](https://www.matroska.org/technical/codec_specs.html#a_opus).
