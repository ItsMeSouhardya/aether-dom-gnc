# Current context — AETHER-DOM

Last updated: 13 November 2026 (Asia/Calcutta).

## Active phase — Task09 complete

PowerShell follow-up: the user's regular shell cannot resolve `pnpm`; inspection
confirmed it exists only on Codex's injected runtime PATH, not persisted user/
machine PATH. Node resolves from `C:\nvm4w\nodejs`. Verified the pnpm-free launcher
on a reconstructed ordinary PATH: `node .\tools\api.mjs worker --help`, then one
isolated worker pass. Use `node .\tools\api.mjs worker` in the project root; it
honors the existing Python override and waits quietly for jobs. README/API docs
now include this fallback. No global installation or PATH change was made.

The user requested Task09 and all execution rules between Task08/09. Work is on `feat/task-09-durable-jobs`, starting from clean Task08/board commit `ce00a5d`. The user requested the local rename from `codex/task-09-durable-jobs` on13November2026; no remote branch change was performed. Reused the suitable checkout; no new worktree. Plan/ledger: `docs/superpowers/plans/2026-11-13-task-09-durable-jobs.md`. User chose a dedicated Jobs drawer beside Proposals. No commit/push; user handles integration.

Baseline approved suite:790passed (458API,125schema,207web), one existing host skip. Sandboxed API run stalled and was terminated; approved process permissions worked. Original regular user DB was read only: revision25,25commands, one branch, sorted Python JSON SHA256 `6217a55330829d6bac624146856e7995415eb91dc7cd048f9bda6ea02a90fab4`. Snapshot in ignored `data/task09-canon-before.json`. All mutation/browser/worker tests use isolated data.

Implemented side-table0004, strict job contracts, idempotent enqueue, leased/attempt/revision-fenced mock proposal jobs and separate local worker. Jobs UI reuses creator review, persists only pending enqueue identity in sessionStorage/memory and never writes creative canon. Cancellation, bounded retry/backoff, expired-lease recovery and immutable initial artifacts/current decision review are covered. Existing synchronous proposals remain supported. No paid provider, dependency, generated media or document/command version change.

Final checks: **895 tests passed** (518API,162schema,215web), one existing host-limited skip; **120 production desktop/mobile browser cases** and **9 development smoke cases** passed. Lint, strict types,15 generated contracts, build,178-file preservation and diff checks pass. Fresh review's six Important findings and byte-boundary parity issue were fixed with red→green regressions; no deferred finding remains. Added scoped SQL recovery/claim selection so old terminal artifacts are not decoded on every poll;2,001-history regression passes. Broader checks exposed native WebM audio truncation: bounded decoded-duration verification now triggers the existing WebCodecs fallback for incomplete nonempty audio, with unit and actual native decoding evidence. No export dependency/format change.

One desktop/mobile visual pass plus one sage-progress correction/confirmation completed; detector ran once and returned `[]`. Evidence/captures: `docs/tasks/task-09-verification.md`, `task-09-desktop.png`, `task-09-mobile.png`. All test mutations used isolated DB/media. Final regular project remains revision25/history25/one branch with unchanged hash above; its jobs table is empty. Alembic0004 only adds execution storage.

Retained final preview: studio http://127.0.0.1:3001/ (session2234), API http://127.0.0.1:8001/ (session9291). Worker is deliberately not running against the regular project; start `pnpm jobs:worker` in a separate root terminal, then choose Jobs → Queue mock job → Review result. No commit/push/merge/PR; user handles integration. Next ordered task is **Task10 — Asset provenance and commercial-use policy**, when separately requested. Existing Python3.12 override/RTK retained; local Edge used. Remote CI has not run.

## Previous phase — Later-epic execution board

The user requested expansion of the ten **Later epics** in `aether_dom_codex_kit/CODEX_TASKS.md` into ordered execution tasks, after reading all project Markdown. This is a documentation-only milestone: **Tasks 09–29 are planned, not implemented**. Next implementation task: **Task 09 — Durable jobs and provider execution contracts**, when requested separately.

