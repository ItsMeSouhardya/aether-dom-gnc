# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The pnpm workspace uses Next.js 16 / TypeScript in `apps/web`, FastAPI in `apps/api`, and shared versioned JSON Schemas in `packages/schema`. The studio has an explorer, navigator, selectable layout blockout, transform/pose editing, timeline placeholder, evidence-linked diagnostics and dependency impact. SQLAlchemy/SQLite snapshots, Alembic migrations, revision-checked commands and persistent undo/redo own canonical edits. Task 03 adds pure graph/rule analysis and explicit recovery events. Zustand holds selection separately from canon; drafts remain temporary. The original seed overview remains at `/document`. The selected landing stays in `landing-page/` using buildless HTML/CSS/JavaScript. The user selected Afterlight v2 on 11 November 2026. Product and marketing surfaces stay separate.

## Users

Solo creators and teams of two to five making motion comics, animatics, and interactive episodic stories.

## Product Purpose

Connect narrative canon, editable scene composition, timeline, sound, and publishing formats through one versioned Creative Document Object Model (`.cdom`). A story change should have inspectable, reversible effects across related production elements.

## Positioning

Semantic dependency tracking, continuity-aware editing, and explainable cross-modal updates. Creator control is central. AI proposes scoped changes; the creator reviews them.

## Operating Context

Local-first creative desktop workflow, seeded with the Neon Shogun scenario: Kael, Vance, an injured arm, a betrayal, linked tension and audio, branching outcomes, and aspect-ratio overrides.

## Capabilities and Constraints

The local API seeds Neon Shogun once and persists snapshots/history in SQLite. Human commands edit transforms/poses or explicitly record recovery events against an expected revision. Undo/redo survives refresh and API restart; stale or uncertain saves require reload. The fixture reference stays immutable. TypeScript and Python share structural contracts; pure rules report injury/pose conflicts, timing ambiguity, missing references/files and invalid bindings with evidence. Indexed graph traversal reports affected dependents and cycle-blocked evaluation; analysis remains derived and never rewrites authored values. A clearly labeled unsaved text tool checks character-specific forbidden terms because this document version has no attributed dialogue field. The stage remains a layout blockout and timeline is a placeholder. Full rendering/playback, complete Lore authoring, AI and the remaining planned modules are future work. UI/derived state and unapproved AI proposals never directly modify canon. Installed seeded fixtures load without cloud keys.

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
