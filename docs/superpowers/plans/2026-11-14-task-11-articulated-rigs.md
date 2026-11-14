# Task11 Articulated Rigs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use Superpowers
> subagent-driven-development or executing-plans, one task at a time. Check off
> steps with evidence. User handles commits/push; omit routine commit steps.

**Goal:** Add one original articulated Kael-inspired SVG rig with reversible bone
poses/frames, canon-aware diagnostics and matching studio/player/WebM playback.

**Architecture:** Optional layer-owned rig in document0.5; command0.8; shared pure
FK and copied SVG group transforms. Existing native fallback presents rig scenes;
the same shared plan supplies per-frame WebM. Current SQLite command/inverse and
asset-rights authorities remain unchanged.

**Tech Stack:** Existing JSON Schema/AJV/generated TS, FastAPI/SQLite, React/Next16,
Three.js/native SVG, Vitest/Pytest/Playwright. No new dependency or SQL migration.

**Spec:** `../specs/2026-11-14-task-11-articulated-rigs-design.md`, implementing the
user-requested Task11 in `aether_dom_codex_kit/TASKS PT2.md`. The user selected the
Kael-inspired separate rig. Mechanical field/interface choices are builder-owned
within that requested scope; no additional feature approval is needed.

## Global Constraints

- One layer-owned rigid SVG rig,1–32 bones,1–32 attachment slots,128 total bone
  frames; no IK/skinning/Task12+ work. Positive local angles are clockwise in SVG
  x-right/y-down coordinates. Rest x/y±10000; angles±360; frame time within shot.
- Preserve earlier schemas/generated types/fixtures, original Kael/Vance drawings
  and media, selected landing and frozen/vendor archives. No startup upgrade or
  regular-project mutation. New original fixtures have documented provenance.
- Human typed commands, expectedRevision, validation, invalidation, audit and exact
  inverse snapshots own every edit. Provider permissions remain the old allowlist.
- One shared evaluator and clock; runtime matrices/preview trees never enter canon.
  Native, both aspects, offline manifests and WebM evaluate the same pose/time.
- One SVG source supplies direct-root named group slots; preserve source IDs and
  paint order. Rights/evidence cover that whole original asset. Reject malformed
  bindings before accepted canon/export. Keep legacy flat scenes working.
- User controls commit/push. Reuse clean existing checkout/new feature branch;
  Antigravity's other worktree stays untouched. Isolated DB/media for all writes.

## Review Focus

1. Pose/frame invalidation must not reach sibling bones through an ownership cycle.
   Task2 tests exact child/slot dirty sets and old/new graph behavior on undo.
2. Native/GPU/WebM caches must not freeze a rig at the first frame. Task3 tests
   distinct actual group matrices and decoded WebM frames, including seek.
3. Source/attachment mismatch and bad parent graphs must fail at canonical/import/
   portable seams without changing originals. Tasks1/2 test malicious/cyclic refs.
4. Stale/removed-target/busy drafts must retain captured text and never retarget a
   save. Task3 tests slow save, Undo removal, Cancel and reload recovery.
5. Injury semantics are explicit; angle changes alone never invent a story action.
   Task2 checks injury chronology/recovery/unknown action with source evidence.

---

## Task 1 — Shared rig contract, validation, FK and SVG application

**Files:** create `packages/schema/rig.schema.json`, `cdom.v0.5.schema.json`,
`src/rigs.ts`, `src/rig-svg.ts`, generated rig/V5 types,
`fixtures/rig-cases.json`, `tests/rigs.test.ts`; modify `command.schema.json`,
`scripts/generate-types.mjs`, `src/index.ts`, `src/commands.ts`; create
`apps/api/app/rigs.py`, `tests/test_rigs.py`; modify API `contracts.py` and health
expectation, web `src/lib/snapshot.ts` and compatibility test.

**Interfaces:** Consume current SvgAsset/SvgData/ValidationIssue. Produce exact
Rig/RigBone/RigAttachment/RigBoneKeyframe shapes in the spec, exported from schema.
`validateRig(value:unknown)` returns `{valid:true,rig}` or `{valid:false,issues}`.
`validateRigBindings(rig:Rig,svg:SvgData):ValidationIssue[]` returns empty when valid.
`Matrix2D=[number,number,number,number,number,number]`;
`evaluateRig(rig:Rig,timeMs:number,animate=true):RigEvaluation`, where evaluation
contains `{boneMatrices,attachmentMatrices}` keyed by stable IDs.
`applyRigToSvg(asset:SvgAsset,rig:Rig,timeMs:number,animate=true):SvgAsset` returns a
copy or throws a bounded Error for invalid rig/bindings. Python equivalents are
`validate_rig`, `validate_rig_bindings`, `evaluate_rig` with matching math/results.
Use existing Python issues-list conventions; record their exact signatures in report.

