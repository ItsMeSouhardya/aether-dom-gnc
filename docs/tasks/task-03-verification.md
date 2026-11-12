# Task 03 — Dependency graph and linter

Verified 12 November 2026 (Asia/Calcutta). Work began before midnight on 11 November; plan: `docs/superpowers/plans/2026-11-11-task-03-dependency-graph-linter.md`. Branch `feat/task-03-dependency-graph-linter`, baseline `87e956e` (merged Task 02). Changes remain uncommitted for the user.

## Delivered

- Pure deterministic dependency graph with forward/reverse indexes, iterative traversal/SCC detection, stable topological order, cycle membership and blocked descendants. Canonical references, assets, bindings, character constraints/appearances and scene chronology are indexed. Impact traverses before/after revision graphs so undo retains removed-event dependencies; evaluation uses current nodes and cycles.
- Evidence-linked physical continuity, chronology, reference/membership, binding and asset diagnostics derived from the exact committed response snapshot. Analysis never enters canonical snapshots or immutable audit JSON. Bundled analysis prevents document/diagnostic revision races. A fixed diagnostics GET route is also available.
- Human-only `setLayerPose` and `recordConstraintRecovery` commands with expected revision, exact inverse operations, legacy Task 02 history compatibility, atomic persistence and full change receipts. Recovery creates its described event, scene membership and constraint resolution together. Undo removes/restores them exactly, including after restart.
- Studio diagnostics, evidence IDs/paths, navigable affected-layer selection, selected-layer dependency inspection and affected-node order. Explicit pose and recovery forms capture their opening revision and require Save. Missing assets and original fixture notes are distinguished from live continuity results.
- Live unsaved dialect text checking against the selected character’s authored forbidden terms. Unicode marks/apostrophes are preserved/normalized; word/phrase boundaries avoid substring false matches. The existing `.cdom` has no attributed dialogue field, so this tool never persists draft text or infers speech from event descriptions.
- Command contract identifier is 0.2.0; separate derived-analysis contract is 0.1.0. Original `.cdom` 0.1.0 schema/fixture and database format remain unchanged. No new dependencies, cloud services, rendering engines, AI, auth or migrations.

## Verification

| Check | Result |
| --- | --- |
| Full `pnpm test` | 257 passed: 61 contract, 45 web, 151 Python/API; 1 skipped |
| `pnpm test:e2e` | 46 desktop/mobile cases passed against production and isolated services/database |
| `pnpm lint` | ESLint zero warnings, Ruff and retained landing syntax checks passed |
| `pnpm typecheck` | Three generated contracts match; strict TypeScript and mypy passed (11 Python source files) |
| `pnpm build` | Production build passed with document, command and diagnostics routes |
| `pnpm verify:preserved` | 178 original files preserved; document schema/fixture match kit bytes |
| Development smoke | Temporary Next port 3001 compiled `/` and proxied diagnostics: HTTP 200, revision 0, 8 issues, 26 nodes; stopped afterward |
| Regular database preservation | Saved document revision and SHA-256 matched before/after API restart; no test commands sent to it |

The skipped test requires file-symlink privileges unavailable on this Windows host. The security correction is additionally covered by a real Windows directory-junction test, which passed. Tests use temporary databases/files; e2e exclusively owns ports 3100/8100 and a unique ignored SQLite file.

Domain/API checks cover exact hand-derived dirty sets, deterministic order under shuffled arrays, deep chains without recursion, cycles and blocked descendants, duplicate/missing references, membership, valid derived spatial binding paths, missing/unsafe/external asset classification, injury evidence, right-arm repair, recovery timing/ambiguity, Unicode portability, restart/redo/replay, old inverse decoding, audit/snapshot immutability and rollback. Initial missing-module/operation/schema tests failed before implementations; each review regression was reproduced before its fix.

