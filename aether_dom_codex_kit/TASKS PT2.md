# AETHER-DOM — Presentation-focused execution plan, Tasks 11–18

> **For agentic workers:** Execute one requested numbered task at a time using
> Superpowers executing-plans or subagent-driven-development. Write its detailed
> implementation plan before product code; use the checkboxes below as release
> gates. This document is an execution board, not an instruction to build every
> remaining task in one run.

**Planning date:** 14 November 2026, Asia/Calcutta.  
**Status:** Tasks 11–20 below are planned, not implemented.  
**Goal:** Deliver an integrated first-selection build by Task 12, then a complete,
bounded creative workflow by Task 18. Tasks 19–20 are completely optional.

**Architecture:** Extend the existing versioned `.cdom`, SQLite command/revision
repository, shared studio/player evaluators, immutable media/evidence and reviewed
jobs/proposals. Search, attention maps, shared drafts, presence and feedback remain
outside canon. The local application works without cloud credentials.

**Tech stack:** Existing Next.js/TypeScript, FastAPI, SQLite, JSON Schema,
Three.js/SVG and Web Audio. Add a dependency only in the task that needs it;
external AI/services remain optional, capability-gated adapters.

**Authority:** The user's presentation reprioritization; [master plan](AETHER_DOM_MASTER_PLAN.md);
[original board](CODEX_TASKS.md); [product truth](../PRODUCT.md);
[current context](../current%20context.md); actual task evidence in `../docs/tasks/`.
The original Tasks 11–29 are retained as scope inventory, **not a second execution
order**. From Task 11 onward, this file takes precedence for scheduling and scope.

## Outcomes and scope decisions

The first selection is in a day or two. Spend that window on one visible creative
advance and a reliable product connection, rather than starting several provider
or infrastructure projects. Task 11 adds real articulated character posing.
Task 12 adds interactive canon inspection in the player and finishes the selected
landing → real studio → saved player/export path.

Tasks 13–18 develop a connected workflow: create a story, author dialogue and
speech, animate it, review visual/audio generation, inspect canon and attention,
collaborate on a bounded draft, and produce an immutable interactive release with
feedback and reusable assets. This is a presentation-complete motion-comic tool,
not a promise to finish every production-scale feature in the original proposal.
The final-day date is unspecified; task numbers are milestones, not day estimates.

Alternatives considered: completing the original 19 epics individually would keep
infrastructure ahead of the deadline; building only a polished sample would leave
the creation workflow incomplete. This plan keeps useful local features in the
main path and moves scale infrastructure and experimental enhancements out of it.
The specific grouping and first-round feature choice are planning recommendations,
not additional requirements previously selected by the user.

**Baseline:** Tasks 00–10 supply the editor, canon diagnostics, reactive audio,
reviewed mock proposals/jobs, branching, portrait layout, portable JSON/WebM and
asset evidence. Task 10 closeout is complete; see
`../docs/tasks/task-10-verification.md` for final checks and review evidence. Do not
reimplement completed work. Preserve the uncommitted Task 10 and shared skill-
library work, and verify the user's commit before starting the Task 11 branch.

## Global constraints and execution rules

- Canon edits use human-reviewed typed commands, `expectedRevision`, validation,
  invalidation, audit and exact inverses. Generated results cannot write canon.
- Preserve old schemas, fixtures, IDs and immutable originals. A new authored
  contract gets an explicit version and lossless command migration; never upgrade
  documents on startup. Existing bundles continue to load.
- Reuse one compositor, one animation clock and the shared audio runtime in studio,
  player and export. Native SVG/WebGL fallback, seeking and both aspects remain
  supported. A PNG remains a raster, and an old flat sprite remains a flat sprite.
- Task 10 rights/evidence checks cover every new media type, rig part, voice,
  reference, pack and release. Public display permission does not automatically
  grant asset redistribution. Never invent consent or legal clearance.
- Local manual authoring and original fixtures are the required fallback. Before
  selecting a live backend, verify current official APIs, model/license terms,
  supported inputs/outputs and resource costs. Keep secrets server-side and make
  spend/data scope explicit. No provisioning, paid call, public deployment or send
  is authorized merely by this roadmap.
