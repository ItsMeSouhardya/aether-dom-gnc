---
name: AETHER-DOM — Afterlight comparison
description: Afterlight is preferred; compare its original and v2 with Signal before final selection.
colors:
  afterlight-bg: "#141513"
  afterlight-text: "#f1f0e9"
  afterlight-muted: "#b6b9ae"
  afterlight-line: "#373b32"
  afterlight-accent: "#d7dfc7"
  afterlight-surface: "#1c1f19"
  afterlight-model-plane: "#2d3529"
  signal-bg: "#e8e9e1"
  signal-text: "#20231d"
  signal-muted: "#595e50"
  signal-line: "#b9bdac"
  signal-accent: "#d7ee78"
  signal-surface: "#dfe2d6"
  signal-button-text: "#f2f4e8"
  signal-focus: "#4d6410"
  afterlight-button-hover: "#eff4e7"
  signal-button-hover: "#3c4530"
  studio-bg: "#161a16"
  studio-text: "#e6e8dd"
  studio-line: "#3c4437"
  studio-action-text: "#22281d"
  studio-range: "#c8d8ac"
  white: "#fff"
typography:
  afterlight-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(3.25rem, 6.7vw, 6rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  signal-display:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "clamp(4rem, 7.1vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  afterlight-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  signal-body:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  studio-file:
    fontFamily: "monospace"
    fontSize: "10px"
rounded:
  square: "0"
  studio-action: "2px"
  badge: "3px"
  afterlight-button: "4px"
  studio: "12px"
spacing:
  gutter: "clamp(22px, 5.2vw, 80px)"
  section: "clamp(72px, 9vw, 144px)"
  mobile-gutter: "24px"
  mobile-section: "76px"
components:
  afterlight-button:
    backgroundColor: "{colors.afterlight-accent}"
    textColor: "{colors.afterlight-bg}"
    rounded: "{rounded.afterlight-button}"
    padding: "18px 24px"
  afterlight-button-hover:
    backgroundColor: "{colors.afterlight-button-hover}"
  signal-button:
    backgroundColor: "{colors.signal-text}"
    textColor: "{colors.signal-button-text}"
    rounded: "{rounded.square}"
    padding: "18px 24px"
  signal-button-hover:
    backgroundColor: "{colors.signal-button-hover}"
  studio:
    backgroundColor: "{colors.studio-bg}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio}"
  signal-studio:
    backgroundColor: "{colors.studio-bg}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.square}"
---

# Design System: AETHER-DOM landing exploration

## Overview

**Status: Afterlight is the preferred aesthetic; the final version is undecided.** The user approved Afterlight's immersive style and existing sections on 11 November 2026, then requested a second version with one added Signal-inspired CDOM section. Folio is retired from the active preview. The comparison order is **Afterlight → Afterlight v2 → Signal**. The default remains the original Afterlight.

| Candidate | Contract | Page sequence |
|---|---|---|
| Afterlight | Original cinematic charcoal, sage, Manrope, full-bleed artwork. Preserve exactly. | Hero → manifesto → connected-edit demo → modules → world banner → workflow/roadmap → FAQ → closing → footer |
| Afterlight v2 | Same Afterlight page, plus one dark layered document diagram. Every other section stays identical. | Hero → manifesto → **CDOM model** → connected-edit demo → remaining original sections |
| Signal | Retained industrial reference: light surface, charcoal, acid-yellow, Space Grotesk. Preserve exactly. | Typographic hero/semantic SVG → module strip → demo → statement → modules → workflow/roadmap → FAQ → closing → footer |

Product truth lives in ../PRODUCT.md. The prototype remains isolated from the future IDE. Final selection, switcher removal, and Task 00 remain pending. See afterlight-v2.md for the precise iteration scope and motion plan. Historical Folio reference analysis and QA are archived evidence, not active design guidance.

The frontmatter owns primitive tokens. ../.impeccable/design.json schema version 2 maps the active candidates under extensions.exploration. Afterlight v2 inherits Afterlight's tokens; preferredDirection is afterlight, while selectedDirection remains null.

## Colors

Both Afterlight versions use the same background, foreground, muted, divider, accent, and surface roles. Sage fills primary actions. Signal retains its own light palette and acid accent; do not carry acid-yellow into Afterlight v2. The shared studio remains dark.

The new CDOM top plane uses #2d3529 with sage linework. Other planes use the existing charcoal ground, with sage paths and readable labels. Selection text is charcoal on sage in Afterlight and charcoal on acid in Signal. Preserve the surface-specific focus rules.

## Typography

Active fonts are self-hosted Manrope 400–800 and Space Grotesk 400–700, with font-display: swap. Both Afterlight versions use Manrope throughout. Signal uses Space Grotesk; monospace is reserved for document names, diagram data and values. The retired Instrument Serif files are historical assets and are not loaded by active CSS.

Shared H2: clamp(2.3rem, 4.1vw, 3.8rem), weight 500, line-height 1.12, tracking -0.035em. Body base is 16px; actual explanatory section copy is commonly 14–17px, with smaller annotations inside the illustrative studio. Hero display sizes are capped at 6rem, tracking no tighter than -0.04em. Afterlight's mobile hero uses clamp(3.4rem, 10vw, 5rem); Signal uses clamp(4rem, 15vw, 6rem).

The CDOM section inherits Afterlight's H2 hierarchy. Its main copy is 15px desktop / 14px mobile; legend terms are 13px and descriptions 12px. Diagram labels enlarge on mobile, while a semantic definition list repeats the relationships in readable text.

## Layout

Fluid gutters: clamp(22px, 5.2vw, 80px). Section spacing: clamp(72px, 9vw, 144px). At 1600px and above, section side padding centers a 1440px content region; the rule does not apply to every container. At 1150px navigation/gaps tighten. At 960px header CTA and studio tree hide, studio becomes flexible / 235px, and closing blocks stack. At 760px gutters become 24px, section spacing 76px, menu replaces inline navigation, and split layouts/process/FAQ stack.

Afterlight v2's added #creative-document sits immediately before #explore. It uses a .9fr / 1.1fr editorial split: heading, prose and three legend rows on the left; layered SVG and motion controls on the right. It stacks at 760px. Preserve original Afterlight hero, manifesto, demo, modules, world banner, workflow, FAQ, closing and footer byte-for-byte through the shared renderer.

The two CDOM columns align to the top, preserving equal section padding on either side of the preceding divider. The figure is right-aligned and capped at 560px. Its SVG viewBox is 0 68 660 502, keeping the model below the heading's top edge while reducing its overall scale. STAGE sits outside the middle layer at (558, 320), reached by the leader M510 290l40 40h72. These are v2-only refinements; the Signal source diagram remains unchanged.

The original hero retains its 790px minimum and right-biased artwork crop. The Afterlight world banner still uses folio-world.png; its filename does not make it a retired page asset. Review-only switcher space remains 100px desktop / 85px mobile. Keep hero notes above the floating controls. Review targets are 1440px desktop and 390px mobile, plus a 360px narrow check.

## Elevation & Depth

Depth comes from artwork, tonal fields and precise geometry. Preserve Afterlight's image overlays and existing framed studio. Shadows belong only to comparison chrome and the disclosed mobile menu. The CDOM diagram adds no glow, backdrop blur, floating cards, filters or canvas.

The new diagram's focal motion is a 7.2-second, ±7px vertical drift with phase offsets across three planes. Dashed connectors flow downward over 2.6 seconds to communicate relationships. It runs only while visible and the document is foregrounded. Pause/resume is explicit; user pause persists across visibility changes until the variant is left. Reduced-motion preference gives a static diagram and a disabled “Motion reduced” control. No meaning depends on animation.

Existing hero entrance and button feedback are retained. Reduced motion disables spatial animation/hover lift, and anchors scroll instantly. No dependencies or JS animation loop are added. Variant changes disconnect the new observer and preference/visibility listeners.

## Shapes

Afterlight primary buttons retain 4px corners; Signal buttons remain square. The shared studio is rounded in both Afterlight versions and square in Signal. The CDOM section is an open editorial surface with fine divider rules. Its geometry comes from Signal's existing three-plane SVG, restyled locally to Afterlight. The original Signal graphic and styles stay unchanged.

## Components

- **Navigation:** existing brand, four section links, explore CTA and accessible mobile disclosure; retained in both Afterlight versions.
- **CDOM model (v2 only):** one H2, explanatory prose, a native definition list for Narrative/Stage/Audio, accessible SVG title/description, caption and keyboard-operable pause/resume button. The diagram is illustrative architecture, not a working engine. Implementation: landing-prototype/cdom-section.js.
- **Connected-edit illustration:** existing 35% tension default; story-change preview sets 82%, reset restores 35%. No actual audio or canonical document changes. Keep development/illustration labels.
- **Module index and FAQ:** retain native details/summary behavior and exact existing copy.
- **Workflow/roadmap:** retain the three process steps and honest planned stages. No release, customer, pricing or performance claims.
- **Prototype comparison:** URL keys afterlight, afterlight-v2, signal. Keep that order, named buttons, pressed state, previous/next arrows, live announcements and Back/Forward support. Keyboard Left/Right excludes form controls and slider interaction. Production output hides comparison chrome; remove it only after final selection.
- **Focus:** 2px outline / 6px offset. Afterlight uses sage. Signal uses dark green on light surfaces, acid-yellow on its dark header, and sage in the dark studio. Preserve the readable skip-link/selection exceptions and independent review-control focus treatment.

## Do's and Don'ts

- Preserve the original Afterlight and Signal while comparing the single-section v2 change.
- Keep Afterlight as the preferred world, without treating that preference as final version approval.
- Keep motion bounded to the document model, user-controllable, paused offscreen/in hidden documents, and static for reduced-motion users.
- Maintain current context.md after meaningful changes. Keep the original references and earlier QA as historical evidence.
- Keep product engineering separate; the CDOM diagram does not implement the engine.
- Do not reintroduce Folio into active routes, comparison controls, or active tokens.
- Do not change other Afterlight content, spacing, typography, assets or interactions during this iteration.
