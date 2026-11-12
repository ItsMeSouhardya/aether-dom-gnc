# Task 03 Dependency Graph and Linter Implementation Plan

> **For agentic workers:** Use test-first execution. Root implements shared contracts and web; independent domain and persistence workers use the fixed interfaces below. Leave changes uncommitted for the user's review.

**Goal:** Explain the seeded continuity conflict with linked evidence, repair poses or record recovery through reversible commands, and inspect deterministic dependency impact.

**Architecture:** Pure Python indexes dependencies and derives revision-bound diagnostics; SQLite remains the sole canonical owner. API responses decorate committed snapshots with recomputable analysis. Explicit pose/recovery drafts use the existing revision-checked command pipeline. A local draft-only dialect checker uses authored character rules without inventing a dialogue field in canon.

**Tech Stack:** Existing Next.js/React/TypeScript/AJV, FastAPI/jsonschema, SQLAlchemy/SQLite/Alembic; Vitest/Pytest/Playwright. No new runtime dependencies.

**Spec:** `aether_dom_codex_kit/CODEX_TASKS.md` Task 03; full master plan, especially sections 4.3, 5 and 11.3. Selected product/design and `docs/design/studio.md` govern the Operate surface.

## Global constraints and decisions

- Preserve original kit, document schema/fixture, landing and archives. Reuse `.cdom` 0.1.0 injury/event/pose fields; no document or database migration is needed.
- Start from merged Task 02 `87e956e` in existing clean checkout, branch `feat/task-03-dependency-graph-linter`. Do not commit/push/merge.
- Backend graph and linter are derived, deterministic and pure. File availability is supplied as inventory; never fetch remote assets or read outside workspace `assets/` through a URI or symlink.
- Directed edges point from dependency to dependent. Include canonical references, injury events/constraints, character appearances, asset consumers, bound Foley, explicit bindings and aggregate shot/scene/project edges. Do not introduce reciprocal containment edges that manufacture cycles.
- Maintain forward/reverse indexes, bounded iterative traversal, stable ordering, topological evaluation order and explicit cycle IDs. Cycles create diagnostics and block dependent evaluation; no authored values are rewritten by bindings.
- Continuous structural/physical rules run against each committed snapshot. Simple implementation recomputes analysis completely; invalidation reports the affected subgraph for later consumers. Do not claim incremental rendering/audio evaluation or measured latency.
- Scene state is evaluated after its referenced events (maximum event order); shots have no finer event time in this format. Injury applies from its start event, stops at a later recovery event, and never retroactively clears earlier scenes. Unknown/ambiguous chronology warns rather than guessing.
- Known poses are standing and lifting_with_left_arm/right_arm. Physical checks use explicit pose semantics; unsupported pose/constraint semantics disclose limited coverage. Contradictions remain soft diagnostics, not rejected canon.
- Missing references, duplicate global IDs, mismatched membership, invalid binding paths/ranges/cycles and absent/unsafe asset files are diagnostics with stable IDs and evidence. `spatial.x/y/z` is a supported derived audio target, not an authored field to inject.
- Dialect: current canon has no attributed dialogue. Add a clearly labeled, unsaved draft checker in the selected character inspector. Match authored forbidden words/phrases case-insensitively on normalized word tokens; avoid substring false positives. Never persist draft text or infer speech from event descriptions/pose names.
- Preserve Task 02 expectedRevision/idempotency/rollback, persistent undo/redo and legacy transform-history decoding. Unknown save outcomes still require Reload latest.

## Fixed shared interfaces

Root owns `packages/schema/**`, `apps/web/**`, browser tests, root docs/context and this plan.

Domain worker owns only `apps/api/app/dependency_graph.py`, `linter.py`, `asset_inventory.py` and their new test files. Persistence worker owns `commands.py`, `repository.py`, `main.py`, additional API/repository tests, API README. Coordinate interface changes before editing another owner's files.

### Commands

Existing envelopes/operations remain valid. Advance command schema identifier to 0.2.0; document schema stays 0.1.0.

- `setLayerPose`: targetId is a character layer; args `{pose: string|null}` (nonempty string up to 128 characters). Verify target and character references. Null clears an authored pose.
- `recordConstraintRecovery`: targetId is a limb_injury constraint; args `{eventId:string,sceneId:string,order:number,description:string}`. Event ID must be globally unused; scene exists; order is a unique nonnegative safe integer greater than the start event; description length 1–1000. Create physical_recovery event, append its ID to the scene, and set constraint.resolvedByEventId atomically. Reject already-resolved constraints. No silent global event renumbering.
- Undo removes the created recovery event and scene membership and restores the prior constraint/pose exactly. Legacy Task 02 transform inverses remain readable. Every accepted action advances revision metadata.

