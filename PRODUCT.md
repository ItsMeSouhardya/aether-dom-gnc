# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The pnpm workspace uses Next.js16/TypeScript, FastAPI and shared versioned JSON Schemas. The studio includes a Three.js/SVG stage, transform/pose/source editing, rigid articulated bone posing, camera/keyframe playback, evidence-linked diagnostics and a native Web Audio mixer. SQLite snapshots, revision-checked commands and persistent undo/redo own canonical edits. Task06 adds bounded offline mock proposals, selected-node context, explicit scope/operation permissions and reviewable field diffs. Approval commits one reversible command; generation and rejection do not change canon. Selection, drafts and derived audio remain separate from canon. The seed overview remains at `/document`. The selected Afterlight v2 landing stays separate in `landing-page/` with buildless HTML/CSS/JavaScript.

## Users

Solo creators and teams of two to five making motion comics, animatics, and interactive episodic stories.

## Product Purpose

Connect narrative canon, editable scene composition, timeline, sound, and publishing formats through one versioned Creative Document Object Model (`.cdom`). A story change should have inspectable, reversible effects across related production elements.

## Positioning

Semantic dependency tracking, continuity-aware editing, and explainable cross-modal updates. Creator control is central. AI proposes scoped changes; the creator reviews them.

## Operating Context

Local-first creative desktop workflow, seeded with the Neon Shogun scenario: Kael, Vance, an injured arm, a betrayal, linked tension and audio, branching outcomes, and aspect-ratio overrides.

## Capabilities and Constraints

The local API seeds Neon Shogun once and persists snapshots/history. Human commands edit transforms, poses, recovery, SVG sources, camera, keyframes and shot tension against an expected revision. Undo/redo survives refresh/restart; stale or uncertain saves require reload. Original schemas/fixture remain preserved and versions0.1–0.5 stay readable. Pure rules report continuity and reference issues; indexed dependencies remain derived. The unsaved dialect tool has no attributed dialogue canon. Rendering uses a single compositor with native fallback. Audio requires a creator gesture; local gain/pan evaluation follows supported bindings and preview time without writing samples into canon. The proposal provider interface currently uses an offline deterministic mock; request text stays inert, and approved operations must fit the selected scope at the captured revision. Persisted review decisions remain separate from document snapshots. Arbitrary audio import, complete Lore authoring, IK/skinning, real AI providers and publication remain future work. Installed seeded fixtures need no cloud keys.

Task07 adds authored9:16 overrides with explicit save/undo, subject-safe guides and a fit draft, plus a separate read-only player using the shared composition/renderer/audio runtime. A revision-bound portable JSON bundle embeds sanitized local SVG/PCM media outside canonical document fields; the player can reopen it with the API unavailable. Unknown-rights or missing/unsupported media blocks export. No public publishing, standalone HTML application, video export or general layout optimizer is delivered. Landscape canon and existing document schemas stay preserved.

Task08 adds human-created isolated forks, URL-based branch switching, read-only three-way authored-field comparison against actual historical common bases, and bounded browser WebM previews from saved/local manifests. Fork lineage/audit is durable; source histories remain unchanged. Conflicts are shown for review without a merge/apply action. MP4, automatic merging, collaborative editing and public distribution are outside this slice.

Task09 adds durable zero-cost local mock proposal jobs, a separate worker and a Jobs inspector. SQLite side-table leases fence late workers; cancellation, bounded retries and expired-lease recovery preserve the captured project/branch/revision and selected-node input hash. Completion stages a reviewable proposal and immutable initial artifact digest. The current review decision remains visible after approval/rejection. Job lifecycle never edits canon; only the existing human approval command can apply a fresh scoped result. The worker must be started explicitly; paid providers and generated media remain future tasks.

Task10 adds revision-owned asset evidence: immutable original/current hashes,
creator/source/license/attribution, recorded use permissions, provider/model lineage
and applicable voice/likeness consent. Human evidence corrections are reviewed,
audited and undoable. A ledger's restrictions govern private preview as well as
public/commercial use; legacy known-rights private preview remains available only
without a ledger. Missing, stale or incompatible evidence blocks the requested
export and exposes recovery guidance. Portable bundles retain exact evidence and
recompute policy offline. Evidence records express the creator's assertions;
permission checks do not establish ownership, legal clearance or publication.
Text evidence is included with the full project and media in portable JSON.
WebM carries no embedded ledger; its matching source/evidence JSON can be retained
separately and privately. Marketplace transactions and public publishing remain
later tasks.

Task11 adds a separate original Kael-inspired geometric SVG character with four bones and four attachment slots: body, head and independently posed arms. Creators select a bone/attachment, preview angle and explicit action, review before/after, then save against the captured revision or cancel. Bone frames use the shared playback clock; Layout uses the base pose, while Animate/player/export use linear angle interpolation. Explicit `lift` semantics reuse evidence-linked injury/recovery checks; angles alone imply no action. Contradictions remain soft diagnostics.

Document0.5 and command0.8 extend existing versioned contracts without read/startup upgrades. Rigs are bounded to 32 bones, 32 attachment slots and 128 total bone frames per rig. Saved motion carries through both aspects, native SVG fallback, offline portable reopen and per-frame SVG evaluation for WebM. The fixture creates a new layer only on an explicit action; original drawings remain preserved. Its parts share one source and rights record. Known original rights permit private preview without a ledger; broader use requires explicit evidence review. No IK, deformation, new renderer or runtime dependency is introduced.

## Brand Commitments

AETHER-DOM. Premium, modern, soothing typography. The user supplied ten references in `design_inspirations/` and requested three distinct landing page versions with an in-page switcher before choosing the final direction.

On 11 November 2026, the user selected **Afterlight v2 as the main design**, including the layered `.cdom` section and subsequent spacing/label refinements. Comparison controls are removed. Original Afterlight v1 and Signal are frozen in `design_archive/` as self-contained references; main-page changes must not modify them. Further refinements to the selected main page remain welcome as requirements evolve.

## Evidence on Hand

`aether_dom_codex_kit/AETHER_DOM_MASTER_PLAN.md`, `CODEX_TASKS.md`, schema and sample fixture; `initial_first_plan_provided/aether_dom_plan.md` and `5.1.png`; planning conversation 6af337a3-3148-83ec-be6c-37ac69e4be74. Task verification evidence lives in `docs/tasks/`; the studio supports selection, transform editing, local save and undo/redo. No customers, testimonials, measured performance, pricing, release date, complete editable IDE, or signup service are established. Do not invent them.

## Product Principles

- Creator-owned canon and explicit review.
- Shared semantic structure across media.
- Inspectable and reversible edits.
- Local deterministic core before optional AI.
- Preserve source editability and asset provenance honestly.
