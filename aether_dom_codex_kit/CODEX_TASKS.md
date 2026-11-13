# AETHER-DOM — Codex work board (ordered)

## Definition of done for each task
- Behavior actually works in a local dev browser/server.
- Tests added for domain behavior; existing tests remain green.
- No uncommitted secret values or unintended third-party runtime dependency.
- UI shows meaningful loading/error/empty states.
- Short docs explain new contracts and commands.

## Task 00 — Scaffold contracts (START HERE)
**Deliver:** `pnpm` monorepo, `apps/web` Next 16, `apps/api` FastAPI, `packages/schema` with `.cdom` JSON Schema and the supplied sample fixture, bootstrap docs and shared commands.

**Acceptance:** web runs, API health endpoint responds, sample fixture validates in Python and TS, typecheck/lint/tests pass, root README documents local setup. No real model API calls. Expose a `GET /api/v1/health` and a read-only fixture endpoint.

## Task 01 — Studio shell
**Deliver:** desktop IDE with project explorer, left node navigator, center layered stage, right inspector, bottom timeline placeholder, diagnostics tray; seed Kael/Vance project.

**Acceptance:** select shot and layer, display layer transform in inspector, browser has no console errors.

## Task 02 — Commands and persistence
**Deliver:** typed operations with expectedRevision, SQLite snapshots and command history, undo/redo, save/reload.

**Acceptance:** refresh retains changes; mismatched revision returns 409; undo reverts exactly.

## Task 03 — Dependency graph and linter
**Deliver:** graph edge indexes, invalidation traversal, simple continuous rules for physical constraints, missing assets/refs and dialect forbidden terms.

**Acceptance:** injured Kael left-arm pose in a later scene creates evidence-linked diagnostic; repairing pose resolves it; event sequence supports healing.

## Task 04 — 2.5D stage
**Deliver:** draggable/reorderable planes and sprites, SVG prop selection/edit, camera and 16:9 canvas preset, keyframe interpolation.

**Acceptance:** move one layer without affecting others; imported asset ID is preserved; save+reload identical.

## Task 05 — Audio reactive
**Deliver:** WebAudio local stems and Foley, spatial panning of bound prop, tension slider mapped to gains, audio-reactive glow driven by analyser.

**Acceptance:** play requires click, left/right move audible, no React rerender every audio sample, stable on re-seek.

## Task 06 — AI proposals
**Deliver:** provider interface with mock implementation, prompt context scoped to selected canon nodes, JSON response parsing, preview diff, approve/reject with scope permissions.

**Acceptance:** invalid response rejected; no edit until approval; stale proposal rejected/rebased.

## Task 07 — Aspect-ratio & player
**Deliver:** editable 9:16 overrides, safe-area composition, independent player route, bundle/JSON export.

**Acceptance:** both Kael and Vance stay visible in 16:9 and 9:16; player reads same manifest.

## Task 08 — Branching and exports
**Deliver:** fork, branch switch, three-way diff prototype, simple WebM output; FFmpeg MP4 optional.

**Acceptance:** branches isolate edits; conflicting branch edits identified, not overwritten.

## Later epics — ordered execution tasks

**Planning baseline:** 13 November 2026. Tasks 00–08 have implementation and verification records in `docs/tasks/`; all tasks below are **not started**. This section expands the original later epics: Yjs collaboration, visual generation with ControlNet/IP-Adapter, full rig/IK, phoneme alignment, predictive saliency model, Lyria integration, telemetry/community publishing, graph/vector DB, commercial rights policies and marketplace.

**Goal:** Add these capabilities as independently verifiable slices while retaining the local-first editor and creator-owned canon.

**Architecture:** Extend the existing validated command/revision repository, shared contracts, proposal review and shared studio/player evaluators. Jobs, collaborative drafts, retrieval indexes and analysis stay outside canonical snapshots; accepted creative edits still commit through the server command path.

**Tech stack:** Existing Next.js/TypeScript, FastAPI, SQLite, JSON Schema, Three.js/SVG and Web Audio. Yjs and external provider/database adapters are introduced only in their owning tasks, behind optional interfaces.