Read all **90 source Markdown files** before planning/changes: root reviewed eight core/product/kit/original-plan files; three read-only parallel reviewers read 41 other project docs and all 41 vendored reference files. Ignored dependencies/generated runtime copies were outside source scope. Reconciled historical claims against latest Task08 evidence; archived Impeccable playbooks were read as reference, not applied as new project instructions.

The board now specifies dependencies, existing code seams, execution checklists and testable acceptance for durable jobs (09), commercial-use provenance (10), rigs/IK (11–12), speech/dialogue and phoneme/viseme alignment (13–14), ControlNet/IP-Adapter generation (15–16), Lyria clips/real-time audition (17–18), heuristic/predictive saliency (19–20), access/events and Yjs collaboration (21–22), graph/vector projections (23–24), releases/telemetry/community connectors (25–27), and marketplace packs/transactions (28–29). Provider selection/live checks stay explicit execution-time work; mocks do not prove live integrations. Yjs drafts and rebuildable indexes preserve server command/revision authority. Merge/apply, MP4 and broader master-plan follow-ups remain separately scoped.

The user explicitly authorized editing the kit board; other original kit files remain preserved. Tasks00–08 and the initial Codex prompt remain byte-for-byte unchanged. The board's pre-expansion SHA256 was `20fcc2b525610d2fbf7ced65cc0b02a0a00e2168c7325ab082eb320948ac02c3`; only its expected hash in `docs/tasks/task-00-preserved.json` was updated to `bd3d0653aad5d419a153666bceb872f1d498a1eddb34ef510fcf7f53e426b9e2` for this authorized baseline change. No application code, dependencies, database, media, landing or archive edits are part of this milestone. Preserve all pre-existing Task08 working changes; user handles commits/integration.

Verification: numbering is continuous Task00–29 with no duplicates; all 21 new tasks have dependencies, deliverables, code areas, three unchecked execution steps and acceptance criteria (63 pending steps). All dependency references point backward. All ten original epic areas are covered. Exact prefix/suffix comparison against the original board passed for Tasks00–08 and the initial prompt. Preservation manifest comparison confirms only the board hash changed and the other177 entries stayed identical; `pnpm verify:preserved` passes all178 entries and exact kit schema/fixture copies. Source Markdown inventory remains90; `git diff --check` passes. No application test/build rerun was needed for these documentation/hash-only edits; Task08's application verification below is historical, not a new run. Only the board, this context and its authorized preservation entry changed during this planning request; no commit/push or implementation began.

## Previous implementation — Task08

**Task08 — Branching and exports is complete** on `feat/task-08-branches-exports`, based on the user's committed/pushed Task07 `bc4c8f0`. Plan/ledger: docs/superpowers/plans/2026-11-13-task-08-branches-exports.md. Evidence and captures: docs/tasks/task-08-verification.md. Changes remain uncommitted/unpushed; user handles integration. This completes the initial ordered task board; the later-epic board above is planning only.

Typed isolated forks preserve source canon and start separate saved/undo histories. Alembic0003 records immutable lineage/audit. Studio branch URLs remount all temporary state and carry exact identity into player/export. Read-only three-way comparison uses the actual common base, distinguishes missing/null and flags conflicts without overwriting either branch. No merge command. Player exports bounded24fps/720p WebM with optional embedded stereo audio, progress/cancel and explicit download. Empty MediaRecorder output falls back to local VP8/Opus WebCodecs; actual native decoding proves playable portrait video and correctly trimmed nonzero audio. No dependency, MP4, remote encoding, capture permission or document upgrade.

Final checks: **790 unit/API tests passed** (458 API,125 schema,207 web),1 existing host-limited skip; **104 production desktop/mobile browser cases passed**; **7 development lifecycle smoke cases passed**. Lint, types,13 generated contracts, production build, diff check and178-file preservation pass. Fresh review's fallback duration finding fixed and closed after native decoding. One batched desktop/mobile CUA inspection completed; viewport reset. Impeccable detector ran once and returned `[]`. Local Edge used; CI Chromium selection expanded, remote CI not run.

Final read-only preservation check: user revision11/history11/one branch/schema0.2.0, sorted Python JSON SHA256 `08900480a857680b617c79a43b4418fef0522b81105737a120ba31093f73ce38` unchanged. Migration0003 adds lineage storage only. No commands/forks sent to user project; all mutation tests isolated. Final HTTP200 preview: http://127.0.0.1:3000/ and API http://127.0.0.1:8000/. Open **Branches** for fork/switch/compare; **Player → WebM preview** for video export. Existing Python3.12 override retained; RTK works. Temporary visual servers stopped.