- Label actual states: local fixture, approximate timing, heuristic analysis,
  configured/live-verified provider, or unavailable. A mock pass proves the
  contract; it does not prove a live integration. Do not ship inert buttons as
  implemented features.
- First-round deadline rule: finish Task 11's minimum, then Task 12's full gate.
  Do not start Task 13 while Task 12 is incomplete. Cut stretch work first; never
  bypass review, rights, validation or recovery to make a deadline.
- Before each task, read root/kit instructions, current context, this board and its
  dependencies. Inspect actual seams and write
  `docs/superpowers/plans/YYYY-MM-DD-task-NN-<topic>.md` with exact files,
  interfaces, failing tests and commands. The board does not preassign future
  schema numbers or pretend those interfaces already exist.
- Use TDD for domain changes and meaningful API/browser acceptance. Run
  `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm verify:preserved` and affected `pnpm test:e2e`. Run Next type generation
  and builds sequentially. Record actual counts, skips and live-provider checks in
  `docs/tasks/task-NN-verification.md`; update current context and this board.
- Mutation tests use isolated DB/media roots. Never reset the regular project.
  Keep Afterlight v2 work in `landing-page/`; frozen designs and vendor references
  stay untouched. UI additions follow studio/player briefs and bounded desktop/
  mobile Impeccable review, including keyboard, error, long-text and recovery states.
- Core items and stretch items are distinguished below. A missing core gate means
  the task is incomplete. An unbuilt stretch item is explicitly moved to future
  scope in the handoff; it is never silently counted as delivered.

## Git and checkpoints — binding user workflow

1. **Tasks 11 and 12:** prepare normal separate local feature-branch handoffs for
   the user to commit to GitHub, as for earlier tasks. The agent does not stage,
   commit, push or merge unless separately instructed. Verify the user's previous
   commit before starting the next branch. Task 12 is the last user-committed
   milestone before the final preparation phase.
2. **Tasks 13–18, and optional 19–20:** use a new local branch name for each task,
   carrying forward all earlier uncommitted work. Suggested names are
   `feat/task-13-story-speech` through `feat/task-18-final-workflow`; optional
   branches use their task numbers. **Do not commit between these tasks.** Do not
   implement a skill's routine commit step against this instruction.
3. A branch name does not save dirty files. Without commits, those branch refs
   still point at the Task 12 commit; they are not independent task snapshots.
   Record that Task 12 base SHA once, retain cumulative changes in the working
   tree, and create the next branch from the current checkout without discarding
   them. Do not force-switch to another historical tree or create a clean checkout
   that leaves the accumulated work behind.
4. Before and after every post-12 task, create a contained local checkpoint with
   base SHA, active branch, source hashes, tracked diff **and untracked source
   contents**, verification results and dependency/lockfile state. Patches alone
   omit new files. Task 12 supplies the checkpoint/runbook tooling; keep generated
   checkpoints outside Git under ignored `data/checkpoints/`. Exclude secrets,
   dependency caches and Git internals. Back up the consistent demo DB plus its
   referenced immutable media/evidence separately when the runtime data changes.
5. No automatic stash, reset, clean, force checkout, source restore or history
   rewrite. Recovery previews a checkpoint in a separate location; overwriting
   current work needs the user's explicit instruction. A branch conflict is a
   reason to preserve/report the state, not delete it.
6. Keep the Task 12 commit, lockfiles, verified launch instructions, clean
   presentation data and portable/video backup reproducible. Later checkpoints
   add to that fallback; do not overwrite its only copy.
7. At Task 18, hand off the cumulative Tasks 13–18 changes and checks for one
   user-controlled final commit before the final presentation. If 19/20 are used,
   include them only after their gates pass; otherwise keep Task 18 runnable.
   Do not merge empty task branches to simulate missing commits.

## Milestones

