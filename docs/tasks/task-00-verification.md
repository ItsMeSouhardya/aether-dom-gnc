# Task 00 verification

11 November 2026, Asia/Calcutta. Scope: pnpm workspace, Next.js 16 bootstrap, read-only FastAPI endpoints and a shared `.cdom` structural contract.

## Evidence

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed: ESLint with zero warnings, Ruff, retained landing syntax checks |
| `pnpm typecheck` | Passed: generated types match schema, both TypeScript projects, strict mypy across 3 API files |
| `pnpm test` | Passed: 20 schema tests + 6 web-boundary tests + 32 Python/API tests |
| `pnpm build` | Passed: Next.js 16.4.6 production build, page and two dynamic read-only route handlers |
| `pnpm test:e2e` | Passed: 10 tests, desktop and mobile, against freshly started production web and API |
| `pnpm verify:preserved` | Passed: 178 original files unchanged; canonical schema and fixture equal kit bytes |
| `pnpm peers check` | Passed: no peer dependency issues |
| Python `pip check` | Passed: no broken requirements |
| `pnpm landing:build` | Passed: selected static landing output, archive excluded |
| Next development startup | Ready; HTTP 200 on temporary port 3001; stopped after verification |
| Live FastAPI health / fixture | HTTP 200; document equals the supplied seed |

Verified on Windows with Node 22.23.3, pnpm 11.25.0 and Python 3.14.6. Workflow is also configured for Linux/Python 3.12; remote CI was not run because this directory has no Git repository or configured remote.

## Behavioral and visual checks

The browser suite checks actual local fixture fetch/validation and JSON response, write rejection, reload, API failure/retry, rejection of incompatible document versions, valid empty collections, keyboard skip-link/action focus, self-hosted font loading, no browser errors on the healthy path, and no horizontal overflow at desktop/mobile and 720/360px reflow widths. A 720px viewport exercises the layout equivalent of a 1440px display at 200% zoom; this is not a separate browser zoom or assistive-technology certification.

Desktop (1440px) and mobile (390px) full-page captures were visually inspected. Charcoal/sage, Manrope, open rows, dividers and restrained controls carry the selected Afterlight direction into an Operate surface. This is a read-only overview, not the Task 01 studio layout. CUA also observed the healthy fixture and mobile details; its desktop viewport capture was clipped by the app panel, so the full-page Playwright captures are the desktop visual evidence. The temporary viewport override was reset.

Evidence copies: `task-00-desktop.png`, `task-00-mobile.png`. Current test-run artifacts also appear in ignored `test-results/`.

## Independent review and resolution

A fresh read-only reviewer inspected the scaffold, setup, tests and original-file preservation. It found one Important defect: Python jsonschema accepted non-finite coordinates that AJV rejected. Four regression cases (NaN, positive/negative infinity, JSON exponent overflow `1e400`) first failed with Python returning no issues. A non-mutating finite-number check corrected the boundary; all four now pass, alongside matching AJV cases and the full suite. The original schema remains unchanged. No other actionable findings or deferred minor code issues were reported.

Scope rulings on the reviewer's declined items:

- Reference integrity, duplicate IDs, continuity and safe-integer policy remain outside this unchanged preliminary structural schema. Later domain tasks own those invariants; structural validation must not be represented as story correctness.
- Connectivity is checked on each load/reload, not continuously. The indicator describes the successful request; API failure is detected on the next reload. A standing health monitor is unnecessary for Task 00.
- Rendering, audio, editing, persistence, auth and models remain deferred and are described honestly in the UI and docs.
- Windows paths containing spaces are handled by executable paths and argument arrays; the actual verified workspace contains spaces.
- Stale pre-scaffold commands in current context.md were reconciled at handoff.

## Environment and limits

- RTK is installed but Windows application control blocks execution. Direct commands/context tools were used after reporting that limitation.
- Impeccable's context launcher could not install its engine cache. Existing product/design documents and playbooks were read directly; no detector pass is claimed.
- Windows blocked mypy's compiled extension. Installing the same pinned version as pure Python resolved typechecking; the workaround is documented in apps/api/README.md.
- ESLint 9.39.5 is pinned for the installed Next React/accessibility/import plugins' peer support. Its registry deprecation notice is a development-tool maintenance limitation. ESLint 10 ran but produced unsupported transitive peers, so it was not retained.
- One initial Chromium launch failed at the process boundary; later launches and the final fresh-service suite passed. Early test authoring also exposed an ambiguous alert selector caused by Next's own route announcer; assertions now scope to the application's main region.
- CI configuration exists but has not run remotely. No Git initialization, commit, deployment or external publication was performed.
- Fixture asset paths remain metadata; no promised media, renderer, authoring engine or AI behavior is simulated.