## Previous phase — Task07 (historical record)

Task07 was committed/pushed by the user as `bc4c8f0` before Task08. Its earlier verification and revision6 baseline below are historical. Plan/ledger: docs/superpowers/plans/2026-11-13-task-07-aspect-player.md; evidence: docs/tasks/task-07-verification.md.

### Task07 completion details

Command0.6 edits existing9:16 override maps atomically with exact undo, preserving base layers/other aspects/document version. Studio adds aspect previews, portrait-only gestures/numeric drafts, safe-area guides and explicit Fit/Save/Cancel. Shared composition rebases keyframe movement; fit evaluates time-zero pose. Independent read-only `/player` shares renderer/clock/audio and opens exact revision manifests or portable local JSON. Export embeds sanitized SVG/PCM outside canonical document fields; API-blocked reopen/playback proved. No new schema version, SQL migration, dependency, AI permission, ZIP/video export or publishing.

Final checks: **674 unit/API tests passed** (404 API,109 schema,161 web),1 legacy hostskip; **94 production desktop/mobile browser cases passed**; **5 development smoke cases passed**. Lint/types/generated drift/build/preservation clean. Fresh whole-branch review's two P2 findings fixed test-first (fit at keyframe0, active-aspect draft/preview split); clean-inspector/nudge and mobile frame/footer/padding regressions also fixed. One batched desktop/mobile visual pass plus correction/confirmation completed. Impeccable context now works; detector returned no findings. Evidence/captures in docs/tasks/task-07-*.

User database remains revision6/history6/schema0.1.0/hash `3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab`; no project commands sent. All mutations used isolated databases/assets. Read-only revision6 manifest has seven embedded assets. Final HTTP200 preview: web http://127.0.0.1:3000/ session72760, API http://127.0.0.1:8000/ session58633. Temporary visual/test servers stopped; viewport reset. Use9:16 → Fit subjects → review → Save, or Player / Export JSON. Existing Python3.12 override remains; RTK works; Edge used locally, Chromium retained for CI with expanded smoke. Remote CI has not run.

## Previous phase — Task 06

Task06 was committed/pushed by the user as32912ca before Task07; earlier uncommitted Task06 notes are historical. Plan: docs/superpowers/plans/2026-11-12-task-06-ai-proposals.md; evidence: docs/tasks/task-06-verification.md.

Implemented an offline provider protocol/mock, selected-node context, strict bounded JSON parsing, explicit scope/operation permissions, exact field diffs and persisted approve/reject review records. Human `approveProposal` command0.5 applies only stored/revalidated operations atomically as one revision/undo/audit entry. Generation/rejection do not change canon; stale approval requires reload/regeneration. Decisions survive restart and remain historical after undo. Alembic0002 adds a proposal side-table; document0.1/0.2/0.3 schemas/types, fixture and original kit stay unchanged. No cloud SDK, key, network call or new runtime dependency. The mock follows three chosen scenarios; message text is inert.

Final verification: **585 unit/API tests passed** (364 API,89 schema,132 web),1 legacy host-limited symlink skip; **84 production desktop/mobile browser cases passed**; **3 development effect/audio/proposal cases passed**. Lint, types/generated drift, build, git diff check and178-file preservation passed. Independent whole-branch review findings were fixed: array node-count parity, final persisted metadata bounds/transaction rollback, numeric JSON wire-size expansion and root approval receipt provenance. Reviewer confirmed all bounds corrections with12 focused regressions and no remaining findings. One initial browser load timeout passed in the final stable-build run. Desktop1536×850/mobile390×844 review inspected and captures saved in docs/tasks/task-06-desktop.png/mobile.png.

