# AETHER-DOM

A local-first creative IDE for semantic, cross-modal storytelling. **Task09 — Durable jobs** adds leased local proposal work, recovery and a dedicated Jobs inspector. Isolated branches, three-way comparison and WebM preview remain available. The selected Afterlight v2 landing page remains separate and unchanged.

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

For durable mock proposals, start a third terminal at the project root:

```powershell
pnpm jobs:worker
```

If PowerShell cannot find `pnpm`, run the worker directly with Node from the same
project root: `node .\tools\api.mjs worker`. It uses the same Python/database
configuration and needs no package-manager command. This host's pnpm is bundled
with Codex and is absent from ordinary PowerShell PATH; Node is on that PATH.
The worker normally waits quietly for queued jobs; Ctrl+C stops it.

Choose a layer or shot, open **Jobs**, choose a scenario and **Queue mock job**.
The separate worker captures no browser drafts and calls no remote provider.
Without a worker, queued jobs remain saved and waiting. **Refresh jobs** checks
history; **Cancel job** stops queued/running/retryable work. After a worker
restart, expired leases become explicit retryable failures while attempts remain.
Use **Retry job** to recover; each job permits at most three claimed attempts.

On success, choose **Review result** for the captured scope and exact field diff.
**Approve proposal** is the existing revision-checked human command; queuing,
progress, completion, cancellation and rejection never change creative canon.
Stale work cannot apply. The zero-cost mock supports the same three deterministic
scenarios as Proposals; freeform messages remain inert. Existing synchronous
Proposals still work without a worker. Stop the worker with Ctrl+C. For one pass,
run `pnpm jobs:worker --once`; polling/lease bounds are documented in the API README.

