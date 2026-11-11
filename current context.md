# Current context — AETHER-DOM

Last updated: 11 November 2026 (Asia/Calcutta).

## Current phase

**Task 01 — Studio shell is complete and verified.** The root studio has a project explorer, layer navigator, selectable layout blockout, read-only transform inspector, timeline placeholder and diagnostics tray. Task 00 overview is retained at /document. Selection is per-studio UI state; commands/persistence, full renderer, linter, auth and AI remain future work. Next: Task 02 — Commands and persistence. Afterlight v2 remains the selected, unchanged main landing design.

## Active source and frozen references

- landing-page/ is the active, dependency-free HTML/CSS/JS source. It was promoted from landing-prototype/, which no longer exists as an active directory.
- design_archive/afterlight-v1/ and design_archive/signal/ are self-contained frozen references with independent HTML, CSS, interactions, artwork and fonts. **Keep the entire archive untouched unless the user explicitly requests archive changes.** Main-page work must not affect it.
- The archive has its own local viewer and SHA-256 manifest (37 frozen files). It is excluded from the main server's root and the static build.
- design_specifications/design.md is the selected design authority; .impeccable/design.json records selection under extensions.selection. The pre-selection system is retained as design_archive/DESIGN-AT-SELECTION.md.
- PRODUCT.md holds product truth; root AGENTS.md points future agents to the correct active/frozen boundaries.

## Confirmed visual decisions

- Main world: cinematic charcoal, restrained sage, self-hosted Manrope, full-bleed portal artwork and quiet editorial sections.
- Keep all selected v2 content and interactions. Its dedicated layered CDOM section remains immediately before Change the story / Feel the ripple.
- CDOM columns align to the top, balancing padding across the preceding divider. Figure max-width is 560px; viewBox is 0 68 660 502. STAGE sits outside the middle layer at (558,320) with elbow leader M510 290l40 40h72.
- Preserve pause/resume, offscreen/hidden-document pausing, static reduced-motion geometry and accessible text. The scene demo is illustrative; it has no real audio or canonical mutations.
- Review-only bottom padding and the hero-caption offset were removed with the switcher. Other page markup is identical to the selected v2 before promotion.
- Folio was retired earlier. The doorway artwork still serves the selected page's world banner; its historical filename is not a retired-page dependency.

## Product baseline and source context

AETHER-DOM is a local-first creative IDE plan for motion comics, animatics and interactive stories. Typed/versioned .cdom state, deterministic dependencies and creator-reviewed operations remain central. Follow aether_dom_codex_kit/AGENTS.md, AETHER_DOM_MASTER_PLAN.md and CODEX_TASKS.md inside the kit when product implementation is requested. The kit, initial proposal, architecture image and design inspirations remain preserved.

Planning chat: 6af337a3-3148-83ec-be6c-37ac69e4be74. It was read through read_thread, whose 20,000-character per-item ceiling truncated the long assistant turn. The local master plan and original 50KB proposal supply the implementation baseline. Do not claim the full chat was retrieved verbatim.

## Running

From the workspace root (full Windows setup in README.md):

- pnpm dev / pnpm dev:web → Next.js product on http://127.0.0.1:3000/.
- pnpm dev:api → FastAPI on http://127.0.0.1:8000/ using root .venv.
- pnpm lint / pnpm typecheck / pnpm test → complete local source and contract checks.
- pnpm build → Next production build; pnpm --filter web start serves it.
- pnpm test:e2e → built-app desktop/mobile browser checks; starts/reuses local services.
- pnpm verify:preserved → original source hashes and exact kit copies.
- npm run landing:dev → http://localhost:4173/ (main landing source).
- npm run check → retained landing JavaScript syntax checks.
- npm run landing:build → clean generated dist/ with only the selected landing.
- npm run landing:preview / npm run preview → serves dist/ on 4173 after building; stop landing dev first.
- npm run archive:afterlight → frozen reference on port 4181.
- npm run archive:signal → frozen reference on port 4182.

The landing requires no dependency installation. Product setup requires pnpm dependencies and a root Python .venv; installed product runtime requires no cloud keys. Old variant query parameters are removed when the main landing loads; they never render archived variants. The earlier landing server was not modified or restarted during Task 00. Temporary Task 00 dev/e2e servers were stopped; final preview sessions are listed below.

