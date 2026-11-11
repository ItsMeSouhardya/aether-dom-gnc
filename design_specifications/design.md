---
name: AETHER-DOM — Afterlight v2
description: Selected main landing design: immersive charcoal, sage, Manrope and connected creative worlds.
colors:
  afterlight-bg: "#141513"
  afterlight-text: "#f1f0e9"
  afterlight-muted: "#b6b9ae"
  afterlight-line: "#373b32"
  afterlight-accent: "#d7dfc7"
  afterlight-surface: "#1c1f19"
  afterlight-model-plane: "#2d3529"
  afterlight-button-hover: "#eff4e7"
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
  afterlight-body:
    fontFamily: "Manrope, sans-serif"
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
  studio:
    backgroundColor: "{colors.studio-bg}"
    textColor: "{colors.studio-text}"
    rounded: "{rounded.studio}"
---

# Design System: AETHER-DOM — Afterlight v2

## Overview

**Status: SELECTED by the user on 11 November 2026.** Afterlight v2 is the main landing design. Further refinements may be made as requirements evolve. Original Afterlight v1 and Signal are frozen references in ../design_archive/; normal main-page work must leave them untouched. The snapshot there includes its original design record and a file-integrity manifest.

The visual direction is immersive, cinematic and calm: a monumental story-world image, charcoal surfaces, restrained sage actions, generous editorial spacing, soft geometric typography and precise explanatory graphics. Let the creative world lead, then reveal the connected document structure and creator-controlled workflow.

Active implementation: ../landing-page/. Product truth: ../PRODUCT.md. Main machine-readable design record: ../.impeccable/design.json. This is an implemented landing page, not a working creative IDE; the planned product stack and Task 00 remain separate.

Page sequence: navigation → cinematic hero → manifesto → layered CDOM model → connected-edit illustration → six-module index → world banner → workflow/roadmap → FAQ → closing invitation → footer. Comparison chrome, candidate routing and global design-switching keyboard shortcuts are removed from source and builds.

## Colors

Use the afterlight-prefixed background, foreground, muted, divider, sage accent and surface tokens together. Primary actions use sage on charcoal; selection uses the same pairing. The CDOM top plane uses #2d3529 with sage linework. The shared studio remains #161a16 with its own text, divider and range-control colors. The pale closing section reverses the foreground/ground relationship.

Image gradients serve legibility. Preserve local surface-specific action colors and focus contrast; avoid decorative glow, gradient text, or importing the archived Signal accent into the main system.

## Typography

Self-host Manrope WOFF2, weights 400–800, with font-display: swap. Main display and body both use Manrope. Monospace is confined to file names, values and diagram data. Archived fonts are independent historical resources, not active main-page fonts.

H1 uses clamp(3.25rem, 6.7vw, 6rem), weight 500, line-height 1.02 and tracking -0.04em. Shared H2 uses clamp(2.3rem, 4.1vw, 3.8rem), weight 500, line-height 1.12 and tracking -0.035em. H3 defaults to 1.2rem/1.4 at 500. Body base is 16px/1.7, with explanatory section copy commonly 14–17px and smaller annotations inside the studio. At 760px, the hero uses clamp(3.4rem, 10vw, 5rem).

CDOM main copy is 15px desktop / 14px mobile; legend terms 13px and descriptions 12px. Diagram labels enlarge on mobile, while the semantic definition list repeats their meaning in readable text. Preserve the soothing hierarchy and comfortable prose measure.

## Layout

Fluid gutters: clamp(22px, 5.2vw, 80px). Section spacing: clamp(72px, 9vw, 144px). At 1600px and above, section padding centers a 1440px content region; this does not govern every header, hero or closing container. At 1150px navigation and layout gaps tighten. At 960px the header CTA and studio tree hide, the remaining studio columns become flexible / 235px, and closing content stacks. At 760px gutters become 24px, section spacing 76px, mobile menu replaces inline navigation, and process/FAQ layouts stack.

