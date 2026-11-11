# Task 00 Scaffold Contracts Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Track evidence here and in current context.md.

**Goal:** Run a local Next.js 16 app and FastAPI service against one versioned .cdom contract, without cloud keys.

**Architecture:** packages/schema owns the supplied JSON Schema 2020-12 and unchanged Neon Shogun fixture. AJV and Python jsonschema validate the same contract. The web app reads the API through same-origin Next route handlers and displays a small, read-only fixture overview.

**Tech Stack:** pnpm 11, Node 22, Next.js 16, React, TypeScript, Tailwind 4, AJV, Vitest; Python 3.12+, FastAPI, jsonschema, Pytest, Ruff, mypy.

**Spec:** aether_dom_codex_kit/CODEX_TASKS.md Task 00 and AETHER_DOM_MASTER_PLAN.md sections 3, 4, 11, 14. The user explicitly requested implementation of that existing plan and authorized routine adjustments; execute inline.

## Global Constraints

- Preserve original kit, initial proposal, landing-page and frozen design_archive files.
- Canonical schemaVersion is 0.1.0; preserve supplied schema and fixture bytes.
- No AI integration, rendering engine, authentication, editing, persistence, collaboration, or Task 01 shell.
- Windows PowerShell setup; local execution without Docker or credentials.
- GET /api/v1/health and GET /api/v1/fixtures/neon-shogun are read-only.
- Inherit Afterlight v2 charcoal/sage, self-hosted Manrope, fine dividers, visible focus. Operate mode: quiet document overview, no marketing hero or fabricated status.

## Design and scope decisions

An isolated product scaffold is the coherent option: migrating the established landing page into Next would mix marketing and product work; implementing the IDE panels now would exceed Task 00. Keep the landing available through landing:* commands and run the product at port 3000, API at 8000. Root dev/build target the product; existing landing scripts remain available under explicit names. Existing npm run check continues checking the landing source.

The preliminary schema checks structural shape, not reference integrity or canon continuity. Keep that distinction explicit. The intentional injured-arm contradiction and unresolved asset URI metadata remain unchanged for later tasks. Generated TypeScript types come from the schema and are checked for drift. API loads and validates the fixture, serves a fresh document, and offers no write route. The UI validates API payloads before use and distinguishes API unavailable, invalid response, empty data, loading, and success states.

## Review Focus

- Malformed/unsupported document versions fail in both validators without coercion or mutation.
- API failure/malformed payload never produces a false connected state; retry recovers.
- Read-only routes reject writes and responses cannot mutate the seed.
- Setup and shared commands work from paths containing spaces on Windows.
- Original landing/archive/kit files remain unchanged, and no sample asset is falsely rendered or played.

### Task 1: Workspace and shared contract

**Files:** root package.json, pnpm-workspace.yaml, .gitignore; packages/schema/{package.json,cdom.schema.json,fixtures/sample.cdom.json,fixtures/invalid-cases.json,src/index.ts,src/cdom.generated.ts,tests/contract.test.ts,scripts/generate-types.mjs,tsconfig.json}; root eslint.config.mjs.

**Interfaces:** validateCdom(value: unknown) returns {valid:true, document:CdomDocument} or {valid:false, issues:ValidationIssue[]}; ValidationIssue has path/message. Export CdomDocument generated from canonical schema. Validation neither mutates nor coerces input.

- [x] Copy original schema/fixture and add shared invalid cases (version, required fields, revision, traits, enum, nested transform, unknown keys).
- [x] Add Vitest tests for fixture acceptance and negative cases; observe failure before validator implementation.
- [x] Implement AJV 2020 validator and type generation/drift check; run tests and typecheck.

### Task 2: FastAPI boundary

**Files:** apps/api/{package.json,pyproject.toml,requirements.txt,requirements-dev.txt,app/__init__.py,app/contracts.py,app/main.py,tests/test_contracts.py,tests/test_api.py}; tools/api.mjs.

**Interfaces:** validate_document(document: object) -> list[dict[str,str]]; load_fixture() -> dict[str,Any]. Health returns status/service/schemaVersion; fixture returns unchanged validated document. Paths resolve relative to source, independent of cwd. Python interpreter comes from root .venv.

- [x] Write contract and TestClient tests for health, fixture, rejected writes, independent reads, and shared negative cases; observe missing feature failure.
- [x] Implement schema validation and GET routes, with startup validation and explicit response typing.
- [x] Run Pytest, Ruff, mypy and live HTTP smoke checks.

### Task 3: Next application

**Files:** apps/web/{package.json,tsconfig.json,next-env.d.ts,next.config.ts,postcss.config.mjs,src/app/*,src/lib/*,public/fonts/*,tests/*}; playwright.config.ts; tests/e2e/scaffold.spec.ts.

**Interfaces:** same-origin GET /api/v1/health and /api/v1/fixtures/neon-shogun forward only known FastAPI paths. Server-only AETHER_API_ORIGIN defaults to http://127.0.0.1:8000. Client loadSnapshot fetches health/fixture concurrently, validates both, and has bounded request timeouts.

- [x] Write network boundary tests (success, non-2xx, invalid JSON/schema, unavailable health); observe red before implementation.
- [x] Implement read-only document overview, loading, unavailable/error, empty lists and retry. Use selected tokens and local font.
- [x] Verify real browser desktop/mobile, keyboard, retry and API outages with Playwright and visual inspection. No speculative studio controls.

### Task 4: Bootstrap, integration and handoff

**Files:** README.md, PRODUCT.md, current context.md, packages/schema/README.md, apps/api/README.md, .env.example, .github/workflows/ci.yml, lockfiles; tools/verify-preserved.mjs.

- [x] Document PowerShell install/venv/dev/check/build commands, endpoints, contract boundaries and deferred tasks.
- [x] Add CI for generated-type drift, lint/typecheck/tests/build and live e2e smoke.
- [x] Run root lint, typecheck, tests, build, e2e; verify preservation hashes and frozen manifest.
- [x] Fresh independent code review, resolve substantive findings, record exact evidence and limitations.

## Execution ledger

- Reading complete before first mutation: 66 Markdown files. Root read 25 project/product files; reference readers read all 41 vendored files completely. Oversized reads were repeated in bounded segments where needed.
- Environment: no Git repository exists, so use the authorized current directory; do not initialize Git or create/claim commits/worktrees. RTK is installed but blocked by Windows application control. Python 3.14.6 is available through py; python alias is unavailable. Impeccable context launcher failed; project context and playbooks read directly.
- Pre-flight: contract is the sole shared input to API and web; no alternate schema or typed handwritten domain model.

- Task 1 complete: canonical copies preserved, generated-type drift check passed, 20 TS contract tests passed.
- Task 2 complete: 32 Python/API tests passed; live health/fixture HTTP 200, no writes.
- Task 3 complete: 6 web boundary tests and 10 desktop/mobile e2e checks passed; development and production startup verified.
- Task 4 complete: local lint/typecheck/tests/build/preservation checks passed; bootstrap docs, CI configuration and evidence written. Remote CI not run (no Git repo/remote).
- Final review: one Important finding fixed. Python non-finite coordinate tests failed first (4/4), then passed with a non-mutating guard. Full suite 58/58 plus e2e 10/10. No deferred minor code findings.
- Review scope rulings are recorded in docs/tasks/task-00-verification.md: domain/reference/safe-integer policies and continuous health monitoring deferred; generated Next agent guidance retained; archived/source assets untouched.
- Dependency decision: ESLint 9.39.5 retained for installed Next plugin peer support; 10.14.0 caused unsupported peers. Registry deprecation notice is documented as a maintenance limitation.