### Analysis

`packages/schema/analysis.schema.json` defines `DocumentAnalysis`, generated TS and AJV `validateAnalysis`.

```
DocumentAnalysis = {
  revision: number,
  issues: Diagnostic[],
  graph: {nodes: {id,kind,label}[], edges: {sourceId,targetId,kind}[], cycleNodeIds:string[]},
  invalidation: {changedEntityIds:string[], impactedEntityIds:string[], evaluationOrder:string[], cycleNodeIds:string[]}
}
Diagnostic = {id,code,severity:'warning'|'error',subjectId,path,message,
  evidence:{entityId,path,message}[]}
```

- `dependency_graph.build_graph(document) -> DependencyGraph` exposes `.dependencies`, `.dependents`, `.to_dict()` and `.invalidate(changed_entity_ids, previous=None) -> dict` with the shapes above. Optional previous graph retains removed dependencies; evaluation uses current nodes/cycles. Cycles and arbitrarily long chains terminate without recursive stack dependence.
- `linter.analyze_document(document, changed_entity_ids=(), asset_status=None, previous_document=None) -> dict` returns DocumentAnalysis. `asset_status` maps asset ID to present/missing/unsafe/external/unchecked. Optional predecessor is read from an immutable snapshot for command impact. All checks are pure and non-mutating. Missing/duplicate references do not crash analysis.
- `asset_inventory.inspect_assets(document, root: Path) -> dict[str,str]` is the file adapter. Root is workspace; validate relative `assets/` paths and resolved containment before checking file existence. No arbitrary path reads or network requests.
- API adds `analysis` to saved document GET and command POST results. Derive it outside stored canonical/audit JSON from the same response document; do not independently read the head and mix revisions. Replay preserves original committed document/receipt/history; recomputable file analysis may reflect current inventory. POST invalidations use the receipt's full changed IDs; undo/redo include removed/added event/scene/constraint/character IDs.
- Add GET `/api/v1/projects/{projectId}/branches/{branchId}/diagnostics` returning the same revision-bound analysis; no-store. Existing fixture/health unchanged. Web primarily consumes bundled analysis to avoid cross-request races.
- Web validates analysis and its revision against the document before replacing the cache. Diagnostics links select affected layer and reveal evidence text/IDs/paths. Dependencies drawer shows selected-layer inputs/dependents and last command invalidation order. Pose editor and recovery review form capture their base revision and have Save/Cancel. Saving recovery explicitly asserts story canon.

## Review focus

- Recovery timing before/after a shot, missing/duplicate event orders and shuffled arrays must not silently clear an injury.
- Undo/restart/replay across old transform and new pose/recovery operations must preserve exact authored state and immutable audit history.
- Missing/duplicate/cyclic references and very deep graphs must terminate deterministically without swallowing diagnostics.
- Asset URI traversal, absolute/remote paths and escaping symlinks must not read outside allowed local assets.
- Draft text/pose/recovery reviews must not mutate canon before Save, silently rebase, or report stale diagnostics after revision changes.

### Task 1: Pure dependency and linter domain

- [x] Write tests first: fixture injured arm cites layer/constraint/start event; right-arm repair clears it; later healing clears only applicable scenes; bad chronology warns. Shuffled input order yields stable results; absent IDs/duplicates/membership/binding paths/cycles do not crash.
- [x] Verify missing-feature RED, implement indexed graph and pure rules. Test exact hand-derived dirty sets/topological order, cycle and deep-chain termination, and injected file inventory. Test path traversal/remote/symlink containment with temporary assets.
- [x] Run focused Pytest then API suite, Ruff and mypy for owned files; report evidence to root without touching user database.

### Task 2: Shared contracts and persistence integration

- [x] Add failing shared tests for new command shapes and analysis rejection, then implement/generate validators/types. Preserve document contract bytes.
- [x] Add API tests for evidence-bound analysis, pose save/undo/redo, recovery creation/removal/restart, invalid targets/orders/IDs with no writes, legacy inverse compatibility, stale revisions, replay and rollback.
- [x] Implement new pure command operations/inverses and derived API decoration. Add diagnostics route, full changed-ID receipts and API docs. Run API suite/lint/types.

