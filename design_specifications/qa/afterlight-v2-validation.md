# Afterlight v2 validation

11 November 2026. Scope: replace retired Folio with Afterlight v2, insert one CDOM section before the story-change demo, preserve original Afterlight and Signal. Final version selection remains pending.

## Preservation

One-off rendering and CSS comparison against the previous static build, before rebuilding:

- Original Afterlight HTML: identical.
- Signal HTML: identical.
- Afterlight v2 after removing its added section and v2 class: identical to original Afterlight.
- All 374 retained baseline CSS rules: identical declarations; zero missing or changed rules.
- Retired Folio renderer, routing, CSS and font faces removed. Historical font files/reference/QA assets are retained. The doorway artwork remains in use by the unchanged Afterlight banner.

Exact results: `afterlight-v2-preservation.json`.

Final `npm run check` and `npm run build` both exited 0. The static build includes the new module and keeps the comparison controls hidden in production output.

## Browser checks

- Actual switcher order: original Afterlight, Afterlight v2, Signal.
- Exactly one new section in v2, with `#explore` as its immediate following sibling.
- Original Afterlight and Signal each have zero new CDOM sections.
- Desktop at 1440px, mobile at 390px, narrow at 360px: no horizontal overflow. The longer version label fits the mobile comparison control.
- Actual diagram motion runs while onscreen, pauses with the control, resumes using Space, and pauses when scrolled offscreen.
- Three-plane drawing and definition list remain readable as a stacked mobile section.
- Existing story-change demonstration still reaches 82% in v2.

Screenshots: `afterlight-v2-cdom-desktop.jpg`, `afterlight-v2-cdom-mobile-copy.jpg`, `afterlight-v2-cdom-mobile-diagram.jpg`.

## Motion logic and limits

A one-off controller harness exercised offscreen → running → manual pause → hidden document pause → reduced motion, with the expected states. Reduced motion disables the control and preserves a static diagram. Cleanup disconnected the observer and removed all three listeners. This is controller-level evidence, not browser emulation of the operating system's reduced-motion setting. The actual browser confirmed keyboard pause/resume and offscreen behavior.

This adds illustrative SVG motion only; it does not implement the CDOM engine, real audio, or canon mutation. No dependency was added.
