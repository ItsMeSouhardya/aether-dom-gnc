# Local API

From the workspace root, create `.venv` and install `apps/api/requirements-dev.txt` as described in the root README. Then run `pnpm dev:api` (or `pnpm --filter api dev`). The shared launcher uses the root virtual environment and resolves paths independently of the current directory.

- `GET /api/v1/health` → `{ "status": "ok", "service": "aether-dom-api", "schemaVersion": "0.3.0", "supportedSchemaVersions": ["0.1.0", "0.2.0", "0.3.0"] }`.
- `GET /api/v1/fixtures/neon-shogun` → the validated supplied document, revision 0.
- `GET /api/v1/projects/proj_neon_shogun/branches/branch_main/document` → `{document, history, analysis}`.
- `POST /api/v1/projects/proj_neon_shogun/branches/branch_main/commands` → `{document, history, receipt, analysis}`.
- `GET /api/v1/projects/proj_neon_shogun/branches/branch_main/diagnostics` → revision-bound `DocumentAnalysis`.
- `/docs` → local OpenAPI documentation.

The API binds to `127.0.0.1:8000`; set `AETHER_API_PORT` to use a different port. Next forwards fixed health, fixture, document, diagnostics and command paths; browser requests stay same-origin without permissive CORS. Set server-only `AETHER_API_ORIGIN` in `apps/web/.env.local` if needed. Do not prefix it with `NEXT_PUBLIC_`.

The bundled fixture is validated at startup; invalid source data prevents a healthy startup. Each fixture read loads fresh JSON, validates it, and sends `Cache-Control: no-store`. The health and fixture routes remain read-only, and saved commands never change the fixture file.

SQLite owns canonical state. The database defaults to `<workspace>/data/aether-dom.sqlite3`. `AETHER_DATABASE_PATH` overrides it; relative paths resolve against the workspace, independently of the launch directory. Alembic migrations run at startup, then seed the fixture only when its project/branch is absent. Migration `0002` adds a separate proposal table and preserves all existing canonical snapshots, revisions and history. Run the same idempotent migration/seed explicitly with:

```powershell
node tools/api.mjs migrate
```

Every accepted command is saved immediately in one serialized SQLite transaction: revision check, validated snapshot, full audit command/actor/reason/timestamp, exact forward/inverse operations, and undo/redo stacks. `setLayerTransform` accepts one or more of `x`, `y`, `z`, `scale` and `rotationDeg`. `undo` and `redo` restore authored values exactly while incrementing revision metadata. New edits clear redo without deleting historical snapshots or receipts. There is no separate save endpoint.

Command contract 0.2.0 adds two continuity repairs; the canonical document stays at 0.1.0 and no database migration is required:

- `setLayerPose` targets a layer referencing an existing character and accepts `{pose: string|null}`. A string must contain a non-whitespace character and be at most 128 characters; `null` clears the pose. Unknown pose semantics remain valid authored canon and produce coverage diagnostics.
- `recordConstraintRecovery` targets an unresolved `limb_injury` constraint and accepts `{eventId, sceneId, order, description}`. The event ID must be globally unused, the scene must exist, and order must be a unique nonnegative safe integer greater than the injury's start-event order. Description must contain a non-whitespace character and be at most 1,000 characters. The command creates a `physical_recovery` event, appends its ID to that scene, and sets `resolvedByEventId` atomically. It never renumbers existing events. Saving explicitly asserts that recovery as story canon.

Undo removes a recovery event, restores the original scene event list and constraint exactly, and redo recreates it across restarts. Task 02 transform-history records remain readable. Pose receipts include layer and character IDs; recovery receipts include constraint, character, event and scene IDs, including the removed event on undo. Physical contradictions are soft diagnostics, so manual canonical edits remain possible.

Use the shared `packages/schema/command.schema.json` envelope with a unique `commandId`, route-matching `projectId`/`branchId`, `expectedRevision`, human actor and reason. Commands are validated without coercion; scale must be positive and all numbers finite. `history` contains `canUndo`, `canRedo` and the latest 20 receipts, newest first. A receipt contains `commandId`, `revision`, `op`, `targetId`, `reason`, `createdAt` and `changedEntityIds`. All document and command responses use `Cache-Control: no-store`.