| Task | Working outcome | Priority |
|---|---|---|
|11|Articulated character posing with canon-aware diagnostics|First selection|
|12|Interactive lore inspection and integrated landing/studio/player handoff|First selection; user commit|
|13|Project/story authoring, dialogue, local speech and mouth timing|Core final workflow|
|14|Reviewed visual variants and a real Director provider path|Core final workflow|
|15|Reviewed music/Foley generation and integrated sound cues|Core final workflow|
|16|Canon memory, impact queries and explainable attention assistance|Core final workflow|
|17|Server access policy and two-creator dialogue drafts|Core final workflow|
|18|Immutable interactive releases, feedback, reusable packs and final integration|Final-day gate; user commit|
|19|Advanced performance: IK/deformation, predictive attention or live music|Optional; select independently|
|20|External delivery/scale integrations and sandbox commerce|Optional; select independently|

## Task 11 — Articulated character posing and canon-aware motion

**Depends on:** Tasks 04 and 10, including their closeout gates.  
**Meaningful addition:** a character's authored limb actually moves; this is not
the existing `pose` label being presented as a rig.

**Core scope:** one small original layered rig with stable bone/attachment IDs,
parent/rest transforms, explicit limb-to-canon references and bone-angle keyframes.
Bound the first contract to32 bones and128 total bone keyframes per rig. Use rigid
SVG attachments and pure forward kinematics; retain flat sprites unchanged.

**Code seams:** `packages/schema/`; API `stage_commands.py`, `dependency_graph.py`,
`linter.py`, `player_manifest.py`; web `features/stage/`, stage inspector, shared
player/export; new original fixtures under `assets/fixtures/` with provenance.

- [ ] Add shared TS/Python rig validation and pure deterministic FK; reject cycles,
  missing parents/slots, duplicate IDs, invalid timing and nonfinite transforms.
- [ ] Add reviewed pose/keyframe commands, exact undo/reload/fork behavior and
  descendant-only invalidation. Rig angles and runtime matrices remain distinct.
- [ ] Add bone selection and explicit pose preview/save/cancel. Link supported limb
  actions to existing injury/recovery evidence as soft continuity diagnostics;
  unsupported action semantics are labelled, not guessed from pixels.
- [ ] Evaluate the same saved pose at a given time in studio, native fallback,
  player, portable reopen and WebM, in16:9 and9:16.
- [ ] Hand off the minimum rig plus regression evidence before stretching scope.

**Acceptance:** changing an arm parent moves only its descendants/attachments;
undo restores exact authored state; seek is deterministic; injury evidence remains
inspectable; no sprite IDs/originals are replaced silently. At least one actual
articulated pose is saved, reloaded and exported in a browser test.

**Deadline cut:** advanced skinning and two-bone IK move to optional19. Do not let
arbitrary-body reconstruction, mesh tooling or a second renderer delay Task12.

## Task 12 — Integrated presentation build and interactive lore inspection

**Depends on:** Task11 plus the complete Tasks00–10 workflow.  
**Meaningful addition:** authored lore hotspots in the player reveal canon from
the exact saved scene, connecting the creative document to the viewing experience.

**Core scope:** at most8 labelled hotspots per shot, targeting existing character/
event records with text-only accessible detail; no arbitrary HTML/URLs/scripts.
Keep viewer navigation temporary. Add the selected landing to the same local
application at `/welcome`; retain `/` for studio and `/player` for compatibility.
The main presentation entry is `/welcome`, not the illustrative landing widget.

**Code seams:** `landing-page/`, web App Router/asset serving and navigation,
studio/player components, schemas/commands/manifest; `tools/`, root package scripts,
README, product/design briefs and `tests/e2e/`.

- [ ] Add reviewed hotspot authoring, reference validation, keyboard activation,
  accessible close/focus return and offline portable support. Expose the actual
  saved character/event evidence; missing references show a recoverable state.
- [ ] Mount Afterlight v2 without redesigning it or duplicating its source of truth.
  Namespace its CSS/module/font/image delivery; preserve standalone landing scripts
  and all frozen archives. Test every required asset with the integrated build.
- [ ] Connect a real Open studio action and studio/player/landing return links.
  Replace obsolete “engineering has not started” claims with verified capabilities;
  keep any illustrative landing interactions explicitly labelled illustrative.
