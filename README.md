# AETHER-DOM

A local-first creative IDE for semantic, cross-modal storytelling. **Task 00 — Scaffold Contracts** provides a Next.js 16 web app, a read-only FastAPI service, and the shared `.cdom` schema. The selected Afterlight v2 landing page remains separate and unchanged.

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

Open [the local workspace](http://127.0.0.1:3000/). It reads and validates the supplied Neon Shogun fixture, displaying scenes, cast, branch and revision. Stop each service with Ctrl+C. If the API is stopped, the page explains the failure and offers **Try again**, without silently substituting a fixture.

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

`lint` runs ESLint, Ruff and the existing landing syntax checks. `typecheck` checks generated-contract drift, TypeScript and strict Python typing. `test` runs Vitest and Pytest. `verify:preserved` checks 178 original files and exact kit/schema/fixture copies. Browser tests cover real fixture loading, failure/retry, invalid/empty data, keyboard use and narrow reflow at desktop/mobile sizes. Build first; tests start services on default ports if free and reuse running services otherwise. CI uses fresh services.

Production preview: start `pnpm dev:api`, then `pnpm --filter web start`. Stop the web development server first. If Windows application control blocks mypy's compiled extension, see [the pure-Python workaround](apps/api/README.md).

## Read-only endpoints and contract

- [GET /api/v1/health](http://127.0.0.1:8000/api/v1/health): service and schema version.
- [GET /api/v1/fixtures/neon-shogun](http://127.0.0.1:8000/api/v1/fixtures/neon-shogun): unchanged validated fixture, revision 0.
- [Local OpenAPI docs](http://127.0.0.1:8000/docs).

The web server forwards these two GET paths, keeping browser requests same-origin. Server-only `AETHER_API_ORIGIN` defaults to `http://127.0.0.1:8000`; copy `.env.example` to `apps/web/.env.local` only if changing it. Never use a `NEXT_PUBLIC_` variable for server configuration or secrets.

`packages/schema/cdom.schema.json` is canonical JSON Schema 2020-12, version **0.1.0**. AJV and Python jsonschema consume the same schema and negative fixtures. TypeScript types are generated from it; see [the contract guide](packages/schema/README.md).

Validation checks structural shape. Reference integrity, continuity diagnostics, commands, persistence, undo/redo, rendering, playback, AI, auth and collaboration are later tasks. Asset paths are metadata; their files are not supplied here. Kael's injured-arm contradiction is intentionally preserved. There is no authoring surface or write API yet.

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

- `apps/web/` — Next.js 16 App Router; read-only document overview, Afterlight palette and self-hosted Manrope.
- `apps/api/` — FastAPI, shared schema boundary and fixture service.
- `packages/schema/` — canonical contract, generated types, fixture and invalid cases.
- `tests/e2e/` and `.github/workflows/ci.yml` — integration checks and complete verification workflow.
- `landing-page/` — active Afterlight v2 marketing page.
- `current context.md` — active phase, decisions, evidence and next steps.
- `PRODUCT.md`, `design_specifications/design.md` — product truth and selected visual authority.
- `design_archive/`, `design_specifications/vendor/` — preserved references.
- `aether_dom_codex_kit/`, `initial_first_plan_provided/`, `design_inspirations/` — preserved original specifications and source material.

Next: **Task 01 — Studio shell**, following the ordered kit board and canonical-state boundaries. Task 00 does not implement the editor.