Errors use FastAPI's `{detail: {code, message, ...}}`: invalid commands return 422; missing project/branch/target/scene returns 404; stale revisions return 409 with `code: REVISION_CONFLICT` and `currentRevision`; empty undo/redo, already resolved constraints and conflicting command-ID reuse also return 409. An identical command-ID/payload replay returns its original committed document, receipt and history, even after later commands or a restart.

`analysis` follows `packages/schema/analysis.schema.json`: revision, evidence-linked issues, dependency graph and invalidation. It is derived from the exact document returned in that response, never from a separately read branch head. POST invalidation uses the receipt's complete changed IDs; GET and the diagnostics endpoint analyze the current committed snapshot with no command-specific invalidation. All these responses use `Cache-Control: no-store`.

Analysis is never stored in canonical snapshots or immutable audit result JSON. On replay it is recomputed for the original revision, so file availability can change while document/receipt/history remain identical. POST impact traverses both the committed graph and its immutable predecessor, retaining dependencies of removed events during undo; current graph ordering/cycle blocking governs evaluation. The file adapter permits clean relative paths inside the actual workspace `assets/` directory, rejects redirected roots and escaping links, and never fetches remote URIs. The graph/linter recompute completely without evaluating bindings into canon or providing incremental rendering/audio. Scenes follow their referenced events; integral JSON numbers such as `2.0` retain integer chronology semantics, while ambiguous orders and unsupported poses warn about coverage. All command strings must contain Unicode scalar values; malformed surrogate text returns 422 before writing. Dialect checking remains a web-only unsaved draft because this document has no attributed dialogue field.

For a consistent manual backup, stop the API, copy the SQLite file to a separate backup path, then restart it. Restore by stopping the API and replacing the database with that backup, or point `AETHER_DATABASE_PATH` at it. Keep local databases out of Git. Startup migrations preserve existing edits; deleting the database discards them and causes the next startup to seed revision 0.

```powershell
pnpm --filter api test
node tools/api.mjs lint
node tools/api.mjs typecheck
```

Tests use `create_app(database_path=temporary_path)` or isolated repositories. App construction does not open a database; initialization occurs in the TestClient lifespan. Tests never write the user's default database.

Task 04 adds command contract 0.3.0: `setShotCamera`, `setLayerAppearance`, `importSvgLayer`, `editSvgElement`, `setLayerKeyframe`, and `deleteLayerKeyframe`. Existing operations and historical inverses remain supported. A successful new stage operation upgrades a copied 0.1.0 document to 0.2.0 and preserves later versions; startup and old operations leave 0.1.0 snapshots unchanged. Trusted internal snapshot inverses restore exact authored fields and schema versions, while revision metadata remains monotonic. Snapshot restoration is never a public command. Redo and command replay reuse the committed asset references and IDs.

Camera commands accept `{camera:{aspectRatio,position:{x,y,z},fovDeg}}` with XY ±1000, Z 0.1–1000 and FOV 1–120. Appearance accepts a nonempty partial `{visible,opacity}`. Keyframes use `{keyframeId,timeMs,transform}` with all five transform numbers; time is an integer within the shot, times are unique, IDs are globally unique and each layer has at most 128 frames. Deletion accepts `{keyframeId}`. Keyframes participate in dependency analysis through `keyframe → layer` edges, including removed IDs during undo/deletion invalidation.

SVG import targets a shot with `{assetId,layerId,name,rights,svg}`. Both IDs must be globally unused; names contain 1–80 characters and rights are `project_original`, `licensed` or `unknown`. Import creates a centered `svg_plane` and preserves sanitized source IDs. Element edits target an SVG asset with `{elementId,attributes}` and preserve its asset ID and original source. Shared layer instances reference the same edited asset. Unsupported geometry/presentation, unsafe XML, scripts, external references and redirected storage paths are rejected, never silently stripped.