**Spec:** `AETHER_DOM_MASTER_PLAN.md` §§3–10, 12 and 14; `../PRODUCT.md`; latest `../docs/tasks/task-08-verification.md`. The initial proposal is historical context; the master plan's feasibility corrections and the latest implementation evidence take precedence over its stronger claims.

### Execution rules for Tasks 09–29

- Work on one numbered task at a time, in the default order below. Dependencies are hard prerequisites; independent optional integrations may be skipped explicitly and remain not started. A later task must not quietly implement a skipped prerequisite.
- This is the execution board, not a batch instruction to build every epic. At the start of a requested task, read current context and inspect the listed code areas, then write a task-specific implementation plan in `docs/superpowers/plans/` with exact files, interfaces, failing tests and verification commands. The code areas below identify existing seams, not mandatory new filenames or permission for broad refactoring.
- Extend canonical schemas only when authored data needs it. Keep versions 0.1/0.2/0.3 and existing exports readable; preserve original schemas/fixtures, immutable asset versions, stable IDs and exact undo. Introduce explicit versioned migrations with lossless source retention; never upgrade user documents on startup.
- Every canon edit uses typed commands, `expectedRevision`, validation, invalidation, audit and inverse data. Jobs/providers return staged artifacts or proposals. Approval revalidates the captured branch/revision/scope; rejected, stale, cancelled or failed work cannot mutate canon.
- External integrations are optional. Preserve key-free startup and deterministic mock fixtures. Before implementing a live adapter, verify current official API/model documentation, capability, license and deployment requirements; record the selected versions. Keep secrets server-side and require an explicit generation action with bounded cost and data scope. A mock-only pass proves the contract, not a working live integration; report live checks as unverified until exercised with authorized credentials.
- Each task includes meaningful TS/Python contract/domain tests and the affected API/browser flow. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm verify:preserved` as applicable to its changes; run `pnpm test:e2e` for changed browser behavior. Use isolated DB/media roots. Record actual results, skips and provider limitations in `docs/tasks/task-NN-verification.md`, update `current context.md`, and keep user integration preferences.
- UI acceptance includes loading/error/empty/permission/recovery states, keyboard/focus, long content, narrow layouts and reduced motion where relevant. Keep Afterlight v2 landing work separate; frozen designs, vendored references and original kit/source fixtures remain preserved. This board's requested expansion is the explicit exception to kit preservation.

### Coverage and dependency guide

| Original epic | Tasks | Main prerequisite |
|---|---|---|
| Shared asynchronous execution | 09 | Existing commands and proposals |
| Commercial rights policies | 10 | Existing asset/export path |
| Full rig/IK | 11–12 | Existing stage; 10 for rig assets |
| Phoneme alignment | 13–14 | Speech/dialogue authoring, jobs and mouth rig |
| ControlNet/IP-Adapter visual generation | 15–16 | Jobs, provenance and rig/control inputs |
| Lyria integration | 17–18 | Jobs, provenance and imported audio |
| Predictive saliency model | 19–20 | Honest heuristic baseline and evaluation data |
| Yjs collaboration | 21–22 | Server-enforced actors/roles and revision events |
| Graph/vector DB | 23–24 | Revision-bound rebuildable indexes |
| Telemetry/community publishing | 25–27 | Immutable releases, access policy and consent |
| Marketplace | 28–29 | Commercial-use records, identities and validated packs |

### Review focus across the later epics

- **Stale or retried work:** branch changes, concurrent saves, late provider completions and duplicate messages must never apply twice or to a different revision. Owned by 09, 15–18, 21–22 and 27.
- **Untrusted or unavailable media:** malformed imports, unsafe paths/markup, missing originals and unknown rights must produce bounded errors and preserve the last saved state. Owned by 10–16, 25 and 28.
- **Runtime parity:** seek, shot boundaries, portrait overrides, missing GPU/model support and offline export must retain deterministic composition/audio behavior. Owned by 11–20 and 25.
- **Authority and data isolation:** another project's actor, job, CRDT room, retrieval hit, release or purchase must not expose or modify private work. Owned by 21–29, with local scope checks from 09 onward.
- **Honest evidence:** uncertainty, heuristic versus model output, approximate versus phoneme timing, provider format limits and incomplete rights must stay visible. Owned by 10, 14–20 and 25–29.

## Task 09 — Durable jobs and provider execution contracts
**Depends on:** Tasks 02 and 06.

**Deliver:** SQLite-backed local job repository and worker, typed request/status/result contracts, idempotency keys, bounded retries, progress, cancellation and restart recovery. Capture project/branch/base revision, allowed scope, input hashes, provider/model, estimated/actual cost and artifact references. Start with a deterministic mock job; no mandatory Redis or hosted worker.

**Code areas:** `apps/api/app/proposal_provider.py`, `proposal_domain.py`, `repository.py`, `persistence/`, migrations; `packages/schema/`; existing proposal panel and API proxies.

- [ ] Define allowed state transitions and the boundary between artifact completion and human approval.
- [ ] Add durable enqueue/status/cancel APIs and a locally runnable worker; expose honest job history/recovery UI.
- [ ] Exercise failure, retry, cancellation and process restart before connecting a paid provider.

**Acceptance:** enqueue retry returns the same job; two workers cannot complete one claimed attempt twice; interrupted work resumes or becomes explicitly retryable after restart. A completion arriving after cancellation or branch advancement cannot apply. Malformed results fail validation; job creation, progress and completion leave canonical revision/history unchanged.

## Task 10 — Asset provenance and commercial-use policy
**Depends on:** Tasks 04 and 07.

**Deliver:** A versioned asset ledger for immutable originals/derivatives, hashes, creator/source, license evidence, attribution, permitted uses, provider/model lineage and applicable voice/likeness consent records. Add editable evidence and explicit export-use decisions: private preview, public distribution and commercial pack use. Policy evaluates recorded permissions; it does not provide automatic legal clearance.

**Code areas:** `apps/api/app/asset_inventory.py`, `svg_assets.py`, `audio_assets.py`, `player_manifest.py`, `linter.py`; schema assets/provenance; studio asset inspection and player export.

- [ ] Preserve existing asset IDs and known/unknown-rights behavior while introducing typed evidence and policy results.
- [ ] Route authored metadata corrections through reviewed commands; keep evidence files immutable and contained.
- [ ] Surface blocking reasons, required attribution and a recoverable evidence-edit path.

**Acceptance:** unknown or incompatible rights block the requested distribution/commercial use; rights edits are audited and undoable. Forks and exports retain the exact asset-version evidence. Changing public-use permission does not invent ownership or silently publish. Malformed/missing evidence and unsafe file paths are rejected without altering originals.

## Task 11 — Authored skeletal rigs and forward kinematics
**Depends on:** Tasks 04 and 10.

**Deliver:** Versioned rig/pose contracts with stable bone IDs, parent hierarchy, rest transforms, attachment slots, bounds and authored bone keyframes. Add a small original layered character rig and editor controls for bone/attachment selection. Implement pure forward kinematics using the existing timeline and compositor, shared with player/export.

**Code areas:** `packages/schema/`; `apps/api/app/stage_commands.py`, `dependency_graph.py`, `linter.py`; `apps/web/src/features/stage/`, stage editors, player manifest; new original fixture assets.

- [ ] Validate rig graphs, attachment references and bounded transforms in TS and Python.
- [ ] Add revision-checked rig/pose edits with exact undo and dependency invalidation.
- [ ] Render articulated assets in studio and player, retaining the existing flat-sprite path.

**Acceptance:** moving a parent updates only its descendants/attachments; cycles, missing parents and non-finite values fail. Save/reload, seek and portable reopen reproduce the pose in both aspects. Original fixed drawings remain fixed drawings; legacy pose metadata is not relabelled as an articulated rig. Existing injured-arm diagnostics retain evidence.

## Task 12 — Inverse kinematics, joint limits and deformation
**Depends on:** Task 11.

**Deliver:** A bounded deterministic two-bone IK solver, joint/effector constraints and weighted deformation for a small supported rig mesh. Provide explicit FK/IK editing, reach/limit feedback and a preview-before-save flow. Start with the authored limb fixture rather than arbitrary human-body reconstruction.

**Code areas:** Existing stage rig evaluator/commands from 11, `features/stage/geometry.ts`, stage editors, rig schemas and continuity diagnostics.

- [ ] Specify finite iteration/error limits, unreachable-target behavior and FK fallback.
- [ ] Keep solver output derived during dragging; save reviewed targets/pose through typed commands.
- [ ] Use the same constrained evaluation in studio, player and frame export.

**Acceptance:** reachable targets meet the documented tolerance; unreachable, zero-length and near-singular chains finish within bounds and show useful feedback. Joint limits, skin weights and injury constraints are validated. Undo restores exact authored state; seek/export match the saved preview. Unsupported rigs show a clear limitation and keep their previous valid pose.

## Task 13 — Attributed dialogue and local speech authoring
**Depends on:** Tasks 09 and 10.

**Deliver:** Stable dialogue-line IDs, speaker/shot references, authored text, transcript/caption timing and speech-asset bindings. Add bounded local PCM WAV import and cue trim/placement using the existing supported audio format. Extend the unsaved dialect tool into saved line authoring; retain manual editing without ASR or cloud services.

**Code areas:** Canonical schemas/commands, `apps/api/app/audio_assets.py`, `audio_commands.py`, `linter.py`; `components/studio/dialect-draft.tsx`, audio/timeline UI, shared audio evaluator and player manifest.

- [ ] Add explicit dialogue/cue commands and a compatible document migration; never modify the original sample.
- [ ] Validate actual media headers, decoded duration/size, speaker IDs and time intervals.
- [ ] Add transcript/caption preview and save/undo, keeping imported bytes separate from canon.

**Acceptance:** two speakers retain distinct saved lines/cues across reload, fork and undo. Unsafe, unsupported or oversized media fails without partial files/canonical writes. Missing speakers, invalid trim ranges and out-of-shot timing are diagnosed. Caption/speech seeking follows the shared clock; old documents play unchanged and cloud keys remain unnecessary.

## Task 14 — Phoneme alignment and viseme playback
**Depends on:** Tasks 09–11 and 13.

**Deliver:** A `SpeechAlignment` provider interface with deterministic fixtures and an optional verified forced-aligner or TTS-phoneme adapter. Add a fixed SVG mouth-shape set, phoneme-to-viseme mapping, editable timing preview and approved speech/rig bindings. ASR transcript/word segments are separate inputs, not fabricated phonemes.

**Code areas:** Job/provider seams from 09, dialogue contracts from 13, rig attachments from 11, stage/audio clock and player manifest.

- [ ] Validate ordered bounded intervals against the exact speech asset hash/duration and transcript revision.
- [ ] Preview alignment, label confidence and approximate envelope fallback, and save only approved timing.
- [ ] Evaluate mouth shapes deterministically at any playhead time in studio/player/export.

**Acceptance:** a licensed/original speech fixture produces repeatable expected mouth transitions on play, pause, seek and shot end. Stale transcript/audio results cannot apply; malformed/overlapping intervals fail the declared timing policy. Manual correction survives reload/undo. Missing aligner/model uses a clearly labelled approximation; no claim that Whisper word timestamps are phoneme alignment.

## Task 15 — Pose/depth-controlled visual generation
**Depends on:** Tasks 09–11.

**Deliver:** An `ImageGeneration` adapter with offline fixtures and one optional verified ControlNet-compatible backend. Generate a replaceable asset for one selected layer from explicit prompt, pose/depth controls, approved references, dimensions, seed and budget. Store immutable source/control/result artifacts and provenance; preview before attaching the result.

**Code areas:** Job/provider and rights ledger seams, rig controls, `apps/api/app/svg_assets.py`, stage asset versioning, proposal review and shared contracts.

- [ ] Declare provider capabilities and unsupported combinations instead of silently dropping controls.
- [ ] Validate returned media, isolate staging storage and present the exact target-layer asset diff.
- [ ] Add a typed reviewed asset-attachment operation with revision/scope checks and exact undo.

**Acceptance:** generation leaves canon unchanged until approval; approval changes only the selected layer's asset reference. Timeout, retry, cancellation and stale completions preserve original media and unrelated layers. Fixture tests verify transmitted controls and metadata. A configured live smoke check records the actual model/control behavior; raster output stays raster and consistency is not guaranteed.

## Task 16 — Reference-guided variants and localized inpainting
**Depends on:** Task 15.

**Deliver:** An optional verified IP-Adapter-compatible reference path and selected-layer mask/inpainting workflow. Capture reference permissions, input versions, mask coordinates, strength/settings and result lineage. Preview source/result/mask together; offer independent asset versions rather than replacing a whole scene.

**Code areas:** Image provider contracts from 15, rights ledger, stage selection/mask draft UI, immutable media storage and proposal approval.

- [ ] Normalize masks to the selected source dimensions and reject incompatible controls/references.
- [ ] Keep identity/style reference use explicit; show provider limitations and actual result differences.
- [ ] Attach a chosen variant through the same audited command path as 15.

**Acceptance:** bad masks, missing references and out-of-scope targets fail before spend. Unrelated layer IDs/asset bytes remain unchanged. If a provider changes unmasked pixels, show the difference or composite only the permitted region; never promise zero drift. Rejected/late output stays detached, and undo restores the prior asset version exactly.

## Task 17 — Lyria clip generation and reviewed audio attachment
**Depends on:** Tasks 09–10 and 13.

**Deliver:** An `AudioGeneration` interface, deterministic mock audio and an optional verified Lyria clip adapter. Capture prompt, requested duration, supported format, cost and rights/provider metadata. Decode/normalize supported output into the existing local audio path and preview a clip before approved cue/track attachment.

**Code areas:** Job/provider contracts, audio import from 13, `apps/api/app/audio_commands.py`, audio mixer/timeline, proposal review and player manifest.

- [ ] Record current provider mode/capabilities; reject unsupported duration or stem requests.
- [ ] Validate output media/duration and make auditioning an explicit user action.
- [ ] Save attachment/trim/gain as one scoped undoable edit; retain existing creator-supplied stems.

**Acceptance:** generation/audition do not write canon or autoplay. Cancel, timeout, invalid audio and provider refusal leave the saved mix unchanged. An approved clip seeks/mixes/exports in both aspects and survives offline portable reopen. A live integration check distinguishes actual generated formats from mocks; a mixed clip is never presented as isolated stems.

## Task 18 — Optional Lyria real-time audition
**Depends on:** Task 17.

**Deliver:** A separate capability-gated real-time music adapter with bounded buffering, explicit connection/play/stop, supported prompt controls, spend/time limits and underrun/disconnect handling. Streams are temporary audition state; a selected recorded segment becomes an immutable staged asset for review through 17.

**Code areas:** Audio provider and jobs interfaces, `apps/web/src/features/audio/engine.ts`, mixer UI and reviewed asset attachment.

- [ ] Keep connection state/buffers outside `.cdom` and audio-rate values outside React state.
- [ ] Define cleanup on stop, route/branch change, hidden/closed session and network failure.
- [ ] Reuse the clip approval path for anything the creator chooses to retain.

**Acceptance:** deterministic chunk fixtures cover jitter, out-of-order/invalid chunks, underrun and reconnect without leaking audio nodes or duplicate sessions. Hard limits stop resource use. Disconnect preserves authored playback; unsupported providers show an unavailable state. A live stream check is separately recorded; no assertion of MIDI or controllable isolated stems without actual provider support.

## Task 19 — Heuristic attention analysis baseline
**Depends on:** Tasks 04 and 07.

**Deliver:** An optional, clearly labelled contrast/centrality and authored-subject/text attention overlay for a saved frame/aspect/time. Provide inspectable reasons and a bounded composition suggestion preview. Keep scores/maps derived and retain manual layout authority.

**Code areas:** `apps/web/src/features/stage/composition.ts`, `render-plan.ts`, portrait layout editor; shared analysis contracts and proposal/command path.

- [ ] Define normalized inputs and deterministic CPU evaluation before optional acceleration.
- [ ] Key analysis to branch revision, aspect, time and asset hashes; discard stale maps.
- [ ] Preview suggested existing layout/appearance operations and apply only after explicit review.

**Acceptance:** fixed frames yield stable finite maps, including blank/uniform frames; cancellation and unavailable GPU retain a usable editor. Portrait suggestions respect safe areas and saved landscape state. Analysis alone changes no canon. UI describes a heuristic attention estimate and never reports predicted CTR or guaranteed audience response.

## Task 20 — Evaluated predictive saliency adapter
**Depends on:** Tasks 09–10 and 19.

**Deliver:** A `SaliencyAnalysis` model interface and one versioned optional predictor, selected using current primary documentation and licensed evaluation data. Compare it with 19 on a documented held-out set; record supported inputs, attention-agreement metric, latency, memory and hardware. Present model attribution/uncertainty and retain the heuristic fallback.

**Code areas:** Analysis/job contracts, derived attention cache/overlay from 19 and optional model loader/worker.

- [ ] Establish the dataset split, success thresholds and resource budget before tuning or choosing a backend.
- [ ] Test model unavailable/corrupt, unsupported image and execution cancellation paths.
- [ ] Reuse reviewed composition suggestions rather than letting a model move layers directly.

**Acceptance:** evaluation is reproducible with exact model/data versions and no training/test leakage. Report measured results even if the predictor fails to beat the baseline; that result does not qualify it as an improved default. Model output is labelled separately from heuristic output, no cloud upload occurs without explicit scope, and missing model/GPU falls back cleanly. CTR uplift requires a separate consented experiment and is not an acceptance claim here.

## Task 21 — Actor access policy and revision events
**Depends on:** Tasks 02, 06 and 08.

**Deliver:** Stable server-verified actor identities, project membership with owner/editor/viewer roles, and authenticated revision/event delivery for commands, jobs and proposals. Keep a local-owner mode for offline work. Events include project/branch, sequence and revision with gap detection and refetch; ephemeral presence does not enter canon.

**Code areas:** `apps/api/app/main.py`, repository/proposal/branch authorization, persistence/migrations; existing web API proxies, studio scope/loading and shared contracts.

- [ ] Enforce roles and ownership on the server; stop trusting client-supplied actor identity in shared mode.
- [ ] Define session establishment, expiry/revocation, origin checks and bounded event replay.
- [ ] Add read-only UI and explicit reload/reconnect when the client's revision stream has a gap.

**Acceptance:** viewer writes, forged actors and cross-project reads/jobs/proposal decisions are rejected. Editors cannot grant themselves ownership. Two clients observe monotonically ordered commits; duplicated/missing events cause safe deduplication/refetch. Revoked access stops live delivery and future writes. Local single-user startup still needs no external identity service.

## Task 22 — Yjs shared drafts and presence
**Depends on:** Tasks 13 and 21.

**Deliver:** A minimal two-creator collaboration slice using Yjs for attributed dialogue drafts from 13, plus selection/presence. Persist shared drafts separately. Saving creative content uses the existing server-validated command path and produces the authoritative branch revision; Yjs cannot bypass it.

**Code areas:** Authenticated events/rooms from 21, dialogue draft UI from 13, studio scope, command dispatcher and collaboration side-table contracts.

- [ ] Specify draft-to-command submission, acknowledgement and revision-conflict behavior before adding CRDT maps.
- [ ] Scope rooms to project/branch, bound update size/rate and preserve local pending drafts during reconnect.
- [ ] Separate draft undo from canonical undo; close/reset presence on branch switch and revocation.

**Acceptance:** two clients converge on shared draft text while a saved edit creates exactly one validated revision. Offline reconnect or a remote save cannot silently overwrite saved transforms/rigs/assets or auto-approve proposals. Duplicate submissions are idempotent; conflicting commits require explicit resolution. Viewer edits and malformed CRDT updates fail; shared draft data never appears as a second canonical document.

## Task 23 — Rebuildable graph database projection
**Depends on:** Tasks 03, 09 and 21.

**Deliver:** A graph-query interface with the existing in-memory implementation as the default and an optional Neo4j-compatible projection. Index stable node/edge identities and authored causal relations from exact branch revisions. Provide rebuild, incremental invalidation, freshness reporting and recovery without moving command/canon ownership out of SQLite.

**Code areas:** `apps/api/app/dependency_graph.py`, `repository.py`, `linter.py`; impact explorer and analysis contracts; projection worker using 09.

- [ ] Fix a representative traversal dataset and compare correctness/latency before adding service infrastructure.
- [ ] Make projection writes idempotent and namespace all nodes/queries by project/branch/revision.
- [ ] Fall back to current deterministic traversal when the projection is stale or unavailable.

**Acceptance:** in-memory and external backends return equivalent evidence/impact sets, including cycles, removed edges, fork divergence and undo. Delete/rebuild restores identical results. A stale index cannot validate a new revision as fresh, and cross-project queries reveal nothing. Core editing works with the graph service disabled; benchmark results determine whether the adapter offers useful scale benefits.

## Task 24 — Revision-filtered vector memory retrieval
**Depends on:** Tasks 09, 13, 21 and 23.

**Deliver:** A retrieval interface with deterministic local fixtures and an optional Qdrant-compatible adapter. Index canon excerpts using stable source IDs, content hashes, embedding model/version and revision visibility. Add cited retrieval to scoped proposal context; exact canon lookup and the existing proposal size/permission limits remain authoritative.

**Code areas:** `apps/api/app/proposal_provider.py`, `proposal_domain.py`, dependency indexes; embedding jobs and optional retrieval adapter; proposal evidence UI.

- [ ] Define corpus scope, retention/deletion, chunk bounds and model-change rebuild behavior.
- [ ] Enforce project/branch/revision visibility before ranking and again before constructing context.
- [ ] Treat retrieved text as untrusted source material and show evidence IDs with suggestions.

**Acceptance:** private sibling branches, superseded/deleted content and unauthorized projects cannot leak through retrieval or provider context. Citation IDs/hashes resolve to the requested snapshot. Reindex/retry is idempotent; provider/index outage falls back to bounded selected-node context. Similarity is labelled retrieval relevance, not canonical truth or an automatic contradiction verdict.

## Task 25 — Immutable interactive releases and publishing
**Depends on:** Tasks 07–08, 10, 13 and 21.

**Deliver:** A publishable immutable release from an exact saved revision, reusing the shared player/portable manifest and adding authored lore hotspots/choices with validated targets. Include keyboard navigation, captions/transcripts when speech exists, reduced motion, attribution, release preview and explicit publish/unpublish. Start with local release storage and a mock hosting adapter; hosted publication is a separate explicit action.

**Code areas:** `apps/api/app/player_manifest.py`, release storage/contracts, `components/player/`, shared composition/audio and rights checks.

- [ ] Version release/player interaction contracts; keep viewer navigation local to the viewing session.
- [ ] Validate the complete referenced asset/choice graph and rights for the intended audience/use.
- [ ] Preview a release and its disclosures before making it publicly reachable through an optional adapter.

**Acceptance:** later editor changes cannot alter an existing release; an API-blocked local release still plays supported media/interactions. Invalid/looping choice behavior is bounded and missing targets fail validation. Viewer choices never edit creator canon. Unknown distribution rights block publication; preview, publish retry and unpublish have honest status. Audio remains gesture-enabled and the legacy player/bundles keep working.

## Task 26 — Consented telemetry and audience-to-canon proposals
**Depends on:** Tasks 06, 21 and 25.

**Deliver:** Optional viewer polls and minimal playback events bound to an immutable release, explicit opt-in/consent controls, creator-visible aggregation, retention/deletion and a mock audience fixture. A creator can select a feedback snapshot to draft scoped branch proposals, then review and apply through existing rules.

**Code areas:** Release/player interaction contracts, separate feedback/telemetry tables and ingestion, proposal context/review and branch UI.

- [ ] Define collected fields, consent lifecycle, retention and aggregate thresholds before enabling ingestion.
- [ ] Bound payloads/rates, deduplicate retries and mark untrusted text as audience input.
- [ ] Display counts, coverage and uncertainty; create proposals only after a creator request.

**Acceptance:** an unconsented viewer emits no analytics, opting out stops collection, and deletion follows the documented policy. Invalid/replayed events cannot inflate polls through transport retry. Feedback remains tied to the original release/branch; proposed changes cite a snapshot and require fresh approval. Audience text cannot invoke tools or modify canon, and small samples are not presented as proven narrative performance.

## Task 27 — Community publishing connectors
**Depends on:** Tasks 09–10, 21 and 25–26.

**Deliver:** One optional official supported community/social API connector plus a deterministic mock: destination/account selection, approved release/post/poll draft, exact payload preview, explicit send, delivery receipt and reconnect/revoke. Authorized feedback import feeds 26; in-character replies are drafts requiring creator review.

**Code areas:** Provider/job interfaces, server-side connector credentials, release/feedback contracts and publishing review UI.

- [ ] Verify current platform permissions, supported endpoints and rate limits before selecting the first connector.
- [ ] Bind approval to the exact account/destination/payload/release and persist idempotency/receipt state.
- [ ] Handle uncertain send outcomes by reconciliation before retry, and sanitize imported community text.

**Acceptance:** mock tests cover authorization expiry, rate limit, timeout after remote acceptance and duplicate delivery without duplicate posts. Wrong destination/payload changes require a new review. No send occurs from generation or feedback ingestion, revoked credentials stop future calls, and external failures do not alter canon. Live send validation uses an explicitly authorized test destination; no unsolicited scraping or unattended posting.

## Task 28 — Marketplace catalog and portable asset packs
**Depends on:** Tasks 10–11, 13, 21 and 25.

**Deliver:** Creator-owned versioned asset packs, catalog listings, license/attribution manifests, previews, compatibility bounds and private/local pack exchange. Support only pack types already implemented: rigs, audio and later authored dialect data require their actual contracts. Pack ingestion stages content for review before importing stable local IDs/references.

**Code areas:** Asset/provenance ledger, contained immutable media storage, release manifest validation, catalog/membership tables and asset-library UI.

- [ ] Define a portable pack format with checksums, size/count limits, dependency resolution and explicit type versions.
- [ ] Validate distribution/commercial permissions and sanitize every asset; isolate namespaces on import.
- [ ] Add listing/delist, pack preview/import and receipt of included license evidence.

**Acceptance:** a pack round trip preserves supported editability, references and evidence. Path traversal, archive bombs, executable/unsafe SVG, unsupported versions and unknown commercial rights are rejected. Import cannot overwrite an existing creator asset; missing dependencies show a recoverable error. Delisting prevents new catalog access under the declared policy without corrupting projects that already imported a licensed version. No payment integration is implied by this task.

## Task 29 — Marketplace entitlements and commercial transactions
**Depends on:** Tasks 09–10, 21 and 28.

**Deliver:** Server-enforced pack entitlements, immutable purchase/license receipts and a sandbox payment-provider adapter with signed webhook verification, idempotent fulfillment, refund handling and an auditable royalty allocation ledger. Record seller-approved pricing, license terms and supported jurisdictions before enabling any live commercial mode; no invented automatic rights clearance or payout promises.

**Code areas:** Catalog/access policy from 28, transaction/entitlement side tables, provider/job interfaces and checkout/download UI.

- [ ] Specify purchase/refund/entitlement transitions and exact integer minor-unit accounting with deterministic rounding.
- [ ] Verify payment state server-side; bind fulfillment to the purchased pack/version/license and owner.
- [ ] Keep live checkout and payouts disabled until operational, tax/legal, payment-provider and seller requirements are actually satisfied; document unresolved release gates.

**Acceptance:** sandbox paid/failed/refunded and replayed/out-of-order webhook fixtures cannot double-charge, double-fulfill or misallocate royalties. Forged callbacks and another user's entitlement fail. Download authorization reflects the recorded license/refund policy; receipts retain the original purchased terms. Royalty shares reconcile exactly to the allocatable amount; sandbox ledger entries never masquerade as completed payouts. The local editor remains usable without marketplace/payment services.

### Explicitly separate follow-ups

Task 08's three-way comparison is still read-only. Merge/apply, reproducible FFmpeg MP4, general project/lore authoring, arbitrary-format DAW import, advanced Bezier editing, WebGPU, standalone player SDK and third-party editor plugins are not silently included in these ten later epics. Scope them separately if requested. No automatic scene repair, zero-drift promise, guaranteed CTR uplift or autonomous publishing is introduced by this board.

**Next task:** Task 09 — Durable jobs and provider execution contracts. Request that task on its own to begin implementation.

## Initial Codex prompt

> Implement Task 00 from `CODEX_TASKS.md`. Read `AGENTS.md`, `AETHER_DOM_MASTER_PLAN.md`, and `sample.cdom.json`. Scaffold a local-first pnpm monorepo with Next.js 16 TypeScript web app and Python FastAPI backend. Place the canonical versioned JSON Schema in `packages/schema`, validate the sample in both TypeScript and Python, and add a health route and a fixture GET route. Write setup commands for Windows PowerShell. Do not implement AI integration, rendering engines, user authentication, or collaborative editing yet. Keep changes reviewable. Run lint, typecheck, and tests, then report results and any blockers.
