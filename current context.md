# Current context — AETHER-DOM

Last updated: 12 November 2026 (Asia/Calcutta).

Fullscreen sizing follow-up complete: at1536×730 the frame grew from309px to720px wide (2.3×). Layout defaults to compact timeline controls; Show tracks expands rows, Animate opens them automatically, and desktop drawer controls share one horizontal row. Removed the900px frame cap and desktop760px page minimum. Mobile timeline controls wrap into two readable rows. New regression covers scaled fullscreen,1920px desktop, toggle/animation and aspect/containment. Final follow-up checks:62 browser tests,94 frontend tests, lint/types/build/preservation clean. Web preview now session54072 on3000; API8000 remains running. Read-only preview observed the user's newer revision6; no project commands were issued for this layout fix. All changes remain uncommitted.

## Current phase

**Task04 — 2.5D stage is complete and verified** on feat/task-04-2-5d-stage, based on merged Task03 c56eec4 (user commit89b85e2). Drag/reorder, local SVG rendering/import/source-ID editing, camera, appearance, linear keyframes and independent playback are implemented through revision-checked commands. Final checks:420 unit/API tests passed,1 legacy host skip,60 desktop/mobile browser tests passed plus1 development StrictMode regression; lint/types/build/preservation clean. Independent review findings fixed. Plan: docs/superpowers/plans/2026-11-12-task-04-stage.md; evidence: docs/tasks/task-04-verification.md. No Task04 commit/push/merge; user handles integration. Original0.1 schema/fixture, kit, landing and archives preserved. Next: Task05 — Audio graph.

Task04 preview: web3000 session32332, API8000 session33710; browser left open. Regular user database remains revision0/history0 and last-written11Nov23:29, canonical hash unchanged across restart (see evidence). Browser/API mutation tests used isolated databases/media. New original fixture SVGs live in assets/fixtures; user imports/versions in ignored assets/originals and assets/imported must be backed up with SQLite. Both0.1/0.2 documents remain readable; new stage commands losslessly upgrade and undo restores prior authored schema/state. No startup document upgrade. Text/non-scaling-stroke assets and unavailable/lost GPU contexts use native fallback. WebGPU/advanced rigs remain deferred.

Task04 local environment: Windows Application Control blocks pydantic_core in the old Python3.14 `.venv`; the separate `.venv-task04` uses the official bundled Python3.12.14 and identical pinned requirements (supported puremypy workaround). Ignored `.env.api.local` sets AETHER_PYTHON=.venv-task04/Scripts/python.exe; tools/api.mjs reads this optional override. Original `.venv` remains intact. RTK is also host-blocked; direct tools used. No security policy was changed.

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
- pnpm dev:api → FastAPI on http://127.0.0.1:8000/ using root .venv or optional AETHER_PYTHON from root .env.api.local (this host uses .venv-task04).
- pnpm lint / pnpm typecheck / pnpm test → complete local source and contract checks.
- pnpm build → Next production build; pnpm --filter web start serves it.
- pnpm test:e2e → built-app desktop/mobile checks; starts fresh isolated services on 3100/8100 and a unique ignored database.
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
- [x] Product Task 02: typed commands, durable SQLite snapshots/history, transform editing, undo/redo and recovery; complete verification and independent review.
- [x] Product Task 03: indexed graph/impact, evidence-linked continuity/reference/asset/binding rules, reviewed pose/recovery commands and unsaved dialect checking; regression verification and independent review.

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

Read this file, PRODUCT.md and the selected design specification before changes. Task 03 is complete; next is the kit's Task 04. Read the ordered board and canonical-state architecture before implementing the 2.5D stage. Preserve SQLite canonical ownership, revision-bound derived analysis and separate selection/drafts. The studio edits transforms/poses and records explicit recovery events; fixture and seed overview stay immutable. Dialogue checking is an unsaved draft tool because this document version has no attributed lines. Keep landing refinements in landing-page/ and the frozen archive unchanged. Update this context at milestones and handoff.

## Task 01 verification and handoff

