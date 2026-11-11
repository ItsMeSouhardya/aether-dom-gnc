# Task 02 Commands and Persistence Implementation Plan

> **For agentic workers:** Use the test-first execution workflow. Backend and web implementation may proceed independently after the shared command/API interfaces below are fixed. Leave changes uncommitted for the user's review.

**Goal:** Save layer-transform edits locally, reject stale revisions, and undo/redo exactly across refresh and API restart.

**Architecture:** SQLite is the single canonical owner, accessed through SQLAlchemy and an Alembic migration. Shared JSON Schema defines typed setLayerTransform/undo/redo commands. Validated commands commit a new immutable snapshot and audit receipt atomically. React keeps only a server-confirmed document cache; Zustand remains selection-only. The original fixture route stays immutable.

**Tech Stack:** Existing Next.js 16/React/TypeScript/AJV/FastAPI/jsonschema; SQLAlchemy 2.1.8, Alembic 1.20.1, local SQLite; Vitest, Pytest, Playwright.

**Spec:** aether_dom_codex_kit/CODEX_TASKS.md Task 02 and AETHER_DOM_MASTER_PLAN.md sections 3, 4.2, 10 and 11.

## Global constraints and decisions

- Preserve original kit, .cdom schema/fixture bytes, landing and archives. Add a separate versioned command schema; no canonical document migration is necessary.
- Implement one authored operation: setLayerTransform with a nonempty partial transform (x/y/z/scale/rotationDeg), plus typed undo/redo. No arbitrary JSON patches, agent writes, new project/branch creation, linter, rendering engine or playback.
- Require commandId, projectId, branchId, expectedRevision, human actor and reason on every command. Commands target stable IDs; input is not coerced or repaired.
- Every accepted action, including undo/redo, increments project.revision and active branch headRevision. Undo restores authored values exactly; revision metadata stays monotonic.
- Seed SQLite only when the project/branch is absent. Persist every revision snapshot and immutable command/audit record, forward/inverse operation, actor/reason/time, and branch undo/redo stacks. A new edit clears redo, while historical receipts remain.
- Use a serialized SQLite write transaction around revision check, apply/validation, snapshot/history/stacks update and commit. A stale expectedRevision returns HTTP 409 with no writes. Two concurrent writes from the same base have exactly one winner.
- Reusing a commandId with identical payload is idempotent; different payload under the same ID returns 409. Return the original committed result on exact replay.
- SQLITE file defaults to workspace data/aether-dom.sqlite3, ignored by Git. AETHER_DATABASE_PATH overrides it; relative paths resolve against workspace root. Alembic initial migration runs at startup and can be invoked explicitly. Tests use temporary databases only.
- Reuse Afterlight Operate styling. Add an explicit transform draft form, Save transform, Cancel, Undo/Redo, saved/saving/error/conflict states and recent change history. No optimistic canonical mutation. Network/timeout/invalid save responses require reload before further writes because outcome may be unknown.
- No external publishing/commit/push. Existing main was fast-forwarded to merged a1e4526; work branch feat/task-02-commands-persistence.

## Fixed shared interfaces

Canonical command schema: packages/schema/command.schema.json. Generated TS type CdomCommand; AJV validateCommand(value). Command version is 0.1.0 via schema ID. Human actor shape is {kind:'human',id:string}. setLayerTransform requires targetId and args containing one or more transform fields; undo/redo have no targetId or args. All envelopes require reason.

API:

- GET /api/v1/projects/{projectId}/branches/{branchId}/document returns ProjectSnapshot.
- POST /api/v1/projects/{projectId}/branches/{branchId}/commands accepts CdomCommand and returns CommandResult.
- Preserve GET /api/v1/health and GET /api/v1/fixtures/neon-shogun unchanged.
- ProjectSnapshot = {document: CdomDocument, history: {canUndo:boolean, canRedo:boolean, entries: CommandReceipt[]}}.
- CommandReceipt = {commandId:string, revision:number, op:'setLayerTransform'|'undo'|'redo', targetId:string|null, reason:string, createdAt:string, changedEntityIds:string[]}.
- history.entries is the latest 20 receipts, newest first. CommandResult = ProjectSnapshot & {receipt:CommandReceipt}. Store full inverse/forward data internally even though public receipts are concise.
- Error responses: FastAPI detail object {code:string,message:string,...}; 422 malformed/invalid command, 404 missing project/branch/target, 409 revision conflict/command ID reuse/empty undo-redo. Revision conflict code REVISION_CONFLICT includes currentRevision. Existing fixture stays revision 0.
- Python create_app(database_path: Path|None=None) constructs isolated test apps. Repository path/lifecycle never writes a user database from a unit test. TestClient's lifespan initializes/migrates/validates seed.
- Next exposes only document GET and command POST for the corresponding paths, preserves upstream status/detail, requires JSON for writes, rejects cross-origin Origin headers, and returns no-store. No catch-all proxy or secrets in client code.

