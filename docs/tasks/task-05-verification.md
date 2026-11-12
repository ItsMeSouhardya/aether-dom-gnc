# Task 05 verification — Audio reactive

Verified 12 November 2026 on Windows with Node 22.23.3, pnpm 11.25.0 and Python 3.12.14.

Branch: `feat/task-05-audio-reactive` (renamed locally from `codex/task-05-audio-reactive` at the user's request). Baseline: user Task 04 commit `f4eee75`. All Task 05 changes remain uncommitted. No push, merge or PR was performed.

## Delivered

- Original local ambient/tension/Foley PCM loops at the existing fixture IDs/URIs; deterministic stdlib generator and byte verification.
- Native Web Audio graph with explicit gesture unlock, smooth bounded gain/pan updates, headphone stereo and spatial/fallback modes, master preview volume/mute and retryable loading/errors.
- Supported finite narrative bindings drive derived music gain; editorial shot tension overrides their input. Ambient fade uses the authored gain before the final safety clamp. Unsupported/ambiguous/cyclic bindings are not executed.
- Optional document 0.3 `shot.audio.tension`; command 0.4 `setShotTension`. Lossless upgrade, exact undo/replay/restart, old versions readable, stage edits preserve 0.3. No SQL or startup document migration.
- Fixed revision-bound binary WAV endpoint/proxy, with PCM16, mono/stereo, 8–48 kHz, 30-second and 8 MiB limits. Invalid chunks, oversized/truncated files, unsafe paths and redirected/hardlinked storage are rejected.
- Shared playback transport events provide exact seek restarts without restarting sources on ordinary visual ticks. Native source stops enforce shot duration even when RAF does not run. Loading/disable/disposal use generation guards.
- Layout can audition audio while the bound sign is dragged; Escape restores its visual/audio draft without a command. Animation mode remains non-draggable. Accepted saves pause preview.
- Analyser-driven linked-prop glow, meter and gain/pan outputs update through imperative refs/subscribers. No audio sample or glow value enters React state, Zustand or canonical snapshots. Reduced motion defaults glow off, with explicit opt-in.
- Audio mixer opens in the inspector; tension appears before secondary preview controls. Existing large-stage layout, diagnostics and editing workflows remain available.

## Verification results

| Check | Result |
| --- | --- |
| Baseline pnpm test | 420 passed, 1 legacy host-limited file-symlink skip |
| Final pnpm test | API 309 + schema 74 + web 122 = **505 passed**, same 1 skip |
| pnpm lint | ESLint zero warnings, Ruff and landing syntax clean |
| pnpm typecheck | Six generated contracts match; TypeScript and strict mypy 15 sources clean |
| pnpm build | Final production build succeeded, including binary audio route |
| Full production browser suite | **76 desktop/mobile cases passed** in installed Edge |
| After final marker/state correction | All **14 audio desktop/mobile cases passed** on final source build |
| Development lifecycle | **2 cases passed**: explicit audio gesture and playback effect replay |
| pnpm verify:preserved | All 178 originals preserved; original schema/fixture match kit bytes |
| Generator --check | All three checked-in PCM fixtures reproduce exactly |
| git diff --check | Clean |

No runtime dependency or lockfile change. Original 0.1/0.2 schemas and generated document types have no diff. CI has been updated for the development audio regression but has not run remotely.

Browser mutation tests use unique ignored databases and fixture copies under isolated asset roots. API command/security tests use temporary directories. No test commands were sent to the regular user project.

## Acceptance evidence

The new mixer acceptance first failed because the Audio control was absent from the Task 04 build. Binary-loader and fixture tests recorded missing-feature RED before implementation; backend/engine workers recorded focused RED→GREEN domain checks.

Production browser cases cover explicit enable, preview without writes, save/reload/exact undo, stale two-editor rejection, missing-file retry, repeated playing/paused seeks, live bound-prop drag/pan/cancellation, analyser glow, reduced-motion opt-in and reflow. Existing Task 00–04 flows pass. The stale-editor test initially selected the unchanged default value and therefore had no draft to save; it was corrected to create a distinct second draft.

Actual browser `OfflineAudioContext` rendered the checked-in Foley through stereo panners: each selected side had RMS greater than 0.02 and the opposite side below 0.0001. Seeking to 2 seconds and 10 seconds in the 8-second loop produced identical rendered samples. This is programmatic audio-output evidence, not a claim of human headphone/speaker listening. Engine graph tests separately verify pan parameters, aligned source offsets, no duplicate voices and no ordinary-frame source restart.

## Independent review and fixes

A fresh read-only reviewer inspected all tracked/untracked Task 05 code: schema/history, WAV containment, binary proxy, pure bindings, engine scheduling and UI lifecycle. Three P2 findings were resolved:

1. Playback initially made live prop dragging unreachable. Layout now keeps preview running and accepts ephemeral audio-position drafts; a real browser drag/cancel regression verifies changing pan/glow without canonical writes.
2. Ambient fade initially clamped positive authored gain too early. A +12 dB, tension 0.9 regression reproduced the incorrect -16.113 dB; final evaluation correctly yields -4.113 dB after fading and safety clamping.
3. Looping sources initially relied on RAF to stop at shot end. Native AudioBufferSource stops now use remaining shot time. A deterministic test freezes RAF, advances the audio clock and verifies all voices end/disconnect, then re-seeks with a fresh exact end time.

Browser integration also caught a controlled time input being overwritten by frame updates, producing an unintended end-of-shot seek. The focused field now keeps its edit string until blur; repeated-seek acceptance passes. Visual confirmation exposed a timeline playhead positioned against the whole page. The lane now establishes its containing block; the new containment assertion failed before correction and passes afterward.

## Visual and runtime handoff

Desktop 1536×850 and mobile 390×844 were inspected. Tension moved ahead of secondary preview settings, checkbox sizing and loading copy were corrected, then the native browser confirmed the final mixer and no narrow-screen overflow. Runtime enabling/play/pause/disable was observed without sending a project command. Viewport override reset and preview tab retained.

Captures: `task-05-desktop.png` and `task-05-mobile.png`. Impeccable's selected product/design/Operate/craft-floor guidance was used directly because its engine cache remains unavailable; no detector score is claimed. RTK remains host-blocked.

Bundled Playwright Chromium failed with `spawn UNKNOWN`; installed Edge works through optional `AETHER_E2E_CHANNEL=msedge`. CI retains default Chromium. A previous usage-limit interruption was resumed; no unresolved blocker remains.

Regular project before and after implementation/restart: revision **6**, history **6**, schema **0.1.0**, sorted-JSON SHA256 `3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab`. Existing user changes and media were preserved; startup did not upgrade its document.

Final API: `http://127.0.0.1:8000/`, session 38567. Production web: `http://127.0.0.1:3000/` (latest session recorded in current context). Temporary production/development test services stopped normally.

## Scope and next task

This is the seeded local mixer and supported deterministic binding subset. Arbitrary audio import, speech/voice generation, reverb/DAW authoring, AI providers and export remain outside this slice. Playback buffers, volume/mute, output mode and glow are temporary. Only Save tension persists the editorial override. Next ordered task: **Task 06 — AI proposals**.