`create_app(database_path=None, asset_root=None)` and `Repository` accept an isolated workspace-like asset root containing `assets/`. The default is the workspace; `AETHER_ASSET_ROOT` overrides it. Import/edit tests always inject temporary roots. Immutable accepted originals go under `assets/originals/`; sanitized content hashes choose `assets/imported/` filenames. Only metadata/URIs enter canon. Unreferenced blobs may remain after transaction rollback but are inaccessible through the API.

`GET /api/v1/projects/{projectId}/branches/{branchId}/assets/{assetId}?revision=N` returns a sanitized `SvgAsset` tree for that referenced SVG at the immutable revision; omitting revision uses current head. It never serves arbitrary paths or original XML. Missing branches/revisions/assets return 404; unsafe content/storage returns 422. Every result uses `Cache-Control: no-store`. The fixture and fixture endpoint remain 0.1.0.

Task 05 adds command contract 0.4.0 and document 0.3.0. `setShotTension` targets an existing, globally unique shot and accepts `{tension:number}` from 0 through 1. It stores only `shot.audio.tension`, preserving other authored fields and upgrading a copied older document to 0.3.0. Undo restores exact previous field presence and schema version; redo/replay remain deterministic across restarts. The normal revision check, audit, dependency invalidation and transaction boundary apply. Stage edits preserve 0.3.0 audio. Reads/startup never upgrade documents. Playback settings, decoded samples and analyser values remain outside canonical snapshots.

`GET /api/v1/projects/{projectId}/branches/{branchId}/audio/{assetId}?revision=N` returns the saved asset's binary bytes as `audio/wav`, with `Cache-Control: no-store` and `Content-Length`. Omitting revision uses the head snapshot; an explicit revision is a nonnegative safe integer. The asset must be uniquely listed as `kind:audio` and referenced by an audio track in that exact snapshot. Missing branches, revisions, references or files return 404. Invalid WAV content returns 422 `INVALID_AUDIO`; unsafe local storage returns 422 `UNSAFE_ASSET_PATH`.

Audio reads accept clean relative `assets/` URIs only. Network/absolute/traversal/encoded paths, redirected ancestors (including the workspace root and Windows junctions), symlinks and hardlinked files are rejected. Files are bounded to 8 MiB, checked before/after reading, and validated as complete RIFF/WAVE with one PCM16 format/data pair: mono/stereo, 8–48 kHz, nonempty and at most 30 seconds. Invalid/truncated chunks, mismatched frame alignment/rates, trailing bytes and unsupported encodings are rejected. There is no upload, arbitrary-path, remote-fetch or range-serving audio endpoint. Tests use temporary databases and workspace-like media roots.

The shared launcher loads the ignored workspace `.env.api.local` and accepts `AETHER_PYTHON` (an absolute interpreter path or a path relative to the workspace). Without an override it uses `.venv`. On this Windows host, Python 3.14's pinned `pydantic_core` extension remains blocked by Application Control even after an official same-version reinstall. A separate `.venv-task04` created normally with the bundled Python 3.12.14 successfully imports the pinned API packages; local config selects `AETHER_PYTHON=.venv-task04/Scripts/python.exe`. The original environment was retained; no system security policy was modified. The following pure-mypy installation is also used in that environment because its compiled wheel is blocked.

Task 06 adds command contract 0.5.0 and revision-bound AI proposal review. Document versions and health remain unchanged. The default provider is an explicitly labeled offline deterministic mock; it makes no model/network calls and has zero estimated cost. `create_app(..., proposal_provider=adapter)` and `Repository(..., proposal_provider=adapter)` accept a provider adapter for isolated tests. The adapter receives only bounded selected-node context and returns untrusted JSON, validated before a review record is stored.