- [ ] Prepare an isolated, original/licensed presentation workspace through normal
  repository commands. Include the articulated character and existing continuity,
  audio, jobs, branches, portrait and rights/export workflows. Opening the landing
  never resets, upgrades, forks or overwrites the regular user project.
- [ ] Supply a pnpm-free **run** entry such as `node tools/presentation.mjs start`,
  using configured Python and a prepared production build. Check prerequisites,
  ports, health and media; stop only owned child processes. Worker execution is
  explicit and scoped to the selected disposable workspace. Document build/setup
  separately; do not silently install global tools or change PATH/security policy.
- [ ] Supply safe source checkpoints for the post-12 no-commit workflow. Retain
  clean presentation data, an exact portable bundle and a playable WebM backup;
  document restore into a separate workspace rather than destructive reset.
- [ ] Run a fresh production journey: landing → studio → real edit/reload/undo →
  job review → portrait → hotspot player → attributed JSON/WebM → offline reopen.
  Include GPU/provider failure, ordinary-shell launch and narrow/keyboard checks.
- [ ] Hand off runnable commands, capability/limitation list, evidence and user
  commit readiness. Do not start13 until this first-selection gate is complete.

**Acceptance:** a fresh local start reaches the real product from the selected
landing; all currently delivered features remain usable together, without cloud
keys or terminal surgery. Hotspots work from a downloaded file with API blocked.
No dead main CTA, missing landing asset, mock presented as live AI, or blanket
rights grant remains. This task prepares the software, not the presentation script,
slide deck or judging/rehearsal plan; the user will plan that separately.

## Task 13 — Create a story, author dialogue and animate speech

**Depends on:** Task12 user-committed baseline and Task09 jobs.  
**Core scope:** minimum project/character/event/scene/shot forms, attributed lines,
caption timing, local PCM WAV import/trim and a small mouth attachment vocabulary.
This closes the gap between editing the seed and creating supported new content.

**Code seams:** schemas/commands, repository project creation, API audio assets/
commands/linter, studio lore/dialect/timeline panels, Task11 attachments, shared
clock/audio/player manifests and job alignment providers.

- [ ] Add explicit blank/template project creation and bounded story forms with
  stable IDs, validated references and dependency-aware delete/reject behavior.
  Avoid a general-purpose graph editor or unrestricted JSON patch interface.
- [ ] Save distinct speaker/shot/text/caption/cue records through reviewed commands;
  integrate dialect diagnostics with real saved lines and source evidence.
- [ ] Import only the supported bounded WAV format with actual header/duration
  checks, immutable bytes, rights/voice consent and revision-owned cue bindings.
- [ ] Add editable mouth intervals, original shape fixtures and deterministic
  phoneme/viseme mapping. Manual timing and a labelled envelope approximation work
  locally; a verified aligner/TTS timing adapter is an enhancement, not fabricated
  phonemes from ASR word timestamps.
- [ ] Fence alignment results by transcript revision and exact audio hash; show
  review before accepting timing. Share caption/mouth/audio seeking in all outputs.

**Acceptance:** create a small two-speaker project from UI, save/reload/fork/undo
lines and cues, and reopen captioned speech/mouth motion offline. Bad speaker IDs,
unsafe media, out-of-shot trims and stale alignment fail without partial canon.
No real voice cloning or unapproved speech generation is added by implication.

## Task 14 — Reviewed visual variants and Director integration

**Depends on:** Tasks11–13 and existing jobs/provenance.  
**Core scope:** one selected-layer asset workflow, bounded PNG support, structured
Director proposals and replaceable controlled/reference-guided variants.

**Code seams:** shared media/manifests; API job/provider/proposal/asset commands;
web compositor/native fallback, source/mask draft, job and proposal review UI.

- [ ] Add actual bounded PNG import/decode/dimension/pixel checks and portable/
  WebM rendering before wiring a raster-generating backend. Preserve source
  bytes, hashes and lineage; no tracing or claim of SVG editability.
