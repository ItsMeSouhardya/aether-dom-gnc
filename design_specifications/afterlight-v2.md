# Afterlight v2 — connected document section

Historical iteration record. Afterlight v2 was subsequently selected as the main page on 11 November 2026. Current authority: design.md; active code: ../landing-page/.

11 November 2026. User-directed iteration: Afterlight is the preferred aesthetic. Final version selection is pending. Comparison order: original Afterlight, Afterlight v2, Signal. Folio is removed from the active preview.

## Scope

Preserve the original Afterlight and Signal. Derive v2 from the original Afterlight markup, inserting one dedicated `.cdom` section immediately before `#explore` (“Change the story. Feel the ripple.”). Every other section, copy block, asset, control, and layout remains identical.

## Visual and motion plan

- Focal moment: three semantic planes connect narrative, stage, and audio in Afterlight's charcoal/sage world. Use the existing Signal diagram geometry as the starting point, with dark outlined planes rather than Signal's acid-filled plane.
- Continuity: slow, small vertical offsets give each layer separation; a directional dashed flow connects the stack. No page-wide scroll choreography.
- Feedback: an explicit keyboard-accessible pause/resume control acknowledges the user's motion preference.
- Budget: CSS transforms and a bounded SVG stroke-dashoffset effect in this one diagram; no dependency, canvas, WebGL, filters, or JS animation loop. Pause when offscreen or the document is hidden. Disconnect observers/listeners when switching designs.
- Accessibility: reduced-motion users receive a static, fully connected diagram and explanatory text; no content depends on movement. Preserve native focus visibility, contrast, and legible mobile copy.

The figure is illustrative architecture, not an engine simulation or a new product capability. Existing illustration/source provenance remains valid. The warm doorway asset stays because the original Afterlight world banner uses it, independent of the retired Folio page.

## Screenshot-directed refinements

The user requested tighter spacing above the heading, a smaller model that stays below the heading's top edge, and an external STAGE label. Both columns now align to the top rather than vertically centering the copy beside the taller figure. The existing section padding is retained, balancing the gap above and below the preceding divider. The figure has a 560px maximum width; the locally adapted viewBox is 0 68 660 502. STAGE moves to (558, 320) with an elbow leader from the middle layer's right vertex. Original Afterlight/Signal, all other page styles/content, and the motion controller remain untouched.