## Review focus

- Refresh/restart durability, exact inverse application and independent immutable snapshots.
- Concurrent/stale requests, command-ID replay and failed validation produce no partial writes.
- Redo survives restart, clears on a new edit, and empty stacks fail honestly.
- Invalid or uncertain write responses never produce a false saved state or overwrite a newer server snapshot; reload recovers.
- Unsaved transform draft is separate from canon, validation rejects blank/non-finite/invalid scale values, selection remains UI-only, responsive controls are accessible.

### Task 1: Shared contract and tests

**Files:** packages/schema/command.schema.json, scripts/generate-types.mjs, src/command.generated.ts, src/commands.ts, src/index.ts, tests/commands.test.ts.

- [x] Add positive/negative command tests, watch missing validator fail, implement AJV and generated-type drift support.
- [x] Keep .cdom schema and fixture unchanged; run schema tests/typecheck.

### Task 2: Python domain and persistence (backend implementer)

**Files:** apps/api/app/{main.py,commands.py,repository.py,persistence/*}; apps/api/alembic.ini, migrations/*, requirements.txt, tests/*, README.md; tools/api.mjs for migrate command if needed.

- [x] Write meaningful failing tests for command shape/apply, save/reload across repository restart, stale/concurrent writes, inverse/redo sequences, idempotency and rollback.
- [x] Implement pure apply/inverse helpers, canonical validation, SQLAlchemy repository and Alembic migration. Persist every accepted action atomically, with full audit history.
- [x] Add API endpoints and isolate existing tests with temporary app/database factories. Verify Pytest, Ruff, mypy and migration idempotence.

### Task 3: Web command boundary and editing (root implementer)

**Files:** apps/web/src/lib/project-api.ts, project-proxy.ts, app/api/v1/projects/* routes, features/commands/*, components/studio/{studio-loader,studio-shell,layer-inspector,transform-editor,command-history,studio.css}, features/studio/store.ts, tests/*; tests/e2e/*, playwright.config.ts.

- [x] Write failing contract/client/proxy/draft tests. Implement response validation and fixed-path Next forwarding with correct 409 handling.
- [x] Load persisted snapshot; submit commands with current revision and unique ID, replace cache only from validated response, serialize UI actions and require reload after unknown outcome/conflict.
- [x] Implement explicit transform drafts, save/cancel, undo/redo controls, saved/error states and recent audit history. Update UI-only store dispatch to read the current document.
- [x] Adapt old studio mocks to the persisted document endpoint. Keep fixture-overview checks. Add e2e edit/reload/undo/redo, stale two-client conflict, failed-write and invalid-draft checks; use an isolated e2e database with dedicated API/web ports.

### Task 4: Integration and handoff

**Files:** README.md, PRODUCT.md, current context.md, docs/design/studio.md, docs/tasks/task-02-verification.md, .gitignore, .env.example, plan ledger and screenshots.

- [x] Document database path, migration/backup semantics, auto-save-on-command behavior, API contracts and deferred Task 03.
- [x] Run full root lint/typecheck/tests/build/e2e/preservation; inspect desktop/mobile once, fix observed defects in one batch and confirm once.
- [x] Fresh read-only review of complete change; resolve substantive defects with regression tests. Leave branch ready for user commit/PR.

## Execution ledger

- Read relevant project instructions, current context, task board, full master plan, contract/API docs, selected design, current studio and local Next route-handler guidance. Original plans and prior task evidence are available in conversation and project.
- Baseline: 70 unit/API tests passed before code changes. Task 01 is merged in a1e4526; clean checkout fast-forwarded and feat/task-02-commands-persistence created.
- RTK remains blocked by Windows application control. Impeccable engine cache is unavailable from prior attempts; existing selected design/Operate guidance governs the narrow form/state additions.
- Implemented the fixed contract, domain/repository/migration and complete studio integration. Missing-feature tests failed before implementation; regression runs reproduced both oversized-integer acceptance and valid-origin rejection before their fixes.
- Final verification: 151 unit/API tests, 34 desktop/mobile browser tests, lint/types, normal production build, temporary development startup, dependency consistency, migration idempotence and preservation passed. Fresh review confirmed corrections and reported no remaining concrete source findings.
- Inspected desktop/mobile drafts and persisted history; CUA confirmed local preview selection/edit/cancel. Evidence and environment details: docs/tasks/task-02-verification.md. Current context updated. Changes remain uncommitted on feat/task-02-commands-persistence; preview services restored, temporary services stopped. Next ordered task is Task 03.