- [ ] Extend jobs with explicit artifact kinds and server-validated scoped asset
  attachment. Show source/result/control/reference/mask and exact target diff;
  only approval changes the selected layer's reference, with exact undo.
- [ ] Add one configurable structured `TextModel` adapter for cited lore/dialogue/
  scene proposals, retaining the deterministic mock and operation allowlists.
  Provider text never creates new permissions or invokes tools from story content.
- [ ] Add one `ImageGeneration` backend path with explicit capability reporting for
  pose/depth controls and approved identity/style references. Where supported,
  include a source-dimension mask and local inpainting/compositing; otherwise
  disable that combination rather than silently dropping a requested control.
- [ ] Exercise budget/scope review, cancellation, retry, refusal, invalid media,
  stale completion and no-unrelated-layer changes. Record actual live smoke
  results only with configured, authorized credentials/backend.

**Acceptance:** local original-fixture jobs complete the full stage/review/attach/
undo/portable round trip. A configured live path demonstrably invokes its backend
and records real model/control/provenance data; without one, UI/evidence honestly
report offline-only and live-unverified. Mask differences are shown or safely
composited; no zero-drift or perfect identity-consistency claim.

**Cut first:** a second image provider, unrestricted mask tools and broad control
combinations. Keep one working supported path instead of several empty adapters.

## Task 15 — Reviewed music/Foley and connected sound cues

**Depends on:** Tasks13–14 and existing mixer/jobs/rights.  
**Core scope:** generated/imported clips become reviewed immutable assets and
speaker/Foley/music cues in the same saved timeline and export.

**Code seams:** audio generation provider/job contracts, audio import/commands,
timeline/mixer, tension/position bindings, approval UI and portable manifests.

- [ ] Add one optional verified clip-generation adapter (Lyria where its actual
  capability fits), plus deterministic original local clips. Verify format,
  duration, cost and model terms at implementation time; normalization into the
  supported audio format is part of the deliverable, not a hidden prerequisite.
- [ ] Capture prompt/input references/model/rights; validate actual decoded output.
  Audition requires a user gesture; save attachment/trim/gain as one reviewed edit.
- [ ] Integrate dialogue, music and spatial Foley with seeking, tension and prop
  movement in16:9/9:16 and offline exports. Retain original creator-supplied stems.
- [ ] Cover invalid/oversized output, missing provider, retry/cancel/stale work,
  consent mismatch and audio-node cleanup. Rejection leaves the saved mix intact.

**Acceptance:** approve a staged clip, hear it through the actual mixer, save/
reload/undo and export/reopen the same mix with captions/mouth timing preserved.
No generation action autoplays or publishes. A mixed clip is not called separated
stems. Live results and fixture results are recorded separately.

**Deferred:** real-time model streaming belongs to optional19; it must not become
a playback/startup dependency or replace the deterministic saved mix.

## Task 16 — Canon memory, impact and explainable composition assistance

**Depends on:** Tasks13–15.  
**Core scope:** bounded local canon search and cited proposal context, the existing
graph as an inspectable query source, and a deterministic attention/layout helper.

**Code seams:** API dependency graph/linter/proposal context and SQLite search;
web impact inspector, composition/render-plan/portrait editor; derived analysis
contracts/jobs. No mandatory Neo4j, Qdrant, model download or GPU service.

- [ ] Index/query exact saved character/event/dialogue excerpts with stable IDs,
  hashes and project/branch/revision visibility. A rebuild reproduces results;
  stale/deleted/sibling-branch text cannot enter another context.
- [ ] Use bounded local text retrieval initially; a verified embedding adapter can
  enrich it without changing the visibility filter. Keep exact canon lookup
  authoritative and retrieved source text untrusted. Citations resolve on click.
- [ ] Expose dependency/impact queries and retain current deterministic traversal
  as the default. Cache/index state is rebuildable and never validates canon.
- [ ] Add finite contrast/centrality/subject/text heuristic analysis for a saved
  frame/time/aspect/hash set. Show reasons and uncertainty, including blank frames.
  Preview safe-area/layout suggestions through existing reviewed commands.
