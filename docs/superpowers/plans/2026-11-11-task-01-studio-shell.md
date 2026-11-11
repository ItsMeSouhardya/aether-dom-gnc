# Task 01 Studio Shell Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. This is execution of the user's explicitly requested existing Task 01; use the current checkout and leave changes uncommitted for review.

**Goal:** Select a seeded shot and layer in a real desktop studio shell and inspect the exact authored transform without changing canon.

**Architecture:** Reuse the validated FastAPI snapshot boundary. A per-mounted-studio Zustand store holds selection IDs only; components derive scene/shot/layer views from the document. The stage is a native DOM layout blockout with selectable layers, not a media renderer. Preserve the original read-only overview at `/document`.

**Tech Stack:** Existing Next.js 16, TypeScript, React, CSS/Tailwind foundation, Zustand 5; Vitest and Playwright.

**Spec:** aether_dom_codex_kit/CODEX_TASKS.md Task 01; AETHER_DOM_MASTER_PLAN.md sections 3.2, 4 and 11; docs/design/studio.md.

## Global Constraints

- Deliver project explorer, left node navigator, center layered stage, right inspector, bottom timeline placeholder and diagnostics tray.
- Select shot and layer; inspector reads exact schema values. No edits, save, timeline playback, generated linter results, AI, media pipeline or persistence.
- Canonical fixture/schema, API and preserved original landing/archive/source files stay unchanged.
- Keep UI selection out of serialized .cdom. No global mutable store, localStorage canon or duplicate handwritten document type.
- Follow Afterlight charcoal/sage/Manrope identity in a dense Operate layout. Desktop-first, with reachable panels and no overflow on mobile.
- Missing source media must be clearly labeled; render selectable layout geometry without fetching nonexistent fixture assets. DOM is the static fallback; defer Three.js and the full compositor to Task 04.

## Review Focus

- Scene with no shots clears stale layer/inspector and teaches recovery.
- Layer selected through navigator or stage stays synchronized and never mutates source data.
- Invalid/missing references or unknown IDs do not crash the shell or select a layer in another shot.
- Loading, offline, invalid-response and empty-document states remain truthful and retryable.
- Keyboard and narrow-screen access preserves selection, inspector and diagnostics; placeholder controls do not masquerade as implemented editing/playback.

### Task 1: Selection and document projection

**Files:** apps/web/src/features/studio/{selection.ts,view-model.ts,store.ts}; apps/web/tests/studio-selection.test.ts; apps/web/package.json and lockfile.

**Interfaces:** StudioSelection = { sceneId: string|null, shotId: string|null, layerId: string|null }. initialSelection(document), reduceSelection(document, selection, action); actions select-scene/select-shot/select-layer/clear-layer. getSceneShots, getShotLayers, layerName, stagePlacement provide derived views. createStudioStore(document) owns selection plus dispatch only.

- [x] Add tests for initial populated shot, empty scenes, shot switch reset, foreign/unknown IDs, depth order, non-mutation and independent stores; observe missing implementation failure.
- [x] Implement pure selection/projection and per-instance Zustand store. Test real authored transforms are retained; stage clamping affects presentation only.
- [x] Run web tests and typecheck.

### Task 2: Studio interface

**Files:** apps/web/src/components/studio/{studio-loader.tsx,studio-shell.tsx,project-navigator.tsx,layer-stage.tsx,layer-inspector.tsx,timeline.tsx,diagnostics.tsx,icons.tsx,studio.css}; apps/web/src/app/{page.tsx,globals.css,document/page.tsx}.

**Interfaces:** loader calls loadSnapshot; StudioShell receives document and reload callback. Navigator, stage, inspector and timeline share derived selection. No component writes document fields.

- [x] Add browser acceptance tests for shot/layer selection, exact transform fields, stage/navigator synchronization, empty-shot recovery, Escape clear and document invariance; observe failure against Task 00 page.
- [x] Move existing overview route to /document without removing its checks. Implement shell panels with native buttons/disclosures and read-only outputs; render placeholder timeline and diagnostics availability honestly.
- [x] Build fully; run desktop/mobile browser tests and inspect both in one visual pass. Fix observed defects in one batch and confirm once.

### Task 3: Integration and handoff

**Files:** README.md, PRODUCT.md, current context.md, docs/tasks/task-01-verification.md and screenshots; existing scaffold browser tests route /document.

- [x] Update docs for new default studio, overview route and deferred Task 02/03/04 work.
- [x] Run root lint/typecheck/tests/build, complete browser suite and preservation checker. Record exact results.
- [x] Fresh independent read-only review; fix substantive findings with regression tests, then record handoff. Do not commit or push.

## Execution ledger

- Baseline: clean committed checkout c23fb3e; Task 00 checks previously verified. Use feature branch feat/task-01-studio-shell in the existing checkout, consistent with workspace preference. No worktree needed; no commits/push requested.
- Read relevant project instructions, current context, task board, full master plan, selected design/product documents, Task 00 contract/evidence, current web source and local Next client/server guide. Impeccable engine remains unavailable; read project context/playbooks directly. RTK remains blocked by Windows application control.
- Approach: retain API/schema and use a selectable geometric blockout because seed media is absent. Full art/Three.js editing would add Task 04 scope. A diagram-only mock would fail selection/inspector acceptance, so this is a functional shell over real document data.

- Task 1 complete: 12 selection/projection tests passed after missing-feature red; independent UI stores and source immutability verified.
- Task 2 complete: shell implemented, original overview at /document retained. Initial browser acceptance failed on old root, then passed; final 24 browser tests pass.
- Task 3 complete: 70 unit/API tests, root lint/typecheck/build, peer/preservation checks passed. Docs and evidence updated.
- Final review: shot-name and long-title findings treated as acceptance defects (not deferred), with failing browser tests before fixes. Parent stage-height regression measured -122.8125px before fix. All three now pass; full suite 70/70 plus e2e 24/24. Navigator depth ordering corrected in same bounded batch. No deferred minors.
- Scope rulings and reviewer exclusions are recorded in docs/tasks/task-01-verification.md. Commands/persistence/linter/full rendering/playback remain ordered later tasks; DOM blockout is deliberate.
- Final sources remain uncommitted on feat/task-01-studio-shell. No merge/push. Final web preview session 59629; API session 50033.