- [x] Add failing shared TS/Python cases for one root, cycle/missing parent, invalid
  slot, duplicate/global IDs, finite bounds,32/33 bones and128/129 total frames,
  duplicate per-bone times, shot-time limits and old-version rejection.
- [x] Add FK expectations: root rest(10,20), child offset(5,0), root pose90° gives
  child world translation(10,25); unrelated sibling local pose remains unchanged
  when the child rotates. Pin base/time0/interpolation/hold,180→-180 linear path,
  finite/negative-time behavior and no mutation. Compare shared matrices1e-9.
- [x] Observe RED; implement bounded validators, exact0.5 dispatch and command0.8
  unions (importRigLayer/setRigBonePose/setRigBoneKeyframe/deleteRigBoneKeyframe
  args exactly in spec). Validate semantic rig ownership/global IDs/timing in0.5.
- [x] Apply posed×inverse-rest matrices before each existing group transform;
  direct-root group validation prevents double/ancestor transforms. Test source
  identity at rest, paint order, nonzero viewBox, invalid references and immutable
  source payload hashes. Preserve native/export clipping semantics explicitly.
- [x] Generate/check types; run schema suite, focused Python and affected snapshot
  compatibility/type checks. Record exact RED/GREEN commands and counts.
- [x] Independent task-scoped spec/quality review; fix Important findings before2.

## Task 2 — Original fixture, reversible commands, graph, canon and portable data

**Files:** new `assets/fixtures/kael-articulated.svg`,
`assets/fixtures/kael-articulated.rig.json`, fixture provenance notes; new API
`app/rig_commands.py`, `tests/test_rig_api.py`, `tests/test_rig_analysis.py`;
modify `commands.py`, `stage_commands.py` only where needed, `main.py`,
`dependency_graph.py`, `linter.py`, `player_manifest.py`, relevant tests;
schema `src/player-manifest.ts` and shared portable rig cases/tests.

**Interfaces:** Consume Task1 rig validation/math and exact command args. Produce
public command results through existing repository envelopes/inverses and fixed
`GET /api/v1/fixtures/articulated-rig` with no-cache bounded
`{templateVersion:'1.0.0',name,svg:string,rig:Rig}`. Templatecanonical IDs are placeholders
that UI remaps before import; source element IDs never remap. The source raw string
is inert and undergoes existing server SVG validation/storage on import. Use fixed
checked-in paths only. No new media kind or arbitrary filesystem endpoint.

- [x] Add failing isolated tests for template integrity, import membership/character/
  ID collisions, missing group, source root transform, all pose/frame operations,
  no-op/conflict/replay/undo/redo/restart/fork, invalid timing/129-frame budget and
  original-byte preservation. Earlier document versions stay unchanged until edit.
- [x] Implement accepted rig operation on a copy, use existing SVG store and
  restoreStageSnapshot inverse format. Return changed bone/frame IDs for pose/frame
  edits; import returns all newly introduced IDs plus normal shot dependencies.
- [x] Register nested rig/bone/slot/frame records and JSON pointers. Add acyclic
  layer/source→rig→root, parent→child, frame→bone, bone→slot, slot→shot dependencies.
  Verify sibling bones excluded and removed frames/undo still invalidate consumers.
- [x] Reuse existing scene-order/injury/recovery semantics for explicit `lift` and
  left_arm/right_arm via layer.characterId; include bone/constraint/event/scene
  evidence. Unknown non-null semantics warn, angle-only changes make no claim.
  Keep old flat-pose rules and all existing fixture issue behavior.
- [x] Validate rig/source bindings in server assembly AND both offline validators.
  Keep portable SVG as unchanged source; rig pose lives only inside document0.5.
  Reuse existing rights/proof/payload verification and wrapper1.0/1.1 scope.
- [x] Run focused RED/GREEN and complete API/shared suites, strict mypy/lint/types,
  generated contracts and preservation. Review this stage before3.

## Task 3 — Bone editor, shared playback/native/WebM and browser acceptance

**Files:** new `apps/web/src/components/rig/{rig-panel.tsx,rig-pose-editor.tsx}`,
`src/features/rig/{draft.ts,template.ts}`, `src/lib/rig-template-api.ts` and fixed
proxy route; update `studio-shell.tsx`, `layer-stage.tsx`, `layer-inspector.tsx`,
timeline only as needed, command draft/receipt allowlists/history labels,
`features/stage/{render-plan.ts,gpu-renderer.ts}`, `components/player/player-session.tsx`,
`features/export/webm-plan.ts`, studio styles; new pure/loader tests and
`tests/e2e/rigs.spec.ts`.

