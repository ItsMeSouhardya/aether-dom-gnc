# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Task 00 implements a pnpm workspace with Next.js 16 / TypeScript in `apps/web`, FastAPI in `apps/api`, and a shared versioned JSON Schema in `packages/schema`. The web app is a read-only fixture overview, not the IDE shell. The selected landing page remains in `landing-page/` using buildless HTML/CSS/JavaScript and a Node 22 local server. The user chose direct browser building on 11 November 2026 and selected Afterlight v2. Product and marketing surfaces stay separate.

## Users

Solo creators and teams of two to five making motion comics, animatics, and interactive episodic stories.

## Product Purpose

Connect narrative canon, editable scene composition, timeline, sound, and publishing formats through one versioned Creative Document Object Model (`.cdom`). A story change should have inspectable, reversible effects across related production elements.

## Positioning

Semantic dependency tracking, continuity-aware editing, and explainable cross-modal updates. Creator control is central. AI proposes scoped changes; the creator reviews them.

## Operating Context

Local-first creative desktop workflow, seeded with the Neon Shogun scenario: Kael, Vance, an injured arm, a betrayal, linked tension and audio, branching outcomes, and aspect-ratio overrides.

## Capabilities and Constraints

The local scaffold serves the supplied Neon Shogun document through read-only endpoints, with structural validation in TypeScript and Python. The landing page and its illustrative interactions exist. Editing, rendering, playback and the six planned modules (Core, Lore, Stage, Audio, Director, Publish) remain future work. Canonical changes must go through validated typed commands. UI/derived state and unapproved AI proposals never directly modify canon. Installed seeded fixtures load without cloud keys; referenced media is metadata only at this phase. Follow the starter kit for engineering scope and deferred functionality.

## Brand Commitments

AETHER-DOM. Premium, modern, soothing typography. The user supplied ten references in `design_inspirations/` and requested three distinct landing page versions with an in-page switcher before choosing the final direction.

On 11 November 2026, the user selected **Afterlight v2 as the main design**, including the layered `.cdom` section and subsequent spacing/label refinements. Comparison controls are removed. Original Afterlight v1 and Signal are frozen in `design_archive/` as self-contained references; main-page changes must not modify them. Further refinements to the selected main page remain welcome as requirements evolve.

## Evidence on Hand

`aether_dom_codex_kit/AETHER_DOM_MASTER_PLAN.md`, `CODEX_TASKS.md`, schema and sample fixture; `initial_first_plan_provided/aether_dom_plan.md` and `5.1.png`; planning conversation 6af337a3-3148-83ec-be6c-37ac69e4be74. No customers, testimonials, measured performance, pricing, release date, live IDE, or signup service are established. Do not invent them.

## Product Principles

- Creator-owned canon and explicit review.
- Shared semantic structure across media.
- Inspectable and reversible edits.
- Local deterministic core before optional AI.
- Preserve source editability and asset provenance honestly.