Open [the local studio](http://127.0.0.1:3000/). The API seeds Neon Shogun once, then loads its saved branch. Choose a scene/shot in **Project**, then select Kael, Vance or another layer in **Layers** or on the stage. The inspector shows authored X/Y/Z, scale, rotation, pose and source references. Choose **Edit transform**, change values, then **Save transform** to commit them locally; **Cancel** discards the draft. **Undo**, **Redo** and **Change history** use the persisted command history. Reload resets temporary selection and reads the saved branch. The [seed overview](http://127.0.0.1:3000/document) remains a read-only reference to the original revision-0 fixture.

Every saved command checks its base revision and commits a new snapshot. Undo restores authored values exactly while creating a new revision. A stale draft receives HTTP 409 and cannot overwrite newer work. If a response is lost, the app blocks further writes until **Reload latest** confirms what was saved. Drafts are temporary and are discarded on selection changes or reload. Selection and drafts never write directly into canon.

Open **Diagnostics** to see Kael’s injured-arm conflict, the authored pose, constraint and injury event that support it. **Select affected layer** opens the navigable layer in the inspector. Choose **Edit pose** and save a right-arm pose, or **Review recovery** to explicitly record a described recovery event. Both paths are persisted and reversible. The scene’s shots are evaluated after its referenced events, using their maximum order; a recovery clears an injury only from its later event order. Unknown poses or ambiguous timing receive coverage warnings.

**Dependencies** shows the selected layer’s sources/dependents and the latest command’s affected nodes in evaluation order. Additions and removals use both adjacent revision graphs. Analysis is recomputed from saved canon; bindings do not rewrite transforms or audio values. **Dialect draft check** continuously checks text against the selected character’s forbidden words/phrases. This text is unsaved: the supplied document format has no attributed dialogue field. Matching preserves Unicode word marks and avoids substring matches.

The database defaults to `data/aether-dom.sqlite3` and is excluded from Git. Startup runs the checked-in Alembic migration and seeds only an absent branch. To choose another file, set `$env:AETHER_DATABASE_PATH='data/my-project.sqlite3'` in the API terminal before starting it; relative paths resolve against this workspace. Explicit migration: `node tools/api.mjs migrate`. For a backup, stop the API and copy the database file; keep your backup outside Git. Do not delete the database to apply code updates. See [API persistence details](apps/api/README.md).

The desktop shell uses side panels and a bottom timeline. Narrow screens stack the panels. **Layout** renders the four original local SVG fixtures through Three.js WebGL2, with native SVG fallback. Drag a layer to submit one transform command; Escape cancels. Arrow keys nudge focused layers; the inspector edits exact values, including offscreen layers. **Bring forward / Send backward** changes only the selected layer’s Z. **Camera** edits pan, dolly, FOV and aspect, with a16:9 reset. No canonical transform clamping occurs.

**Import SVG** accepts bounded static UTF-8 SVG shapes/groups/text and records source rights. Scripts, links, styles, external references and unsupported content are rejected. Supplied element IDs and the asset ID survive **Edit SVG** changes; the dropdown and native overlay select source elements. Save edits geometry/presentation attributes; all instances sharing that asset use the new immutable version. Safe original files and edited versions live in ignored `assets/originals/` and `assets/imported/`; back these up together with the database.

**Animate** enables keyframe authoring in the inspector. Seek in milliseconds, add/update/delete a frame and save explicitly. Playback linearly interpolates X/Y/Z, scale and rotation without changing base transforms or writing preview frames. Layout always edits the base transform. GPU denial/context loss preserves native editing. On desktop, opening a drawer collapses the timeline body to preserve stage space. Stop services with Ctrl+C; an unavailable API offers **Try again**.

Choose **Audio** in the timeline to open the mixer, then **Enable audio** and **Play**. The checked-in ambient/tension/Foley clips work locally; playback stays silent until that explicit enable gesture. Raise **Tension** to preview supported gain bindings and the ambient fade. **Save tension** persists an editorial shot override through a revision-checked command; **Cancel tension** restores the saved mix. Without an override, supported narrative bindings supply the tension signal. Volume, mute, output mode and glow are temporary preview controls.

While playing, choose **Layout**, select the sign and drag it left/right to audition its pan. Escape cancels; releasing submits one transform command and the accepted save pauses preview. Headphones mode uses stereo pan; Spatial uses an equal-power panner with stereo fallback. **Reactive glow** follows the mix analyser on linked Foley props through direct presentation updates; reduced motion disables it unless explicitly enabled. Seeking restarts tracks together at the same clip-relative offset; sources also stop at shot end independently of rendering frames. No audio samples or glow values enter canon or React sample-rate state.

The three8-second WAVs are original project-owned synthesis, not provider-generated stems. Their stdlib generator and byte-check instructions are in [the fixture guide](assets/fixtures/README.md). This task provides the seeded mixer, not arbitrary audio import, speech generation, reverb design or a DAW.

Select a layer, then choose **Proposals** in the header. Choose the selected layer or shot, a mock scenario and explicit operation permissions, then **Generate proposal**. The offline mock offers right-arm pose repair, X movement by +0.25 or shot tension of0.8. It does not interpret the request message or call a language model. The review shows the captured revision, exact authored field diff, permitted scope, read context and provider provenance. Pose changes metadata; it does not redraw a sprite.

Generating or rejecting a proposal leaves canon and undo history unchanged. **Approve proposal** applies only the stored, revalidated operations in one revision and one undo entry. A stale proposal cannot overwrite newer work; reload and generate a fresh proposal. Saved proposal decisions survive reload/restart, and Undo restores canon while retaining the historical approval. Proposal records live in a separate SQLite table added by migration0002; existing documents are not upgraded. Provider JSON, context and records are bounded and validated, with no import, raw restore, recovery or arbitrary batch permission.

Choose **9:16** above the stage to preview the saved portrait override. The **Portrait composition** inspector edits the selected layer's alternate transform; dragging, arrow nudges and depth controls also target only portrait. **Fit subjects** creates an unsaved draft that packs visible character sprites within the5% side/10% top-and-bottom guides. Review it, then **Save portrait layout** or **Cancel layout**. **Use base transforms in portrait** drafts removal of the alternate map and still requires Save. Base transforms, other aspect settings and document schema stay unchanged. Undo restores the exact previous override. Safe-area labels describe sprite bounds at time zero, not every animated frame; backgrounds may crop. Existing keyframe movement is rebased on the alternate composition.

Choose **Player** in the header to open the current saved revision at `/player`. Choose a shot/aspect, use Play/Pause or seek, and explicitly **Enable audio** to hear its embedded local mix. Focus the frame for Space/arrow/Home/End keyboard controls. Changing shot/aspect resets playback and audio. This read-only route uses the same composition, renderer, playback clock and audio engine as the studio.

**Export JSON** downloads a portable `.cdom.json` bundle containing the exact saved document plus sanitized SVG trees and PCM WAV media. Unsaved drafts are excluded. Open it through **Open JSON** in the player; media playback then works with the API offline. The app itself must be installed/running: the JSON is data for this player, not an HTML application or video. The initial bundle format is JSON rather than ZIP, with a32MiB total limit,64 referenced assets and8MiB per WAV. Missing, unsupported, unsafe or unknown-rights referenced media fails export with actionable guidance. Files stay local; no publication or canonical write occurs. Original media references inside the document remain intact.

Choose **Branches** to fork the current saved revision. Enter a name, choose **Create fork**, then **Open branch**. A fork retains the source revision as its base and starts with an empty edit/undo history. Saved edits, undo and proposals are isolated per branch; immutable asset versions may be shared. The source stays unchanged. Branch creation has a separate human command/audit record and cannot be undone as a source edit. Switching discards unsaved drafts and stops preview; the chosen branch lives in the studio URL and survives refresh. A busy save blocks switching. Unknown fork outcomes can safely retry the same command or refresh the branch list.

**Compare branches** shows authored field changes against the actual common ancestor revision. It distinguishes one-sided changes, matching changes and conflicts, including absent fields and additions/deletions. Arrays are compared as whole fields. Revision/active-branch metadata is excluded from creative differences. This is a read-only comparison prototype with no merge or overwrite action.

In **Player**, use **WebM preview** to encode the selected saved/local shot and aspect from time zero. Choose a clip duration and whether to include its saved stereo mix, then **Record WebM**. Download is offered only after encoding succeeds; Cancel saves no partial file. Limits are30seconds,24fps, up to1280×720/720×1280 and64MiB. Native recording runs in real time; a bounded WebCodecs VP8/Opus fallback handles browsers that return empty native recordings. Keep the tab visible. No microphone, screen capture, network media or public upload is used. Runtime reactive glow is excluded; custom/inherited SVG fonts require text converted to paths or an explicit generic font. Browser codec support varies; portable JSON remains available. MP4/FFmpeg and automatic branch merging are deferred.

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

On this Windows host the bundled Playwright Chromium failed to launch. Local browser checks use the installed Edge channel: set `$env:AETHER_E2E_CHANNEL='msedge'` before `pnpm test:e2e`; omit it for standard Chromium/CI. To exercise development effect replay, audio and proposals, also set `$env:AETHER_E2E_DEV='1'` and run `pnpm exec playwright test --project desktop --grep 'effect replay|explicit audio gesture|scoped mock preview'`.

## Local endpoints and contracts

- [GET /api/v1/health](http://127.0.0.1:8000/api/v1/health): service and schema version.
- [GET /api/v1/fixtures/neon-shogun](http://127.0.0.1:8000/api/v1/fixtures/neon-shogun): unchanged validated fixture, revision 0.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/document`: saved document, recent history and revision-bound analysis.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/diagnostics`: derived issues, graph and invalidation metadata.
- `POST /api/v1/projects/{projectId}/branches/{branchId}/commands`: validated transform/pose/recovery, camera, appearance, SVG import/edit, keyframe and undo/redo commands; requires `expectedRevision`, command ID, stable identities, human actor and reason.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/assets/{assetId}?revision=N`: validated SVG tree for an asset referenced by that immutable saved revision; no arbitrary file access.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/audio/{assetId}?revision=N`: bounded PCM16 WAV bytes for a referenced audio asset at that saved revision. Traversal, network paths, redirected links and invalid/oversized files are rejected.
- `GET/POST /api/v1/projects/{projectId}/branches/{branchId}/agent-proposals`: list the latest20 review records or generate a scoped proposal against `expectedRevision`.
- `POST /api/v1/projects/{projectId}/branches/{branchId}/agent-proposals/{proposalId}/reject`: persist rejection with an empty JSON object; approval uses the existing commands endpoint.
- `GET /api/v1/projects/{projectId}/branches/{branchId}/player-manifest?revision=N`: exact saved document plus portable embedded SVG/audio media; `download=1` adds an attachment filename. Omit revision to capture current head once. No history/proposal records are exported.
- [Local OpenAPI docs](http://127.0.0.1:8000/docs).
- `GET /api/v1/projects/{projectId}/branches`: live branch summaries/lineage; `POST` accepts a separate human `forkBranch` command with source revision and new stable ID.
- `GET /api/v1/projects/{projectId}/diff?left=branchA&right=branchB`: bounded read-only three-way comparison with captured heads and actual common base.

The web server forwards only these fixed resources and preserves conflict/error status. Browser writes require same-origin JSON requests. Server-only `AETHER_API_ORIGIN` defaults to `http://127.0.0.1:8000`; copy `.env.example` to `apps/web/.env.local` only if changing it. Never use a `NEXT_PUBLIC_` variable for server configuration or secrets. Keep the API bound to loopback; this local task does not add authentication or a public service.

`packages/schema/cdom.schema.json` and the original fixture remain version **0.1.0**. Version0.2 adds stage metadata; version0.3 adds optional `shot.audio.tension`. All three remain readable. `setShotTension` upgrades its copied snapshot losslessly; undo restores exact prior authored fields/version. Stage commands preserve existing0.3 metadata. Startup performs no document upgrade. AJV and Python consume the same schemas; see [the contract guide](packages/schema/README.md).

`command.schema.json` remains **0.6.0**, including `setShotLayoutOverride`; derived analysis remains **0.1.0**. Task08 adds separate fork/list/diff schemas and Alembic0003 for immutable fork lineage/audit, preserving existing snapshots and histories. No document upgrade occurs. SQLite owns canonical state; React accepts only validated, revision-matched responses. Selection, drafts, playback and analyser values stay temporary. Real AI providers, semantic dialogue analysis, advanced rigs, auth and collaboration remain later work. The original fixture’s contradiction stays preserved, while saved branch repairs change its current diagnostic.

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

Next: **Task10 — Asset provenance and commercial-use policy**, following the ordered kit board and canonical-state boundaries. WebGPU and advanced rigs/Bezier editing remain deferred.