Regular user project remains revision6/history6/schema0.1.0, sorted Python JSON SHA256 `3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab`; its proposal list is empty. All mutation tests used isolated databases/assets. Restart loaded only the proposal side-table migration. Final HTTP200 preview: web http://127.0.0.1:3000/ and API http://127.0.0.1:8000/, background launcher PIDs2976/31712, ignored logs data/task06-web-preview.log and task06-api-preview.log. Select Kael → Proposals → Generate proposal to inspect the diff before deciding. Temporary visual/test services stopped. RTK0.42.4 now works; older blocked notes below are historical. Existing Python3.12 .venv-task04 override remains. Local browser checks used installed Edge; CI retains Chromium and adds proposal development smoke. CI has not run remotely.

## Previous phase — Task 05

**Task 05 — Audio reactive is complete and verified** on `feat/task-05-audio-reactive`, based on the user's Task 04 commit `f4eee75`. The user requested this local branch rename from `codex/task-05-audio-reactive`; no remote change was performed. Native Web Audio plays original local stems/Foley after explicit enable, evaluates tension/panning, follows precise seeks and drives bounded imperative glow. Optional document 0.3 `shot.audio.tension` and command 0.4 preserve old versions and exact undo. Safe revision-bound WAV route/proxy and inspector mixer are implemented. No new runtime dependency, lockfile change, SQL migration or startup document upgrade.

Final checks: **505 unit/API tests passed**, 1 legacy host-limited file-symlink skip; **76 production desktop/mobile browser cases passed**, then all14 audio cases passed again after the final marker/state correction; **2 development lifecycle cases passed**. Lint/types/generated drift/build/preservation clean. Fresh review's three P2 findings fixed with regressions (live Layout drag, authored gain fading, native shot-end scheduling). Plan: docs/superpowers/plans/2026-11-12-task-05-audio-reactive.md; evidence: docs/tasks/task-05-verification.md; captures: docs/tasks/task-05-desktop.png and task-05-mobile.png.

User project before/after: revision **6**, history **6**, schema **0.1.0**, sorted-JSON SHA256 `3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab`. No project commands were sent to it; all mutations used isolated test data. All changes remain **uncommitted**, with no push/merge/PR. User handles integration. Next ordered task: **Task 06 — AI proposals**.

Final preview: web http://127.0.0.1:3000/ session **48527**, API http://127.0.0.1:8000/ session **38567**; browser tab retained with audio off. Use Audio → Enable audio → Play. Choose Layout while playing to audition a dragged sign's pan; Escape cancels. Save tension persists the editorial override; volume/mute/output/glow stay temporary. The native source stop does not depend on RAF. Original local PCM fixtures and generator are checked in; original schemas/types, kit, landing and archives preserved.

Task05 resumed after a usage-limit interruption. Bundled Playwright Chromium failed with spawn UNKNOWN; installed Edge works via AETHER_E2E_CHANNEL=msedge. CI defaults to Chromium and now also checks development audio/effect replay. Existing .venv-task04 and .env.api.local runtime override remain in use. No unresolved blocker or review finding remains; subjective speaker/headphone listening is not claimed.

Fullscreen sizing follow-up complete: at1536×730 the frame grew from309px to720px wide (2.3×). Layout defaults to compact timeline controls; Show tracks expands rows, Animate opens them automatically, and desktop drawer controls share one horizontal row. Removed the900px frame cap and desktop760px page minimum. Mobile timeline controls wrap into two readable rows. New regression covers scaled fullscreen,1920px desktop, toggle/animation and aspect/containment. Final follow-up checks:62 browser tests,94 frontend tests, lint/types/build/preservation clean. Web preview now session54072 on3000; API8000 remains running. Read-only preview observed the user's newer revision6; no project commands were issued for this layout fix. All changes remain uncommitted.

## Previous phase — Task 04

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

Read this file and the kit's ordered board/master plan before changes; for visual work also read PRODUCT.md and the selected design specification. Task09 is complete; Tasks10–29 remain planned. Next implementation task is Task10 — Asset provenance and commercial-use policy, when separately requested. Preserve SQLite ownership, revision-bound analysis, portrait/base separation and separate selection/drafts/playback/audio/jobs. AI output must remain proposals until explicit review; no unreviewed writes. Fixture and seed overview stay immutable. Dialogue checking remains an unsaved draft tool until Task13 implements attributed lines. Keep landing refinements in landing-page/ and the frozen archive unchanged. Update this context at milestones and handoff.

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