## Verification

- CDOM alignment inspection found one P3 footer-label offset; the user then authorized its correction. ONE .CDOM now uses x=320 and text-anchor=middle. Live centering error is under 0.3 CSS pixels on desktop/mobile. Other layout and motion remain unchanged. Syntax/build checks passed. Historical inspection: design_specifications/qa/cdom-alignment-review-2026-11-11.md.

- Promotion compared generated page markup with selected v2: identical. See design_specifications/qa/selection-preservation.json.
- Source/build checks passed. Main source and built HTML have no comparison controls or retired renderers. The main build excludes archived designs.
- Both frozen servers returned HTTP 200 for their pages, CSS, JavaScript, fonts and artwork. Archive integrity check found zero mismatches across 37 files.
- Live browser: root loads Afterlight v2, zero switcher controls, zero review-only bottom padding, retained CDOM section, no desktop/mobile overflow. Arrow keys no longer select designs; the scene preview still reaches 82%; mobile navigation opens/closes. Old Signal query links normalize to the selected main URL.
- Prior spacing checks measured balanced gaps at 1920px and 1536px, with the model below the heading and external STAGE label within the canvas. Prior motion controller checks confirmed reduced-motion behavior and listener cleanup.
- Current evidence: design_specifications/qa/selection-validation.md and selected-main-desktop.jpg. Earlier QA files describe historical iterations, including the retired Folio comparison.

## Progression

- [x] Context discovery, source/reference analysis, three initial design explorations.
- [x] User selected Afterlight v2 after section and spacing refinements.
- [x] Promoted selected page, removed comparison UI/routing, isolated frozen references.
- [x] Finalized selected design documentation and agent entry points.
- [x] Checked main behavior, build and archive integrity.
- [x] Product Task 00 implementation: pnpm workspace, Next/FastAPI, shared contract and read-only fixture.
- [x] Completed final browser/integration checks, independent review and handoff evidence.
- [x] Product Task 01: studio shell, read-only selection/inspection, regression checks and independent review.

## Task 00 verification and handoff

- User explicitly requested Task 00 on 11 November 2026 and required all project Markdown to be read before changes. All 66 were read completely: root read 25 project/product docs; two parallel read-only reference readers read all 41 vendored Markdown files. Truncated portions were reread in bounded chunks.
- Plan/ledger: docs/superpowers/plans/2026-11-11-task-00-scaffold.md. Preserve original kit schema/fixture exactly; canonical working copies are in packages/schema. Task 00 was implemented before Git initialization; the user subsequently requested the repository connection recorded below.
- Root pnpm dev/dev:web runs Next on 3000; dev:api runs FastAPI on 8000 using root .venv. Landing commands are now landing:dev, landing:build and landing:preview; npm run check remains its syntax check. Existing tools and all landing/archive bytes are preserved.
- Final verification: 20 TS contract + 6 web boundary + 32 Python/API tests passed (58 total); 10 desktop/mobile e2e tests passed against fresh production servers. Final Next production build, strict TS/Python typecheck, zero-warning lint, peer-dependency check, pip check, landing build and preservation check all passed. Next dev also returned HTTP 200 on temporary port 3001, then stopped.
- Independent review found one Important validator parity defect: Python accepted NaN/infinity, including JSON exponent overflow. Four tests reproduced the failure before a non-mutating finite-number guard; regression cases and full suite now pass. No other actionable findings or deferred minor code issues. Schema bytes remain unchanged.
- Browser read the fixture successfully, keyboard/retry/empty/error/narrow states passed, and desktop/mobile full-page captures were inspected. Viewport override reset. Evidence and review scope: docs/tasks/task-00-verification.md, task-00-desktop.png and task-00-mobile.png. CI workflow is added but has not run remotely.
- Final preview retained: web http://127.0.0.1:3000/ (execution session 66671), API http://127.0.0.1:8000/ (session 50033). Both use final reviewed sources. Temporary port 3001 and e2e-owned servers were stopped. If sessions stop, start the API with pnpm dev:api and web with pnpm dev (or use the production start command after building).
- Impeccable launcher failed to create its engine cache; existing product/design context and playbooks were read directly. RTK remains blocked by application control. Python 3.14.6 is available through py/full interpreter path despite the unavailable python Store alias.

