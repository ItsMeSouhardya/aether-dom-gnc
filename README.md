# AETHER-DOM

A local-first creative IDE for semantic, cross-modal storytelling. **Task 04 — 2.5D stage** adds editable local SVG planes and sprites, camera controls and interpolated keyframes to the studio. The selected Afterlight v2 landing page remains separate and unchanged.

## Local setup — Windows PowerShell

Prerequisites: Node **22.13+**, pnpm **11.25.0**, Python **3.12+**. Task04 verified locally with Node22.23.3 and Python3.12.14. Install pnpm with `npm install --global pnpm@11.25.0` if needed. Open PowerShell at this project root; paths with spaces are supported.

```powershell
pnpm install --frozen-lockfile
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r apps/api/requirements-dev.txt
```

If `py` is unavailable, use your installed Python executable. The API launcher optionally reads root `.env.api.local`; set `AETHER_PYTHON=.venv-task04/Scripts/python.exe` there to select an alternate environment. This host uses that separate Python3.12 environment because Windows Application Control blocks a native extension in the older `.venv`; both environments remain intact. No environment activation, cloud keys, Docker, database server, accounts, or model calls are needed. Package installation needs internet; the installed scaffold uses local files and services.

Start the API in one terminal, then the web app in another:

```powershell
pnpm dev:api
```

```powershell
pnpm dev
```

Open [the local studio](http://127.0.0.1:3000/). The API seeds Neon Shogun once, then loads its saved branch. Choose a scene/shot in **Project**, then select Kael, Vance or another layer in **Layers** or on the stage. The inspector shows authored X/Y/Z, scale, rotation, pose and source references. Choose **Edit transform**, change values, then **Save transform** to commit them locally; **Cancel** discards the draft. **Undo**, **Redo** and **Change history** use the persisted command history. Reload resets temporary selection and reads the saved branch. The [seed overview](http://127.0.0.1:3000/document) remains a read-only reference to the original revision-0 fixture.

Every saved command checks its base revision and commits a new snapshot. Undo restores authored values exactly while creating a new revision. A stale draft receives HTTP 409 and cannot overwrite newer work. If a response is lost, the app blocks further writes until **Reload latest** confirms what was saved. Drafts are temporary and are discarded on selection changes or reload. Selection and drafts never write directly into canon.

Open **Diagnostics** to see Kael’s injured-arm conflict, the authored pose, constraint and injury event that support it. **Select affected layer** opens the navigable layer in the inspector. Choose **Edit pose** and save a right-arm pose, or **Review recovery** to explicitly record a described recovery event. Both paths are persisted and reversible. The scene’s shots are evaluated after its referenced events, using their maximum order; a recovery clears an injury only from its later event order. Unknown poses or ambiguous timing receive coverage warnings.

**Dependencies** shows the selected layer’s sources/dependents and the latest command’s affected nodes in evaluation order. Additions and removals use both adjacent revision graphs. Analysis is recomputed from saved canon; bindings do not rewrite transforms or audio values. **Dialect draft check** continuously checks text against the selected character’s forbidden words/phrases. This text is unsaved: the supplied document format has no attributed dialogue field. Matching preserves Unicode word marks and avoids substring matches.

The database defaults to `data/aether-dom.sqlite3` and is excluded from Git. Startup runs the checked-in Alembic migration and seeds only an absent branch. To choose another file, set `$env:AETHER_DATABASE_PATH='data/my-project.sqlite3'` in the API terminal before starting it; relative paths resolve against this workspace. Explicit migration: `node tools/api.mjs migrate`. For a backup, stop the API and copy the database file; keep your backup outside Git. Do not delete the database to apply code updates. See [API persistence details](apps/api/README.md).

The desktop shell uses side panels and a bottom timeline. Narrow screens stack the panels. **Layout** renders the four original local SVG fixtures through Three.js WebGL2, with native SVG fallback. Drag a layer to submit one transform command; Escape cancels. Arrow keys nudge focused layers; the inspector edits exact values, including offscreen layers. **Bring forward / Send backward** changes only the selected layer’s Z. **Camera** edits pan, dolly, FOV and aspect, with a16:9 reset. No canonical transform clamping occurs.

**Import SVG** accepts bounded static UTF-8 SVG shapes/groups/text and records source rights. Scripts, links, styles, external references and unsupported content are rejected. Supplied element IDs and the asset ID survive **Edit SVG** changes; the dropdown and native overlay select source elements. Save edits geometry/presentation attributes; all instances sharing that asset use the new immutable version. Safe original files and edited versions live in ignored `assets/originals/` and `assets/imported/`; back these up together with the database. The three absent audio files belong to Task05.

**Animate** enables keyframe authoring in the inspector. Seek in milliseconds, add/update/delete a frame and save explicitly. Playback linearly interpolates X/Y/Z, scale and rotation without changing base transforms or writing preview frames. Layout always edits the base transform. GPU denial/context loss preserves native editing. On desktop, opening a drawer collapses the timeline body to preserve stage space. Stop services with Ctrl+C; an unavailable API offers **Try again**.

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
- `GET /api/v1/projects/{projectId}/branches/{branchId}/document`: saved document, recent history and revision-bound analysis.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/diagnostics`: derived issues, graph and invalidation metadata.
- `POST /api/v1/projects/{projectId}/branches/{branchId}/commands`: validated transform/pose/recovery, camera, appearance, SVG import/edit, keyframe and undo/redo commands; requires `expectedRevision`, command ID, stable identities, human actor and reason.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/assets/{assetId}?revision=N`: validated SVG tree for an asset referenced by that immutable saved revision; no arbitrary file access.
- [Local OpenAPI docs](http://127.0.0.1:8000/docs).

The web server forwards only these fixed resources and preserves conflict/error status. Browser writes require same-origin JSON requests. Server-only `AETHER_API_ORIGIN` defaults to `http://127.0.0.1:8000`; copy `.env.example` to `apps/web/.env.local` only if changing it. Never use a `NEXT_PUBLIC_` variable for server configuration or secrets. Keep the API bound to loopback; this local task does not add authentication or a public service.

`packages/schema/cdom.schema.json` and the original fixture remain version **0.1.0**. `cdom.v0.2.schema.json` adds optional layer appearance/keyframes and source metadata. Both versions remain readable; the first new stage command upgrades losslessly, and undo restores the exact prior authored version and field presence. Startup performs no document upgrade. AJV and Python consume the same schemas; see [the contract guide](packages/schema/README.md).

`command.schema.json` defines command version **0.3.0**; derived analysis remains **0.1.0**. SQLite owns canonical state; React accepts only validated, revision-matched responses. Selection, drafts and the playback clock stay temporary. Semantic dialogue analysis, audio, advanced rigs, AI, auth and collaboration remain later tasks. The original fixture’s contradiction stays preserved, while saved branch repairs change its current diagnostic.

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

Next: **Task 05 — Audio graph**, following the ordered kit board and canonical-state boundaries. WebGPU and advanced rigs/Bezier editing remain deferred.