**Interfaces:** Consume Task1/2 types/template endpoint. `RenderLayer` keeps optional
rig; shared `stageRenderPlan` calls applyRigToSvg for rigs without changing source.
Add optional runtime `RigPreview={layerId,boneId,rotationDeg}` as a final argument,
preserving existing callers. Its application copies only the targeted bone and
suppresses its saved frames for that visual preview. Parent captures revision and
passes preview only while that revision/target remain valid. `importRigLayer` uses
fresh instance-prefixed IDs; graph/source IDs retain their different namespaces.

- [x] Read installed Next server/client/route guides, React guidance and Impeccable
  craft-floor immediately before UI edits. Inspect incumbent Task10 captures.
- [x] Add meaningful failing tests for template response bounds/shape, fresh ID
  remapping, draft numeric validation and rig frame markup changing at time0/1000ms
  while flat markup and source hashes remain unchanged.
- [x] Add Add original rig for the selected shot/character, then Rig inspector with
  bone hierarchy and attachment selection. Use separate readable modules/forms,
  current styling and44px narrow targets; no crowded new header tool row.
- [x] Pose editor captures layer/bone/revision, previews through shared evaluator,
  reviews before/after angle/action and saves through the normal controller. Canon
  diagnostics update after accepted Save; do not infer action from an angle.
  Freeze drafts while busy; preserve captured text across stale/unknown/removed
  target and recover through Cancel/reload. Do not retarget on selection changes.
- [x] Add explicit bone-frame add/update/delete review and seek. One clock drives
  layer and bone frames; frame preview can seek temporarily. Cancel clears visual
  override and leaves saved rendering at that playhead. No runtime matrices stored.
- [x] Route rig-containing scenes through existing native fallback; leave flat GPU
  caching unchanged. Both LayerStage and player already subscribe to playback time;
  render actual posed SVG at each tick. Show bounded rig errors rather than crash.
- [x] Serialize evaluated rig markup per WebM frame; retain static cache for flat
  sources. Preserve overflow/viewBox semantics between native and frame SVG.
- [x] Real isolated browser flow: add rig → select bone/slot → preview/cancel →
  review/save/reload/undo/redo → bone frame/seek/play → both aspects → saved JSON →
  API-blocked player → decoded real WebM with distinct animated frames. Include
  injury evidence/unsupported semantics, keyboard/mobile, slow save, stale and
  removed-target recovery. Assert actual group matrices/frame differences.
- [x] Run affected tests/types/build then full production E2E and lifecycle smoke.
  Parent owns one batched desktop/mobile visual inspection, one correction/
  confirmation ceiling and one detector run; fresh finish review/documenter follow.
- [x] Independent task-scoped review before final integration handoff.

## Task 4 — Final review, evidence and handoff

**Files:** README, API/schema README, PRODUCT, studio/player briefs,
`docs/tasks/task-11-verification.md`, final captures/WebM evidence, current context
and Task11 progress in TASKS PT2. Do not modify old CODEX_TASKS content/archives.

- [x] Prepare exact tracked/untracked feature diff from2874c26. One fresh whole-
  change reviewer evaluates the design, boundaries and full evidence; fix material
  findings in one wave with meaningful regressions and scoped re-review.
- [x] Final lint,17+generated contracts/strict TS/Python, complete unit/API, production
  build, affected/full browser and development checks; original/resource/media/user
  DB preservation; git diff --check. Record actual counts, skips and limitations.
- [x] Update plan/context/board and hand off working controls, exact evidence,
  integration state and Task12 as the next separate request. No commit/push.

## Execution ledger

Detailed recovery/brief/report/diff records live in the ignored plan-owned
`.superpowers/sdd/2026-11-14-task-11-articulated-rigs/`. Baseline: clean2874c26,
1067 tests/5 existing host skips, regular revision28/history28 and8 media files.
RTK remains host-blocked; bounded file APIs and isolated approved verification
processes are the existing fallback. User selected a Kael-inspired separate rig.

Completed15November2026. Final evidence: `../../tasks/task-11-verification.md`.
1164unit/API/schema/web passes,5existinghostskips;140finalproductioncases;36earlier
developmentlifecyclecases. Whole-review I1/docM1 fixed and scoped-approved; M2–M4
remain nonblocking test maintenance. User handles commit/push. Task12 unstarted.