- [ ] Connect saved dialogue/action annotations and injury/recovery evidence to
  diagnostics; optional semantic model suggestions remain labelled and reviewed.
  Do not pretend keyword search is semantic understanding or canonical truth.

**Acceptance:** a retrieved claim cites the right immutable source; fork/deletion/
undo/reindex cannot leak or resurrect invisible content. A composition suggestion
changes nothing until approved and preserves the other aspect. Outage/cancel keeps
manual work usable. Attention is labelled heuristic, with no CTR promise.

**Dependency adjustment:** this is still single-owner, loopback-local work. Scope
filtering is required now; Task17 adds verified-actor authorization to every query
before any shared mode is exposed. External graph/vector services move to20;
predictive-model evaluation moves to19.

## Task 17 — Verified access and two-creator shared dialogue drafts

**Depends on:** Tasks13 and16, plus the existing command/job/branch contracts.  
**Core scope:** owner/editor/viewer authorization, revision delivery and one Yjs
dialogue-draft surface. Preserve a key-free local-owner mode.

**Code seams:** API route/repository/media/search/release authorization, sessions/
membership/events side tables; web fixed proxies, scope loading and dialogue draft
UI; authenticated project/branch rooms and separate shared-draft storage.

- [ ] Establish server-verified sessions/actors and role checks for documents,
  commands, media/evidence, jobs, proposals, branches and search. Client actor IDs
  cannot grant rights. Shared mode is off until this complete boundary passes.
- [ ] Add monotonically sequenced revision events with bounded replay, gap refetch,
  reconnect and revocation. Presence/selection never enter canonical snapshots.
- [ ] Use Yjs only for attributed dialogue drafts; persist drafts separately, bound
  room/update sizes and keep draft undo distinct from canonical undo.
- [ ] Save an acknowledged draft through an idempotent revision-checked command.
  Concurrent/stale saves require resolution; reconnect cannot overwrite canon.
- [ ] Test two independent clients, forged identities, viewer writes, cross-project
  access, revocation, malformed updates and branch-switch cleanup.

**Acceptance:** two authorized creators converge on draft text; one explicit save
creates one canonical revision. A viewer cannot edit or receive private room data.
Other client's saved rig/audio/asset edits arrive through authoritative snapshots,
not a second Yjs document. Offline single-owner startup remains available. Access
revocation cannot retract portable files already downloaded; state that limit.

**Cut first:** shared geometry/timeline CRDTs, public-account onboarding, social
login, large-room scaling and deployment. A tested two-person draft is the scope.

## Task 18 — Complete the interactive creation-to-release workflow

**Depends on:** all core gates11–17.  
**Outcome:** final-day-ready integrated product; cumulative handoff for the user's
pre-final commit. This is a release/integration task with three bounded features,
not a placeholder for unfinished work from earlier tasks.

**Code seams:** player manifest/interactive controls from12, release storage and
rights; feedback/proposal/branch side tables; contained pack import/export and
asset library; launch/build/checkpoint tools and end-to-end tests.

- [ ] **Immutable release:** snapshot exact saved revision/media/evidence, captions,
  rig/mouth data and interactions. Extend hotspots with bounded authored choices
  between validated saved shots, maximum32 choices per release with bounded loop
  navigation. Viewer choices remain session state. Preview privately first; any
  publicly reachable mode enforces public-use rights and explicit release action.
- [ ] **Feedback loop:** one release-bound poll, explicit opt-in, bounded/idempotent
  local ingestion, visible aggregate/sample count and deletion/retention controls.
  Collection defaults off. A creator explicitly turns a selected feedback snapshot
  into a cited scoped branch proposal; viewers cannot rewrite canon. Provide a
  labelled local fixture when an external audience is unavailable.
- [ ] **Reusable packs:** support a bounded checksummed local pack for only the
  media/rig types actually implemented. Show license evidence and redistribution
  permission, dependency/import-ID mapping and reviewed import. Prevent overwrite,
  unsafe paths, executable content and unsupported versions. Prefer the existing
  bounded portable format over adding ZIP/marketplace infrastructure. Local library
  listing/delist is enough; no checkout or payout is implied.
