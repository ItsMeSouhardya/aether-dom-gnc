# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Task 00 implements a pnpm workspace with Next.js 16 / TypeScript in `apps/web`, FastAPI in `apps/api`, and a shared versioned JSON Schema in `packages/schema`. Task 01 adds the studio shell: explorer, layer navigator, selectable layout blockout, read-only inspector, timeline placeholder and diagnostics tray. Zustand holds UI selection separately from canon. The original overview remains at `/document`. The selected landing page remains in `landing-page/` using buildless HTML/CSS/JavaScript and a Node 22 local server. The user chose direct browser building on 11 November 2026 and selected Afterlight v2. Product and marketing surfaces stay separate.

## Users

Solo creators and teams of two to five making motion comics, animatics, and interactive episodic stories.

## Product Purpose

Connect narrative canon, editable scene composition, timeline, sound, and publishing formats through one versioned Creative Document Object Model (`.cdom`). A story change should have inspectable, reversible effects across related production elements.

## Positioning

Semantic dependency tracking, continuity-aware editing, and explainable cross-modal updates. Creator control is central. AI proposes scoped changes; the creator reviews them.

## Operating Context

Local-first creative desktop workflow, seeded with the Neon Shogun scenario: Kael, Vance, an injured arm, a betrayal, linked tension and audio, branching outcomes, and aspect-ratio overrides.

## Capabilities and Constraints

The local scaffold serves the supplied Neon Shogun document through read-only endpoints, with structural validation in TypeScript and Python. The studio selects scenes, shots and layers and inspects authored transforms without mutating canon. Its blockout uses labeled layout geometry because referenced source media is absent. Timeline/diagnostics surfaces disclose their placeholder status. Editing, persistence, full rendering, linter and playback remain future work, along with the complete six planned modules (Core, Lore, Stage, Audio, Director, Publish). Canonical changes must go through validated typed commands. UI/derived state and unapproved AI proposals never directly modify canon. Installed seeded fixtures load without cloud keys. Follow the starter kit for engineering scope and deferred functionality.

## Brand Commitments

AETHER-DOM. Premium, modern, soothing typography. The user supplied ten references in `design_inspirations/` and requested three distinct landing page versions with an in-page switcher before choosing the final direction.

On 11 November 2026, the user selected **Afterlight v2 as the main design**, including the layered `.cdom` section and subsequent spacing/label refinements. Comparison controls are removed. Original Afterlight v1 and Signal are frozen in `design_archive/` as self-contained references; main-page changes must not modify them. Further refinements to the selected main page remain welcome as requirements evolve.

## Evidence on Hand

`aether_dom_codex_kit/AETHER_DOM_MASTER_PLAN.md`, `CODEX_TASKS.md`, schema and sample fixture; `initial_first_plan_provided/aether_dom_plan.md` and `5.1.png`; planning conversation 6af337a3-3148-83ec-be6c-37ac69e4be74. Tasks 00/01 have local verification evidence in `docs/tasks/`; the studio currently supports selection and inspection. No customers, testimonials, measured performance, pricing, release date, complete editable IDE, or signup service are established. Do not invent them.

## Product Principles

- Creator-owned canon and explicit review.
- Shared semantic structure across media.
- Inspectable and reversible edits.
- Local deterministic core before optional AI.
- Preserve source editability and asset provenance honestly.
