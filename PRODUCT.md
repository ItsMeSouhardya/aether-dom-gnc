# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The pnpm workspace uses Next.js16/TypeScript, FastAPI and shared versioned JSON Schemas. The studio includes a Three.js/SVG stage, transform/pose/source editing, camera/keyframe playback, evidence-linked diagnostics and a native Web Audio mixer. SQLite snapshots, revision-checked commands and persistent undo/redo own canonical edits. Task06 adds bounded offline mock proposals, selected-node context, explicit scope/operation permissions and reviewable field diffs. Approval commits one reversible command; generation and rejection do not change canon. Selection, drafts and derived audio remain separate from canon. The seed overview remains at `/document`. The selected Afterlight v2 landing stays separate in `landing-page/` with buildless HTML/CSS/JavaScript.

## Users

Solo creators and teams of two to five making motion comics, animatics, and interactive episodic stories.

## Product Purpose

Connect narrative canon, editable scene composition, timeline, sound, and publishing formats through one versioned Creative Document Object Model (`.cdom`). A story change should have inspectable, reversible effects across related production elements.

## Positioning

Semantic dependency tracking, continuity-aware editing, and explainable cross-modal updates. Creator control is central. AI proposes scoped changes; the creator reviews them.

## Operating Context

Local-first creative desktop workflow, seeded with the Neon Shogun scenario: Kael, Vance, an injured arm, a betrayal, linked tension and audio, branching outcomes, and aspect-ratio overrides.

## Capabilities and Constraints

The local API seeds Neon Shogun once and persists snapshots/history. Human commands edit transforms, poses, recovery, SVG sources, camera, keyframes and shot tension against an expected revision. Undo/redo survives refresh/restart; stale or uncertain saves require reload. Original schemas/fixture remain preserved and versions0.1–0.3 stay readable. Pure rules report continuity and reference issues; indexed dependencies remain derived. The unsaved dialect tool has no attributed dialogue canon. Rendering uses a single compositor with native fallback. Audio requires a creator gesture; local gain/pan evaluation follows supported bindings and preview time without writing samples into canon. The proposal provider interface currently uses an offline deterministic mock; request text stays inert, and approved operations must fit the selected scope at the captured revision. Persisted review decisions remain separate from document snapshots. Arbitrary audio import, complete Lore authoring, advanced rigs, real AI providers and publication remain future work. Installed seeded fixtures need no cloud keys.

Task07 adds authored9:16 overrides with explicit save/undo, subject-safe guides and a fit draft, plus a separate read-only player using the shared composition/renderer/audio runtime. A revision-bound portable JSON bundle embeds sanitized local SVG/PCM media outside canonical document fields; the player can reopen it with the API unavailable. Unknown-rights or missing/unsupported media blocks export. No public publishing, standalone HTML application, video export or general layout optimizer is delivered. Landscape canon and existing document schemas stay preserved.

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