- User requested Task 01 implementation. Read task board, full master plan, current context, product/selected design, web instructions, Task 00 contract/evidence and relevant installed skill/local Next guidance. Plan: docs/superpowers/plans/2026-11-11-task-01-studio-shell.md; Operate surface brief: docs/design/studio.md.
- Initial checkout was clean on main at c23fb3e. Created feat/task-01-studio-shell in the existing checkout. No commits or pushes performed.
- Added per-mounted-studio Zustand selection store (IDs/actions only), pure document projections and blockout placement. Source schema/fixture/API remain unchanged. No asset files are fetched or invented; stage geometry explicitly represents layout placeholders.
- 12 new selection/projection tests passed after a missing-feature red run. Final unit/API suite: 70 passed (20 schema, 18 web, 32 Python/API). Zero-warning lint, strict TS/Python checks, final production build, peer check and preservation of all 178 original files passed.
- Final browser suite: 24 desktop/mobile tests passed. Covers selection and exact inspector values, stage/nav synchronization, empty scenes/projects, keyboard/Escape, reload, failure/retry, multiple shots, narrow layouts, long text and original /document behavior. Initial missing-navigator acceptance test failed on the old root before implementation.
- Independent review found distinct-shot accessible-name and long-title mobile-overflow issues. Parent visual pass found stage clipping with expanded diagnostics. All three were reproduced with failing browser tests, fixed in one correction batch, and verified with the complete suite. Navigator ordering now mirrors stage depth. No deferred minor findings remain. Full evidence/review scope: docs/tasks/task-01-verification.md; final desktop/mobile screenshots alongside it.
- Production web preview retained on http://127.0.0.1:3000/ (session 59629), using the final corrected build. Existing FastAPI remains on http://127.0.0.1:8000/ (session 50033). Earlier web sessions 66671/94696 were stopped. CUA observed Kael selection and original transform values. No canonical document, API, source media, landing or archive changes.
- Task 00 was committed by the user as c23fb3e before this task. Task 01 changes remain uncommitted on feat/task-01-studio-shell; no push/merge performed. Next: Task 02.

## Task 02 verification and handoff

- User requested Task 02 implementation and relevant docs/skills. Read root/kit instructions, current context, full master plan, ordered board, product/design, API/schema guidance and local Next guidance. Plan and execution ledger: docs/superpowers/plans/2026-11-11-task-02-commands-persistence.md. Root led shared contract/web integration; a delegated backend implementer worked against the fixed interface. A fresh read-only reviewer inspected the complete result.
- Task 01 was committed by the user as a9b6d60 and merged through PR #1 into a1e4526 on main. The clean local checkout was fast-forwarded, then feat/task-02-commands-persistence created. Earlier Task 01/Git sections are historical. No Task 02 commit, push, PR or merge performed.
- Added separate command schema/generated TS union for setLayerTransform, undo and redo. Stable IDs, expectedRevision, human actor and reason are required. SQLite/SQLAlchemy owns validated snapshots, immutable audit/forward/inverse data, persistent history stacks and monotonic revision metadata; Alembic startup migration/seed is idempotent. Exact command replay returns its original result; stale/concurrent writes conflict without partial changes.
- Studio loads the persisted branch, edits five transform fields through explicit drafts, saves only validated responses, and offers persistent Undo/Redo and recent change history. Drafts retain their base revision; stale/unknown-outcome saves block writes until Reload latest. Zustand remains IDs/actions only. The seed overview/fixture stays revision 0; no optimistic canonical state, localStorage canon or general JSON patches.
- Final verification: 151 unit/API tests (36 shared contract, 39 web, 76 Python), 34 production desktop/mobile browser tests, lint, strict TS/Python typing, generated-type drift, production build, dependency consistency, migration idempotence and preservation of 178 originals passed. Temporary dev on 3001 compiled and returned HTTP 200, then stopped. E2e uses fresh 3100/8100 services and a unique ignored database, without touching the regular project database.
- Independent review found one P2 numeric-parity defect: oversized Python integers could persist numbers decoded as Infinity in JavaScript. API regression tests reproduced HTTP 200 before the finite-number guard correction; both signs now return 422 with no writes. Browser integration exposed valid same-origin saves rejected due to Next's internal localhost URL; regression tests pinned and verified Host/protocol-based checking without trusting forwarded headers. Reviewer confirmed both fixes with no remaining concrete source findings. Full browser suite passed afterward.
- Desktop/mobile draft form and saved-history screenshots were inspected; no new visual defects or horizontal overflow. CUA confirmed preview load, Kael selection, five-field draft and Cancel without canonical mutation. Evidence: docs/tasks/task-02-verification.md and task-02-desktop.png, task-02-mobile.png, task-02-history.png.
- Final preview retained at http://127.0.0.1:3000/ (web session 96750), API http://127.0.0.1:8000/ (session 19021). Both use reviewed sources. Regular database data/aether-dom.sqlite3 was seeded at revision 0; no test commands were sent to it. It and all e2e databases are ignored. Stop API before manual database backup; configure AETHER_DATABASE_PATH in the API terminal to select another file.
- RTK and SQLAlchemy's compiled extension were blocked by Windows Application Control. Direct tooling and the pinned SQLAlchemy pure-Python build were used; API README documents the latter. Impeccable engine cache remains unavailable; selected design/Operate/craft guidance was read directly. An explicit Node build launcher resolves a package-manager CSS-worker startup failure. Approved verification completed outside restrictive worker limits. Temporary automatic approval usage-limit failure resolved on continuation; no unresolved blocker remains. CI has not run remotely.
- Next: Task 03 — Dependency graph and linter. Full 2.5D media rendering is Task 04. Landing, archives, original kit/schema/fixture and initial source plans remain untouched.

