# Local API

From the workspace root, create `.venv` and install `apps/api/requirements-dev.txt` as described in the root README. Then run `pnpm dev:api` (or `pnpm --filter api dev`). The shared launcher uses the root virtual environment and resolves paths independently of the current directory.

- `GET /api/v1/health` → `{ "status": "ok", "service": "aether-dom-api", "schemaVersion": "0.1.0" }`.
- `GET /api/v1/fixtures/neon-shogun` → the validated supplied document, revision 0.
- `GET /api/v1/projects/proj_neon_shogun/branches/branch_main/document` → `{document, history}`.
- `POST /api/v1/projects/proj_neon_shogun/branches/branch_main/commands` → `{document, history, receipt}`.
- `/docs` → local OpenAPI documentation.

The API binds to `127.0.0.1:8000`; set `AETHER_API_PORT` to use a different port. The Next server forwards fixed health, fixture, document and command paths; browser requests stay same-origin and require no permissive CORS configuration. Set server-only `AETHER_API_ORIGIN` in `apps/web/.env.local` if needed. Do not prefix it with `NEXT_PUBLIC_`.

The bundled fixture is validated at startup; invalid source data prevents a healthy startup. Each fixture read loads fresh JSON, validates it, and sends `Cache-Control: no-store`. The health and fixture routes remain read-only, and saved commands never change the fixture file.

SQLite owns canonical state. The database defaults to `<workspace>/data/aether-dom.sqlite3`. `AETHER_DATABASE_PATH` overrides it; relative paths resolve against the workspace, independently of the launch directory. Alembic migration `0001` runs at startup, then seeds the fixture only when its project/branch is absent. Run the same idempotent migration/seed explicitly with:

```powershell
node tools/api.mjs migrate
```

Every accepted command is saved immediately in one serialized SQLite transaction: revision check, validated snapshot, full audit command/actor/reason/timestamp, exact forward/inverse transforms, and undo/redo stacks. `setLayerTransform` accepts one or more of `x`, `y`, `z`, `scale` and `rotationDeg`. `undo` and `redo` restore authored values exactly while incrementing revision metadata. New edits clear redo without deleting historical snapshots or receipts. There is no separate save endpoint.

Use the shared `packages/schema/command.schema.json` envelope with a unique `commandId`, route-matching `projectId`/`branchId`, `expectedRevision`, human actor and reason. Commands are validated without coercion; scale must be positive and all numbers finite. `history` contains `canUndo`, `canRedo` and the latest 20 receipts, newest first. A receipt contains `commandId`, `revision`, `op`, `targetId`, `reason`, `createdAt` and `changedEntityIds`. All document and command responses use `Cache-Control: no-store`.

Errors use FastAPI's `{detail: {code, message, ...}}`: invalid commands return 422; missing project/branch/layer returns 404; stale revisions return 409 with `code: REVISION_CONFLICT` and `currentRevision`; empty undo/redo and conflicting command-ID reuse also return 409. An identical command-ID/payload replay returns its original committed result, even after later commands or a restart.

For a consistent manual backup, stop the API, copy the SQLite file to a separate backup path, then restart it. Restore by stopping the API and replacing the database with that backup, or point `AETHER_DATABASE_PATH` at it. Keep local databases out of Git. Startup migrations preserve existing edits; deleting the database discards them and causes the next startup to seed revision 0.

```powershell
pnpm --filter api test
node tools/api.mjs lint
node tools/api.mjs typecheck
```

Tests use `create_app(database_path=temporary_path)` or isolated repositories. App construction does not open a database; initialization occurs in the TestClient lifespan. Tests never write the user's default database.

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
