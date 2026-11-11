# AETHER-DOM

A local-first creative IDE for semantic, cross-modal storytelling. **Task 02 — Commands and persistence** adds explicit transform editing, durable SQLite snapshots, revision checks, undo/redo and change history to the studio. The selected Afterlight v2 landing page remains separate and unchanged.

## Local setup — Windows PowerShell

Prerequisites: Node **22.13+**, pnpm **11.25.0**, Python **3.12+**. Verified locally with Node 22.23.3 and Python 3.14.6. Install pnpm with `npm install --global pnpm@11.25.0` if needed. Open PowerShell at this project root; paths with spaces are supported.

```powershell
pnpm install --frozen-lockfile
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r apps/api/requirements-dev.txt
```

If `py` is unavailable, use your installed Python executable. No environment activation, cloud keys, Docker, database server, accounts, or model calls are needed. Package installation needs internet; the installed scaffold uses local files and services.

Start the API in one terminal, then the web app in another:

```powershell
pnpm dev:api
```

```powershell
pnpm dev
```

Open [the local studio](http://127.0.0.1:3000/). The API seeds Neon Shogun once, then loads its saved branch. Choose a scene/shot in **Project**, then select Kael, Vance or another layer in **Layers** or on the stage. The inspector shows authored X/Y/Z, scale, rotation, pose and source references. Choose **Edit transform**, change values, then **Save transform** to commit them locally; **Cancel** discards the draft. **Undo**, **Redo** and **Change history** use the persisted command history. Reload resets temporary selection and reads the saved branch. The [seed overview](http://127.0.0.1:3000/document) remains a read-only reference to the original revision-0 fixture.

Every saved command checks its base revision and commits a new snapshot. Undo restores authored values exactly while creating a new revision. A stale draft receives HTTP 409 and cannot overwrite newer work. If a response is lost, the app blocks further writes until **Reload latest** confirms what was saved. Drafts are temporary and are discarded on selection changes or reload. Selection and drafts never write directly into canon.

The database defaults to `data/aether-dom.sqlite3` and is excluded from Git. Startup runs the checked-in Alembic migration and seeds only an absent branch. To choose another file, set `$env:AETHER_DATABASE_PATH='data/my-project.sqlite3'` in the API terminal before starting it; relative paths resolve against this workspace. Explicit migration: `node tools/api.mjs migrate`. For a backup, stop the API and copy the database file; keep your backup outside Git. Do not delete the database to apply code updates. See [API persistence details](apps/api/README.md).

The desktop shell uses side panels and a bottom timeline. Narrow screens stack the panels; all selection controls remain accessible. The stage is a labeled layout blockout because source media is not bundled. Its clamped presentation does not rewrite authored transforms. Timeline tracks are placeholders, and continuity checks are not run yet. Stop each service with Ctrl+C. If the API is stopped, the page explains the failure and offers **Try again**, without silently substituting a fixture.

On macOS/Linux use `python3 -m venv .venv` and `.venv/bin/python -m pip install -r apps/api/requirements-dev.txt`; pnpm commands are identical.

## Shared checks

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:preserved
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`lint` runs ESLint, Ruff and the existing landing syntax checks. `typecheck` checks generated-contract drift, TypeScript and strict Python typing. `test` runs Vitest and Pytest, including revision conflicts, rollback, restart durability, idempotency, exact inverse transforms and UI boundaries. `verify:preserved` checks 178 original files and exact kit/schema/fixture copies. Browser tests cover editing, recovery, selection, empty/error states, keyboard use, narrow reflow and the seed overview. Build first; tests start fresh services on web port 3100/API 8100 with a unique ignored database, so they never mutate your regular project database. Those ports must be free.

Production preview: start `pnpm dev:api`, then `pnpm --filter web start`. Stop the web development server first. If Windows application control blocks mypy's compiled extension, see [the pure-Python workaround](apps/api/README.md).

## Local endpoints and contracts

- [GET /api/v1/health](http://127.0.0.1:8000/api/v1/health): service and schema version.
- [GET /api/v1/fixtures/neon-shogun](http://127.0.0.1:8000/api/v1/fixtures/neon-shogun): unchanged validated fixture, revision 0.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/document`: saved canonical document and recent history.
- `POST /api/v1/projects/{projectId}/branches/{branchId}/commands`: validated `setLayerTransform`, `undo` or `redo`; requires `expectedRevision`, command ID, stable project/branch/target IDs, human actor and reason.
- [Local OpenAPI docs](http://127.0.0.1:8000/docs).

The web server forwards only these fixed resources and preserves conflict/error status. Browser writes require same-origin JSON requests. Server-only `AETHER_API_ORIGIN` defaults to `http://127.0.0.1:8000`; copy `.env.example` to `apps/web/.env.local` only if changing it. Never use a `NEXT_PUBLIC_` variable for server configuration or secrets. Keep the API bound to loopback; this local task does not add authentication or a public service.

`packages/schema/cdom.schema.json` is canonical JSON Schema 2020-12, version **0.1.0**. AJV and Python jsonschema consume the same schema and negative fixtures. TypeScript types are generated from it; see [the contract guide](packages/schema/README.md).

`packages/schema/command.schema.json` separately defines the versioned command contract. SQLite owns canonical state; React replaces its cache only after a validated server response. Zustand holds selection IDs/actions only. General reference integrity, continuity diagnostics, media rendering, playback, AI, auth and collaboration remain later tasks. Asset paths are metadata; their files are not supplied here. Kael's injured-arm contradiction is intentionally preserved.

## Selected landing and frozen references

The landing remains dependency-free HTML/CSS/JavaScript. Root `dev`/`build` now target Next; use these explicit commands for the existing site:

```powershell
npm run landing:dev
npm run check
npm run landing:build
npm run landing:preview
```

Open [Afterlight v2](http://localhost:4173/). Stop its dev server before previewing the static build. `npm run preview` remains a landing-preview alias. The build emits only the selected page in `dist/`.

`npm run archive:afterlight` serves the frozen original on 4181; `npm run archive:signal` serves Signal on 4182. The [design archive](design_archive/README.md) remains untouched and excluded from the main landing build.

## Project map

- `apps/web/` — Next.js 16 App Router; studio at `/`, document overview at `/document`, Afterlight palette and self-hosted Manrope. `src/components/studio/` contains panels; `src/features/studio/` contains pure selection/projection and UI-only store.
- `apps/api/` — FastAPI, typed command boundary, SQLite repository and Alembic migrations.
- `packages/schema/` — canonical contract, generated types, fixture and invalid cases.
- `tests/e2e/` and `.github/workflows/ci.yml` — integration checks and complete verification workflow.
- `landing-page/` — active Afterlight v2 marketing page.
- `current context.md` — active phase, decisions, evidence and next steps.
- `PRODUCT.md`, `design_specifications/design.md` — product truth and selected visual authority.
- `design_archive/`, `design_specifications/vendor/` — preserved references.
- `aether_dom_codex_kit/`, `initial_first_plan_provided/`, `design_inspirations/` — preserved original specifications and source material.

Next: **Task 03 — Linter and dependencies**, following the ordered kit board and canonical-state boundaries. Task 04 adds the full 2.5D stage. Task 02 edits layer transforms only; timeline and diagnostics remain placeholders.