## Task 03 verification and handoff

- Read relevant root/kit instructions, current context, complete master plan, ordered board, schema/fixture, API/schema guidance, product/selected design/studio brief, local Next guides and applicable skills. Work began 11 November and completed 12 November 2026 (Asia/Calcutta). Plan/ledger: docs/superpowers/plans/2026-11-11-task-03-dependency-graph-linter.md. Root owned contracts/web/integration; focused domain and persistence workers implemented fixed interfaces; a fresh reviewer inspected the full tracked/untracked branch.
- User committed/pushed Task 02 as f727cc6 and merged it to main at 87e956e. Clean existing checkout was fast-forwarded and feat/task-03-dependency-graph-linter created. No Task 03 commit, push, PR or merge performed. Earlier Task 02 uncommitted notes are historical. Commit and push this branch before comparing it on GitHub.
- Pure Python graph has forward/reverse indexes, iterative SCC/traversal, stable evaluation order and cycle blocking. Invalidation traverses both current and immutable predecessor graphs, retaining removed-event dependencies on undo; no bindings/render/audio values are evaluated into canon. Full analysis recomputes and decorates the exact response snapshot outside canonical/audit JSON. Shared analysis schema validates revision, evidence, graph identities and invalidations; web rejects mismatched analysis.
- Added typed setLayerPose and recordConstraintRecovery under command schema 0.2.0. Existing .cdom 0.1.0 and SQLite format are unchanged. Recovery atomically creates an event, appends scene membership and links the constraint; exact undo/redo survives restart and reads legacy transform histories. Scene shots follow maximum referenced event order; unsupported pose/timing semantics warn. Fixture seed has one physical conflict and seven missing asset-file warnings.
- Studio now has evidence-linked diagnostics, reachable affected-layer selection, dependency/impact inspection, pose drafts and inline recovery review. Drafts capture their base revision and require Save; stale/uncertain saves still require reload. Unsaved dialect checking uses authored forbidden terms, Unicode word marks and normalized apostrophes. One drawer opens at a time; desktop timeline placeholder collapses to preserve stage space, while mobile retains stacked panels.
- Final verification: 257 unit/API tests passed (61 contract, 45 web, 151 Python/API), 1 file-symlink test skipped for Windows privileges, 46 production desktop/mobile browser cases passed. Real Windows junction containment regression passed. ESLint/Ruff, strict TS/mypy (11 files), all three generated-type drift checks, production build and preservation of 178 originals passed. Temporary Next dev on 3001 compiled root/diagnostics proxy with HTTP 200, revision 0, 8 issues and 26 nodes, then stopped. Dependency versions and lockfile unchanged; no new runtime dependency or migration.
- Fresh review found unpaired Unicode poisoning after commit, integral-float event-order parity, redirected assets-root containment, missing cross-character chronology impact and Unicode lexical matching defects. All were reproduced with failing tests and fixed. Smaller orphan-selection and undo-read-race findings were corrected. Parent visual acceptance found a square collapsed stage under an expanded tray at 1440×800; desktop timeline collapse fixed it, with width/ratio/containment regressions. No unresolved findings or deferred minor defects. Details/evidence: docs/tasks/task-03-verification.md.
- Inspected desktop/mobile diagnostics and recovery forms in a bounded batch and confirmed the correction. CUA observed the restored seed's injury evidence and Kael dependency sources/shot consumer without sending commands. Screenshots: docs/tasks/task-03-desktop.png, task-03-mobile.png, task-03-recovery-mobile.png. Existing user database remained revision 0 with matching direct-API SHA-256 before/after restart; all command tests used isolated databases.
- Final retained preview: http://127.0.0.1:3000/ (production web session 11421), API http://127.0.0.1:8000/ (session 98743). Both load final sources; health/document return 200. Earlier Task 02/temporary preview sessions and all e2e-owned services were stopped. No fixture/source media/landing/archive changes. CI has not run remotely.
- RTK remains blocked by Windows Application Control; direct tooling used. Impeccable engine cache remains unavailable; existing selected design/Operate/craft guidance read directly. Existing pure-Python SQLAlchemy workaround retained. Approved verification ran outside restrictive sandbox workers. No unresolved approval or environment blocker remains. Next ordered task is Task 04; persistent dialogue editing, full renderer, audio evaluation, AI/auth remain outside this task.
