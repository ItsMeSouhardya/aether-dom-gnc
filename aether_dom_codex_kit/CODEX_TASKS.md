# AETHER-DOM — Codex work board (ordered)

## Definition of done for each task
- Behavior actually works in a local dev browser/server.
- Tests added for domain behavior; existing tests remain green.
- No uncommitted secret values or unintended third-party runtime dependency.
- UI shows meaningful loading/error/empty states.
- Short docs explain new contracts and commands.

## Task 00 — Scaffold contracts (START HERE)
**Deliver:** `pnpm` monorepo, `apps/web` Next 16, `apps/api` FastAPI, `packages/schema` with `.cdom` JSON Schema and the supplied sample fixture, bootstrap docs and shared commands.

**Acceptance:** web runs, API health endpoint responds, sample fixture validates in Python and TS, typecheck/lint/tests pass, root README documents local setup. No real model API calls. Expose a `GET /api/v1/health` and a read-only fixture endpoint.

## Task 01 — Studio shell
**Deliver:** desktop IDE with project explorer, left node navigator, center layered stage, right inspector, bottom timeline placeholder, diagnostics tray; seed Kael/Vance project.

**Acceptance:** select shot and layer, display layer transform in inspector, browser has no console errors.

## Task 02 — Commands and persistence
**Deliver:** typed operations with expectedRevision, SQLite snapshots and command history, undo/redo, save/reload.

**Acceptance:** refresh retains changes; mismatched revision returns 409; undo reverts exactly.

## Task 03 — Dependency graph and linter
**Deliver:** graph edge indexes, invalidation traversal, simple continuous rules for physical constraints, missing assets/refs and dialect forbidden terms.

**Acceptance:** injured Kael left-arm pose in a later scene creates evidence-linked diagnostic; repairing pose resolves it; event sequence supports healing.

## Task 04 — 2.5D stage
**Deliver:** draggable/reorderable planes and sprites, SVG prop selection/edit, camera and 16:9 canvas preset, keyframe interpolation.

**Acceptance:** move one layer without affecting others; imported asset ID is preserved; save+reload identical.

## Task 05 — Audio reactive
**Deliver:** WebAudio local stems and Foley, spatial panning of bound prop, tension slider mapped to gains, audio-reactive glow driven by analyser.

**Acceptance:** play requires click, left/right move audible, no React rerender every audio sample, stable on re-seek.

## Task 06 — AI proposals
**Deliver:** provider interface with mock implementation, prompt context scoped to selected canon nodes, JSON response parsing, preview diff, approve/reject with scope permissions.

**Acceptance:** invalid response rejected; no edit until approval; stale proposal rejected/rebased.

## Task 07 — Aspect-ratio & player
**Deliver:** editable 9:16 overrides, safe-area composition, independent player route, bundle/JSON export.

**Acceptance:** both Kael and Vance stay visible in 16:9 and 9:16; player reads same manifest.

## Task 08 — Branching and exports
**Deliver:** fork, branch switch, three-way diff prototype, simple WebM output; FFmpeg MP4 optional.

**Acceptance:** branches isolate edits; conflicting branch edits identified, not overwritten.

## Later epics (NOT initial tasks)
Yjs collaboration, visual generation with ControlNet/IP-Adapter, full rig/IK, phoneme alignment, predictive saliency model, Lyria integration, telemetry/community publishing, graph/vector DB, commercial rights policies and marketplace.

## Initial Codex prompt

> Implement Task 00 from `CODEX_TASKS.md`. Read `AGENTS.md`, `AETHER_DOM_MASTER_PLAN.md`, and `sample.cdom.json`. Scaffold a local-first pnpm monorepo with Next.js 16 TypeScript web app and Python FastAPI backend. Place the canonical versioned JSON Schema in `packages/schema`, validate the sample in both TypeScript and Python, and add a health route and a fixture GET route. Write setup commands for Windows PowerShell. Do not implement AI integration, rendering engines, user authentication, or collaborative editing yet. Keep changes reviewable. Run lint, typecheck, and tests, then report results and any blockers.