- [ ] **Whole workflow:** create project → story/dialogue → articulate/animate →
  review visual/audio result → inspect canon/attention → collaborate on a line →
  fork/compare → portrait → attributed interactive release/export → feedback
  proposal → reuse an approved pack. Preserve user review at every canon boundary.
- [ ] **Final hardening:** run production browser and relevant development smoke,
  TS/Python parity, migration/restart/undo/fork, offline, permission and adversarial
  media checks. Verify first-round landing/studio/player launch still works and
  the regular project is preserved. Review the complete cumulative change.
- [ ] Freeze a runnable local build with capability/status matrix, current setup,
  evidence and restore checkpoints; retain Task12 fallback. Remove dead controls
  or mark unavailable enhancements honestly. Hand off the combined13–18 diff for
  the user's commit; do not commit/push on their behalf.

**Acceptance:** a new supported story reaches a reproducible interactive release
with all required media/evidence, plays with API blocked, and remains unchanged
after later editor edits. Consented feedback can inform a reviewed branch without
silently applying it. An approved pack round trip retains supported editability/
references/evidence. Task18 must be runnable with19 and20 absent.

**Deadline policy:** reduce fixture count, provider count and editing breadth;
do not remove the above end-to-end paths and still call them complete. Record any
unfinished path explicitly, retain the last green release and do not spend its
stabilization time starting optional work. Hosted publication is a separate action.

## Task 19 — Optional advanced motion, attention or live music

**Run only if:** Task18 is green, checkpointed and safe for the final presentation.
Select each submodule independently; completing one does not imply the others.

- [ ] **19A — Two-bone IK:** deterministic reachable/unreachable/zero-length/
  near-singular handling, finite tolerance/iteration bounds, joint limits, explicit
  FK fallback and preview-before-save targets. Add limited weighted deformation
  only for the original supported mesh, with validated weights and runtime parity.
- [ ] **19B — Predictive attention:** one optional versioned predictor, licensed
  held-out evaluation, predeclared success/resource thresholds and comparison with
  Task16. Report measured failures too; keep the heuristic fallback. No CTR claim.
- [ ] **19C — Real-time music audition:** one supported optional streaming adapter,
  explicit connect/play/stop, bounded spend/buffer/time and jitter/disconnect tests.
  Streams stay temporary; a retained segment uses Task15's reviewed clip path.

**Gate:** default-off flags, no new startup service, exact cleanup/fallback and
independent tests. Late failure leaves Task18 usable. Keep the no-commit/checkpoint
policy. Advanced physics, arbitrary mesh reconstruction and stem/MIDI promises are
not implied.

## Task 20 — Optional external delivery, scale adapters or sandbox commerce

**Run only if:** Task18 remains green and time/credentials support a chosen slice.
This is a menu, not an instruction to complete three new platforms.

- [ ] **20A — Official community/hosting connector:** one destination and exact
  payload preview, explicit send/publish, server-held credentials, receipt,
  reconciliation before uncertain retry, revoke and authorized feedback import.
  Mock and live-send status stay distinct. No scraping or autonomous replies.
- [ ] **20B — External graph/vector adapter:** benchmark a representative corpus
  first; add Neo4j/Qdrant-compatible storage only if it serves a measured need.
  Prove parity, revision/actor isolation, idempotent rebuild and local fallback;
  external indexes remain derived, not owners of canon.
- [ ] **20C — Sandbox pack transactions:** only with Task17 access and Task18 packs;
  explicit entitlement transitions, immutable version/license receipts, verified
  signed callbacks, integer minor-unit accounting and replay/refund tests. No live
  money, payouts or seller/legal/tax readiness claim. Real commerce remains future.

**Gate:** one useful fully tested selected integration beats three skeletons.
None may alter the saved release, weaken rights or block startup when unavailable.
No deployment/send/purchase is authorized until its exact external action is
separately approved. Keep the same no-commit policy until user handoff.

## Coverage of every original Task 11–29