- `GET /api/v1/projects/{projectId}/branches/{branchId}/agent-proposals` returns `{proposals:[...]}`, the latest 20 immutable proposal contents with their persisted review decisions.
- `POST` to that same path accepts `{requestId,expectedRevision,scopeIds,allowedOps,intent,message}` and returns a pending proposal with permission scope, context nodes/digest, provider provenance and exact authored-field diff. Intents are `repair_pose`, `move_right` and `set_tension`. Scope contains at most 8 selected IDs; permitted operations are explicitly chosen from `setLayerTransform`, `setLayerPose`, `setLayerAppearance`, `setShotCamera` and `setShotTension`.
- `POST /agent-proposals/{proposalId}/reject` under the same branch path requires JSON `{}`. Rejection persists without changing canon and is idempotent for rejected proposals. Approved proposals return 409.
- Approval uses the normal `/commands` route with a human `approveProposal` command, `targetId` set to the stored proposal ID and empty `args:{}`. The expected revision must equal both the proposal base and the current head. Replacement operations in approval arguments are forbidden.

Generation reads a consistent snapshot, releases the database transaction before provider execution, then rechecks the head under the SQLite write lock before insertion. Generate/list/reject never add a canonical revision, snapshot, command or undo entry. An identical request-ID retry returns the same proposal and latest persisted decision, even after later edits or restart; conflicting request-ID reuse returns 409. A stale request/approval returns 409 `REVISION_CONFLICT` and requires a fresh proposal against current canon.

Approval loads the server-stored proposal and revalidates its scope, evidence, operations, schema versions and exact diff under the existing command write lock. All operations, one revision, one undo entry, audit provenance and the approved decision commit atomically. A failed operation or database write rolls everything back. The receipt retains `proposalId`, `provider`, `modelVersion` and `approvedBy`. Same command-ID/payload replay returns its original committed result; a new approval command for a decided proposal returns 409 `PROPOSAL_DECIDED`. Undo/redo restores exact authored fields and schema version while retaining the historical review decision. Every proposal response and typed error uses `Cache-Control: no-store`.

Python 3.12+ is supported. Windows users may use `py` to create the environment when `python` is a Store alias. If application control blocks mypy's compiled wheel, install its pure Python distribution without changing system policy:

```powershell
$env:MYPY_USE_MYPYC = '0'
.\.venv\Scripts\python.exe -m pip install --force-reinstall --no-cache-dir --no-binary mypy mypy==2.4.1
Remove-Item Env:MYPY_USE_MYPYC
```

If Application Control blocks SQLAlchemy's compiled extension, install its supported pure Python build at the same pinned version:

```powershell
$env:DISABLE_SQLALCHEMY_CEXT = '1'
.\.venv\Scripts\python.exe -m pip install --force-reinstall --no-cache-dir --no-binary sqlalchemy sqlalchemy==2.1.8
Remove-Item Env:DISABLE_SQLALCHEMY_CEXT
```
# Task07 player manifest boundary

`GET /api/v1/projects/{projectId}/branches/{branchId}/player-manifest?revision=N`
returns an exact immutable saved snapshot plus embedded sanitized SVG and bounded
base64 PCM16 WAV. Omitting revision captures one head snapshot. `download=1`
returns the identical validated object as attachment `aether-dom-rN.cdom.json`.
Responses use `Cache-Control: no-store`; no history, proposals, environment data,
export jobs, or canonical writes enter this path. All asset reads remain contained
local safe-reader operations; external URIs are never fetched. Missing, unsafe,
unsupported, unknown-rights, or oversized media fails atomically with actionable422.

The wrapper shares `packages/schema/player-manifest.schema.json`, membership and
identity checks, and the cross-language fixture cases. Limits are32MiB JSON,
64 media entries,8MiB per WAV, depth32, and200000 JSON nodes, with conservative
numeric serialization allowance. The unchanged canonical version lives inside
`document`; only the manifest contains embedded media.

Human command0.6 `setShotLayoutOverride` replaces/removes one shot's9:16 transform
map atomically, preserving base layers, other aspect maps, and document version.
It uses the existing optimistic revision/idempotency/history transaction and exact
private snapshot inverse. A no-op or foreign/ambiguous layer target is rejected.
