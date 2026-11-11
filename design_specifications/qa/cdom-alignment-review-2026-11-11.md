# CDOM section alignment inspection

11 November 2026. Target: landing-page/cdom-section.js and its scoped rules in landing-page/styles.css; live surface http://localhost:4173/#creative-document.

Method: independent Impeccable layout assessment by cdom_layout_review, followed by synthesis with a separate live DOM geometry assessment. This is the user's narrow alignment inspection, not a full-site UX critique. UI source and frozen archives were not modified.

## Verdict

The section is well aligned structurally and visually. No layout correction is required. One P3 precision-polish finding remains: the ONE .CDOM label is slightly left of the diagram's central axis on desktop.

## Verified alignment

- Heading, prose, definition list and closing note share an exact left edge; measured spread is 0px at all checked widths.
- All three legend terms share an exact left edge; all descriptions share another exact left edge. Both spreads are 0px.
- The model begins below the heading as explicitly requested. At 1536px it was approximately 23px lower during the sampled motion phase; its small drift is intentional.
- Preceding/below-divider gaps balance: 144.8px / 144px at 1920px, and 139px / 138.2px at 1536px. The subpixel difference corresponds to the divider/border.
- The caption and motion-control container align exactly with the figure's left edge. Their controls share the right edge. At the screenshot-like desktop width, the caption divider is within 2.3px of the bottom legend rule; independent content flow at tablet widths is intentional, not a shared-row requirement.
- STAGE is outside the middle layer with about 41px clearance on desktop and 24px at 390px. Its text remains inside the SVG canvas.
- No horizontal overflow at 1920, 1536, 1024, 768, 760 or 390px. Two columns remain through 768px and stack at 760px. The capped figure retains its deliberate right alignment at intermediate stacked widths.
- The independent screenshot assessment agreed that the wider right column, generous central gap and supporting caption/control group are deliberate editorial balance, not misplaced content.

## P3: center the diagram footer label on its axis

Selector: .cdom-graph .graph-labels text:last-child.

The inherited SVG text uses x=264 with the default start anchor. The model axis is x=320. At the desktop label size of 14px, its visible center is x=301.81, placing it 15.43 CSS pixels left of the axis. At the mobile label size of 20px, the offset is only 1.68px left, so a hardcoded pixel translation would be brittle.

Recommended isolated refinement: use x=320 and text-anchor=middle on this label in the main CDOM section. Preserve all other geometry, spacing and motion. This was not applied because the user requested inspection.

## Evidence and limitations

- User-supplied screenshot inspected independently alongside selected product/design context.
- cdom-alignment-review-metrics.json contains measured layouts and label coordinates.
- cdom-alignment-review-desktop.jpg records the current live section.
- The bundled detector was actually attempted with detect --json --scope layout landing-page/cdom-section.js. It could not run because Impeccable engine 0.1.5 is not installed and the cache directory is not writable. No automated detector pass or live overlay is claimed.
- Read-only browser geometry used client rectangles and the SVG viewBox; getBBox was not exposed by the browser's read-only surface.
- The temporary review tab was closed and its viewport override reset. The existing project development server was left running. No builds/tests were rerun because no application code changed.

Questions skipped: this was an alignment-only inspection; no new product or design decision was required.

## Subsequent resolution

The user authorized the isolated centering fix. The main CDOM footer label now uses x=320 with text-anchor=middle. Live visual-center offsets measured 0.035 CSS pixels at 1536px and 0.259px at 390px. Syntax and static build checks passed. Other geometry, layout, motion and archived designs were left unchanged.