Hero retains a 790px minimum and right-biased artwork crop. The doorway artwork in the world banner remains in use despite its historical filename folio-world.png. There is no reserved bottom space for comparison controls. Mobile hero captions use the normal 26px bottom offset.

The CDOM section sits immediately before #explore. Its .9fr / 1.1fr editorial columns align to the top. The right-aligned figure is capped at 560px; the model stays below the heading's top edge. SVG viewBox: 0 68 660 502. STAGE is outside the middle plane at (558, 320), with leader M510 290l40 40h72. ONE .CDOM is centered on the model axis using x=320 and text-anchor=middle, including when the label font grows on mobile. The columns stack at 760px. Retain balanced padding around the preceding divider.

Minimum reviewed width is 360px. Keep heading hierarchy, native reading/focus order, labels, controls and media coherent at narrow widths. Future changes should preserve this composition unless the user requests a redesign.

## Elevation & Depth

Depth comes from imagery, tonal separation, fine borders and geometric layering. The only active UI shadow is the mobile navigation's 0 12px 25px rgba(0,0,0,.2). The studio is a framed working surface; the CDOM section is open editorial space, not a floating glass card.

Hero entrance takes 1.2 seconds with cubic-bezier(.16,1,.3,1). Buttons lift 3px on hover; feedback remains small and fast. Anchors scroll instantly. CDOM planes drift ±7px over 7.2 seconds with phase offsets; dashed connections flow downward over 2.6 seconds. Motion runs only onscreen in a visible document, with explicit pause/resume. Reduced-motion users receive static visible geometry and a disabled Motion reduced control. No JS animation loop, canvas, shader, or dependency is required.

## Shapes

Primary actions use 4px corners. The studio uses 12px corners, its actions 2px, and its illustrative badge 3px. Use open rows and fine divider rules for editorial structure. Brand, icons and diagram are authored SVG; world art is generated raster imagery with provenance preserved in assets-and-sources.md. Avoid decorative card grids or new visual systems.

## Components

- **Navigation:** brand/home, four section anchors and an explore CTA. At 760px the menu button controls a disclosure using aria-expanded/aria-controls. Link selection and Escape close it; Escape inside returns focus to the button.
- **Hero:** one H1, existing concise description and working CTAs; full-bleed artwork with directional readability overlays.
- **CDOM model:** one H2, explanatory prose, Narrative/Stage/Audio definition list, accessible SVG title/description, caption and keyboard pause/resume. Implementation: landing-page/cdom-section.js. Its geometry illustrates architecture; it is not an engine simulation.
- **Connected-edit illustration:** existing 35% default; preview sets 82%, reset restores 35%. Labels, waveform, light contrast and dB respond locally. No actual audio or canonical edits occur. Preserve explicit illustrative/development language.
- **Modules and FAQ:** native details/summary controls with useful project-specific text; preserve keyboard access and disclosure feedback.
- **Workflow and closing:** three clear process steps, honest planned roadmap, creator-review language and the existing invitation. No invented pricing, customer proof, launch date or performance claims.
- **Browser surfaces:** retain themed selection, scrollbar, 2px sage focus outlines with 6px offset, underline offsets and tabular values. The dark studio focus color remains sage. There is no main-page variant selector.

## Do's and Don'ts

- Evolve the selected Afterlight v2 page in landing-page/ as user requirements change.
- Keep design_archive/ untouched unless the user explicitly requests archive modifications; its assets and code must not drift with main-page edits.
- Keep the selected document model, spacing/label refinements, local fonts and artwork, native interactions and reduced-motion behavior.
- Update current context.md at milestones and preserve source/provenance records.
- Keep creative IDE implementation separate; the landing interaction is illustrative only.
- Do not reintroduce comparison chrome, retired renderers or design-switching shortcuts into the main page.
- Do not infer that selecting the landing design authorizes implementing the whole product or publishing it externally.