## Environment notes

Node 22.23.3, pnpm 11.25.0 and Python 3.14.6 are available. The python command is an unavailable Windows Store alias; py/full interpreter path works. Root .venv is installed. RTK is blocked by Windows application control, so direct commands were used after reporting the limitation. Impeccable context setup failed on engine-cache permissions/network; source guidance was read directly. The complete installed Impeccable 4.3.1 archive remains in design_specifications/vendor/impeccable/. ESLint 9.39.5 has a registry deprecation notice but is pinned for Next's transitive React/accessibility/import plugin peer support; ESLint 10 caused unsupported peers and was not retained. Pure-Python mypy workaround is documented in apps/api/README.md.

There was no Git repository at workspace discovery. The user subsequently authorized Git initialization and connection; see below. Loopback operations require approved sandbox escalation on this host. No unresolved approval rejection remains.

## Git connection

On 11 November 2026, the user requested connection to https://github.com/ItsMeSouhardya/aether-dom-gnc.git. The remote was reachable and returned no refs. Initialized this existing project directory with Git on main and added that URL as origin for fetch/push. Verified origin and branch. No files were staged, committed or pushed; the user intends to make the initial commit. Git status lists 237 untracked project files, with dependency directories, virtual environment, Next/build output, test results and local environment files excluded by .gitignore. Earlier no-Git notes in Task 00 evidence describe the implementation-time state.

## Resume

Read this file, PRODUCT.md and the selected design specification before changes. Task 01 is complete; next is the kit's Task 02. Read the ordered board and canonical-state architecture before implementing commands/persistence. Preserve the separation of the UI-only selection store and canonical snapshots. Keep landing refinements in landing-page/ and the frozen archive unchanged. Update this context at milestones and handoff.

## Task 01 verification and handoff

- User requested Task 01 implementation. Read task board, full master plan, current context, product/selected design, web instructions, Task 00 contract/evidence and relevant installed skill/local Next guidance. Plan: docs/superpowers/plans/2026-11-11-task-01-studio-shell.md; Operate surface brief: docs/design/studio.md.
- Initial checkout was clean on main at c23fb3e. Created feat/task-01-studio-shell in the existing checkout. No commits or pushes performed.
- Added per-mounted-studio Zustand selection store (IDs/actions only), pure document projections and blockout placement. Source schema/fixture/API remain unchanged. No asset files are fetched or invented; stage geometry explicitly represents layout placeholders.
- 12 new selection/projection tests passed after a missing-feature red run. Final unit/API suite: 70 passed (20 schema, 18 web, 32 Python/API). Zero-warning lint, strict TS/Python checks, final production build, peer check and preservation of all 178 original files passed.
- Final browser suite: 24 desktop/mobile tests passed. Covers selection and exact inspector values, stage/nav synchronization, empty scenes/projects, keyboard/Escape, reload, failure/retry, multiple shots, narrow layouts, long text and original /document behavior. Initial missing-navigator acceptance test failed on the old root before implementation.
- Independent review found distinct-shot accessible-name and long-title mobile-overflow issues. Parent visual pass found stage clipping with expanded diagnostics. All three were reproduced with failing browser tests, fixed in one correction batch, and verified with the complete suite. Navigator ordering now mirrors stage depth. No deferred minor findings remain. Full evidence/review scope: docs/tasks/task-01-verification.md; final desktop/mobile screenshots alongside it.
- Production web preview retained on http://127.0.0.1:3000/ (session 59629), using the final corrected build. Existing FastAPI remains on http://127.0.0.1:8000/ (session 50033). Earlier web sessions 66671/94696 were stopped. CUA observed Kael selection and original transform values. No canonical document, API, source media, landing or archive changes.
- Task 00 was committed by the user as c23fb3e before this task. Task 01 changes remain uncommitted on feat/task-01-studio-shell; no push/merge performed. Next: Task 02.