### Task 3: Studio diagnostics, impact and reviewed repairs

- [x] Add web boundary tests rejecting missing/mismatched/malformed analysis. Add pure dialect tests for words/phrases, Unicode normalization, punctuation, false substrings and unsaved input.
- [x] Replace placeholder diagnostics with evidence-linked issues and coverage/asset disclosure. Add selected-node dependencies and affected-node evaluation order. Keep initial/error/empty/reload states honest.
- [x] Add explicit pose editing and recovery review drafts with captured revision and Save/Cancel; add unsaved dialect checker using character rules. Use current Manrope/charcoal/sage and accessible controls, responsive wrapping and keyboard focus.
- [x] Adapt old fixtures/mock envelopes and checks. Add browser acceptance for evidence, pose repair/undo, recovery timing/save/reload/undo, stale review and dialect draft isolation. Watch missing feature fail before implementation.

### Task 4: Integration, review and handoff

- [x] Run full lint/type/test/build/preservation, isolated production browser suite and temporary dev smoke. Inspect desktop/mobile together; fix observed defects in one batch and confirm once.
- [x] Fresh read-only whole-branch review; resolve material findings with RED→GREEN regression tests and full relevant suite.
- [x] Update README, PRODUCT, schema/API docs, studio brief, current context, evidence and this ledger. Preserve user database contents, restore preview, stop test services, leave changes uncommitted.

## Execution ledger

- Read project/kit instructions, current context, task board, full master plan, current schema/fixture, product/design/studio brief, API/schema guidance and relevant skills. Existing checkout reused per desktop instructions; no worktree created. RTK blocked by Application Control; direct commands used.
- Task 02 was committed/pushed by user as f727cc6 and merged to origin/main 87e956e. Clean main fast-forwarded; Task 03 feature branch created. Baseline suite: 151 tests passed (36 schema, 39 web, 76 Python/API).
- Design decisions above are implementation choices within the requested Task 03 scope, not additional user approvals. Existing schema has no dialogue field; draft-only dialect checking avoids an unnecessary canonical migration. Full media renderer remains Task 04; no AI or public publishing.
- Task 1 complete: graph/rules/assets adapter implemented test-first. Initial RED was missing modules; focused first GREEN 29 passed/1 skipped, then chronology/duplicate/coverage cases added. Iterative chain/cycle and contained-file tests run. Final API suite includes review regressions, 151 passed/1 skipped.
- Task 2 complete: command/analysis missing-feature RED reproduced, then contracts generated/validated. New pose/recovery, exact inverse/restart/replay/rollback and legacy history tests pass. Derived analysis stays outside canonical/audit data. No database/document migration.
- Task 3 complete: required analysis/revision/identity checks and lexical checker tests went RED→GREEN. Initial browser acceptance failed against previous UI for missing physical evidence. Studio now has diagnostics, impact, explicit repair drafts and unsaved dialect text; all 46 final browser cases pass including earlier tasks.
- Fresh whole-branch review found a P1 surrogate serialization poison and P2 integral-order parity, redirected asset root, cross-character chronology invalidation and Unicode tokenization issues. Each was reproduced and corrected, with final full-suite evidence. Portable Unicode guards also align TS/Python document keys/values; supplementary characters remain valid. Smaller orphan action and undo test race were resolved. No unresolved/deferred findings.
- Integration correction: timeline-event edges must reach character appearances, and removals need predecessor edges. Added optional previous graph/document inputs and immutable revision lookup rather than altering canon or manufacturing containment cycles. Invalidations exclude removed nodes from evaluation but retain removed changed IDs.
- Batched visual/browser inspection found stage collapse under expanded diagnostics at 1440×800. Desktop timeline body now collapses while one drawer opens; width/ratio/containment and full browser suite pass. Desktop/mobile confirmation found no additional visual defects. Screenshots/evidence in docs/tasks/task-03-verification.md.
- Final: 257 unit/API passed (61 schema, 45 web, 151 Python), 1 Windows file-symlink privilege skip; real directory-junction security test passed. Final 46 browser tests, lint/types/build/preservation passed. Temporary dev returned200 for root/diagnostics and stopped. CUA confirmed live evidence/dependencies without canonical writes. Same-path saved-document hash/revision remained unchanged across restart. Preview restored on3000/8000; temporary services stopped. User retains commit/push control on the feature branch; next Task04.