Browser acceptance covers seeded evidence, selecting affected layers, dependencies, persistent pose repair/undo, reviewed recovery/save/reload/exact undo, stale reviews, unsaved dialect isolation, orphan-layer guidance and the retained Task 00–02 flows. Keyboard, empty/error/retry, long titles, mobile reflow and a usable 16:9 stage at 1440×800 remain covered.

## Independent review and corrections

A fresh read-only reviewer inspected the entire tracked/untracked Task 03 source against the kit, plan and review focus. Its disposable probes found:

1. **P1 — Unpaired Unicode could poison a committed branch’s HTTP serialization.** Raw-JSON pose, recovery description/event ID, actor and reason cases reproduced 500 after commit. Portable-text guards now reject these with 422 before writing, preserve valid supplementary characters, and agree across TS/Python document and command validators, including object keys. Follow-up parity tests failed before their correction.
2. **P2 — Integral decimal event orders had inconsistent semantics.** `0.0`, `1.0` and recovery `2.0` passed JSON Schema but were treated as ambiguous by a Python type check. Numeric safe-integer semantics now match the shared contract without rewriting authored input.
3. **P2 — Redirected asset roots escaped the intended directory.** A real Windows junction from assets to a private directory reproduced an incorrect present result. The adapter now verifies the assets root before resolving children and rejects redirected roots and escaped descendants.
4. **P2 — Scene-time changes omitted other affected appearances.** Recording Kael’s recovery moved the scene past Vance’s injury, changing Vance’s diagnostic without reporting his layer. Chronology edges now include appearances; command analysis reads the immutable predecessor and traverses both graphs, covering removal during undo without manufactured containment cycles.
5. **P2 — Tokenization discarded meaningful Unicode marks.** Distinct Hindi words incorrectly matched, and curly apostrophes missed straight-apostrophe rules. Mark-preserving tokenization and apostrophe normalization pass exact regressions.

Two smaller findings were also resolved: orphan layers no longer get an unusable navigation button, and recovery undo acceptance waits for the saved result before reading the database. The parent’s initial visual/browser pass caught a collapsed 2-pixel square stage at short desktop heights with expanded diagnostics. A desktop drawer now collapses the placeholder timeline body; regression asserts containment, aspect ratio and usable width. All 46 browser cases passed after these corrections.

Reviewer exclusions—incremental rendering/audio and persistent dialogue editing—match the ordered task scope. No unresolved findings or deferred minor defects remain. Review fixes were verified through regression tests and the full suites; no second reviewer was dispatched.

## Visual and live verification

Desktop/mobile diagnostics and recovery forms were inspected in one batched pass, then confirmed after the layout correction. No horizontal overflow, clipped controls or additional visual defects were observed. The timeline body collapses only on desktop while one drawer is open; mobile keeps the stacked layout. CUA confirmed the restored studio shows revision 0, Kael’s injury evidence and dependency inputs/consumer without writing canon.

- [Desktop diagnostics](task-03-desktop.png)
- [Mobile diagnostics](task-03-mobile.png)
- [Mobile recovery review](task-03-recovery-mobile.png)

## Handoff and limits

The original fixture’s contradiction remains intact; saved branch repairs change current diagnostic results. Scenes are evaluated after their referenced events (maximum order), since this format has no shot-level event timestamp. Known physical poses are standing and left/right-arm lifting; unsupported semantics and uncertain timing warn about coverage. Full analysis is recomputed; invalidation is inspectable metadata for later evaluators, not an incremental renderer/audio implementation. Seven supplied asset paths have no bundled files; the stage remains an honest layout blockout.

The existing checkout was reused. No commit, push, PR or merge was performed. Commit and push this feature branch before comparing it on GitHub. Next ordered task: **Task 04 — 2.5D stage**.

RTK remains blocked by Application Control, and Impeccable’s earlier engine-cache setup remains unavailable; direct tooling and the selected design/Operate/craft guidance were used. Approved execution outside sandbox worker restrictions completed verification. The API uses the existing supported pure-Python SQLAlchemy installation. CI has not run remotely. Current retained preview sessions are recorded in `current context.md`.