| Original task | New owner | Kept scope / explicit reduction |
|---|---|---|
|11 Rigs/FK|11|Original bounded articulated rig, commands and shared rendering|
|12 IK/deformation|19A optional|Rigid FK is core; IK/skinning must not delay first selection|
|13 Dialogue/speech|13|Saved lines, local speech/captions plus minimum story creation|
|14 Alignment/visemes|13|Manual/approximate local path, optional verified timing adapter|
|15 Controlled images|14|PNG pipeline, scoped reviewed generation and one backend path|
|16 References/inpainting|14|Capability-gated reference/mask path; no zero-drift promise|
|17 Lyria clips|15|Reviewed clip generation/normalization and saved mixer integration|
|18 Lyria real time|19C optional|Audition only; saved clip workflow is core|
|19 Heuristic attention|16|Deterministic explainable overlay and reviewed layout|
|20 Predictive saliency|19B optional|Evaluated optional model, no unsupported performance claim|
|21 Actors/events|17|Verified roles/events before exposing shared mode|
|22 Yjs|17|Two-creator dialogue drafts; geometry CRDT deferred|
|23 Graph DB|16 core /20B optional|Local graph queries core; external database measured only|
|24 Vector memory|16 core /20B optional|Cited scoped local retrieval core; embeddings/server optional|
|25 Interactive releases|12 foundation /18 completion|Hotspots early; immutable choice release at final gate|
|26 Audience feedback|18|Consented local poll/aggregate → reviewed branch proposal|
|27 Community APIs|20A optional|Official connector only; local feedback works without it|
|28 Catalog/packs|18|Private/local validated pack exchange; no hosted marketplace|
|29 Transactions|20C optional /future|Sandbox receipts/entitlements optional; live business deferred|

Additional master-plan gap covered: Task13 adds minimum non-seed project/story
authoring. Existing branch comparison remains useful without pretending merge
exists. Scope moved out of core remains visible here rather than being lost in
renumbering. Each task handoff records delivered, deferred and live-unverified
items so this table can be reconciled against reality.

## Future scope — not required for Task18 completion

- Any unselected19/20 submodule; real, licensed alignment/provider capabilities
  that cannot be exercised with available hardware/credentials in this schedule.
- Production hosting, PostgreSQL/object storage/Redis fleets, multi-tenant account
  onboarding, high-scale presence/CRDT geometry, and graph/vector infrastructure
  without a measured need. Local role checks are not a production security audit.
- Hosted public marketplace, real payment/royalty settlement, tax/jurisdiction,
  seller operations, fraud/disputes and live checkout. Sandbox state is not money.
- General three-way merge/apply and conflict-resolution authoring; keep existing
  read-only comparison until a separately validated merge command is scoped.
- Reproducible FFmpeg MP4/reels, arbitrary-format DAW/video import, general Bezier
  or mesh editors, arbitrary-body auto-rigging, physics/full-body IK and reconstruction.
- Guaranteed identity consistency, lossless diffusion edits, automatic ownership/
  consent clearance, measured CTR uplift, autonomous posting/replies, and inferred
  story truth from audience sentiment. These are not claims of the planned build.
- Standalone distributed player SDK/mobile apps/third-party editor plugins,
  advanced accessibility tracks and audio description beyond the core caption/
  transcript/keyboard/reduced-motion path, localization and production analytics.

## Board progress and handoff

- [x] Task10 existing implementation closeout reconciled; no Task11+ feature work.
- [ ] Task11 minimum feature and user commit handoff.
- [ ] Task12 first-selection integrated build and user commit handoff.
- [ ] Task13 checkpointed; no commit.
- [ ] Task14 checkpointed; no commit.
- [ ] Task15 checkpointed; no commit.
- [ ] Task16 checkpointed; no commit.
- [ ] Task17 checkpointed; no commit.
- [ ] Task18 final integrated build; cumulative user commit handoff.
- [ ] Task19 selected submodules, only if time permits.
- [ ] Task20 selected submodules, only if time permits.

**Next implementation request:** Task11 from this file. Task10 closeout is complete;
no Task11+ implementation starts merely from this board.
