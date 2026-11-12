# Task 07 — Aspect-ratio & player verification

Completed13 November2026 (Asia/Calcutta) on `feat/task-07-aspect-player`, based on the user's committed/pushed Task06 `32912ca`. Task07 remains uncommitted; no push, PR or merge was performed.

## Delivered slice

Human command0.6 `setShotLayoutOverride` replaces/removes a shot's9:16 transform map through expected-revision validation, dependency invalidation, audit and exact snapshot undo. Targets must be uniquely owned/listed by that shot. Base layers, other aspect maps and document versions remain unchanged. No document schema upgrade, SQL migration, new dependency or new AI permission was added.

Studio aspect controls select a temporary preview. Portrait stage drags, keyboard nudges, depth controls and the dedicated numeric inspector edit alternate transforms only. Fit subjects creates an unsaved visible draft; Save commits one map, Cancel discards it. Use base transforms drafts removal and requires Save. Guides inset5% at sides/10% vertically. Bounds account for camera, rotation and depth at time zero; existing animation deltas rebase on the alternate layout. Hidden/missing/clipped subjects disclose their state. Background cropping and future keyframe movement are not represented as universally safe.

The independent `/player` route uses the shared composition, projection, Three.js/native SVG renderer, playback clock and Web Audio engine. It loads an exact saved revision or a locally opened JSON bundle; shot/aspect changes reset clock/audio, and audio requires an explicit enable gesture. Keyboard, seek, empty/loading/error/retry and narrow layouts are supported. No canonical editing action exists in the player.

The read-only `player-manifest` endpoint captures one immutable saved revision. Its wrapper contains the exact document plus only referenced sanitized SVG trees and PCM WAV base64. Export JSON uses that same validated manifest, excludes drafts and gives busy/error feedback. Downloaded files reopen with API requests blocked, including audio decoding/playback. Canonical asset references remain unchanged. The initial bundle format is JSON, as permitted by master-plan4.1; ZIP, standalone executable HTML and video are not part of this task.

Shared schema/generated types and TS/Python semantic validation enforce32MiB total,64 assets,8MiB per WAV,200000 tree values and depth32. Validation rejects unsafe SVG, malformed Unicode/nonfinite values, bad/missing/duplicate identities, ownership/reference errors, unknown rights, unsupported media, unsafe paths, invalid canonical base64 and invalid/truncated WAV. Existing contained local readers perform media access; there is no remote fetch fallback. Errors abort assembly before a partial bundle is returned. No history/proposal records are exported.

## Final checks

- **674 unit/API tests passed**:404 Python/API,109 shared-schema,161 frontend. One legacy host-limited file-symlink test skipped; existing junction containment tests remain active.
- **94 production desktop/mobile browser cases passed** on a stable build using installed Edge.
- **5 development smoke cases passed**, covering effect replay, explicit audio enable, proposals, portrait save and export/local-file playback. CI includes the same smoke selection with standard Chromium; remote CI has not run.
- Zero-warning ESLint/Ruff, strict TypeScript/mypy (18 API source files), all generated-type drift checks and production build passed.
- `pnpm verify:preserved` passed:178 original files and exact kit/schema/fixture byte copies remain preserved.
- `git diff --check` checked before handoff; no secrets, runtime dependency or lockfile change introduced.

Baseline585 tests passed before changes. Missing composition/proxy/editor modules, portrait controls, export button and backend command/endpoint/contracts produced RED failures before implementation. Browser coverage proves no save before approval of a draft, alternate-only edits, reload/undo, stale rejection, active-aspect draft preservation, clean inspector refresh after a nudge, explicit export failure guidance and invalid local-file rejection. Portable-file acceptance blocks all API requests before opening the downloaded file and enabling/playing its embedded audio.

## Review and corrections

A fresh read-only whole-branch review inspected tracked/untracked changes against32912ca, including media/security/state boundaries. Its two P2 findings were fixed with RED→GREEN regressions:

1. Fit initially used base transforms while rendering evaluated a keyframe at zero. The regression reproduced a supposedly fitted subject outside the frame. Fit now measures the evaluated pose and inverts its animation delta back into the saved override base, preserving subsequent motion.
2. Clicking the already-active portrait button initially cleared stage preview while retaining dirty form fields. The browser regression reproduced the split. Active-aspect clicks now preserve the draft and lock state.

Root integration also caught a clean inspector retaining an old revision after a nudge; clean forms now refresh while dirty forms retain their captured revision. Arrow nudges select their target. The final visual/browser correction fixed portrait inspector padding, a thumbnail-sized mobile portrait stage, and a fixed footer grid row that made mobile status text overflow. All affected browser checks passed afterward. No material review finding remains.

## Visual and runtime evidence

One batched desktop1536×850/mobile390×844 inspection checked the editor and independent player; one correction batch and confirmation completed. Both subjects are visible in landscape and the fitted portrait. Portrait now uses a tall mobile frame and a padded, readable inspector. Viewport override reset and isolated visual tabs/services closed. Impeccable context loaded successfully this task; the mechanical detector ran once over changed UI and returned `[]`. No score or performance claim is inferred.

Final captures: `task-07-portrait-studio-desktop.png`, `task-07-portrait-studio-mobile.png`, `task-07-portrait-player-desktop.png`, `task-07-portrait-player-mobile.png`.

Regular user database before/after: revision6, history6, schema0.1.0; sorted Python JSON SHA256 `3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab`. No command was sent to it; all mutations used isolated temporary/test data. Its read-only revision6 manifest returns version1.0.0 with seven embedded assets. Startup leaves existing canon intact.

Final preview: web `http://127.0.0.1:3000/` (session72760), API `http://127.0.0.1:8000/` (session58633); studio/player/health return200. Use9:16 → Fit subjects → review → Save portrait layout, or Player/Export JSON. Existing `.venv-task04`/`.env.api.local` retains the healthy pinned Python3.12 environment. RTK0.42.4 was used. Temporary visual8200/3200 and e2e8100/3100 services stopped. Next ordered work: **Task08 — Branching and exports**.
