# Selected-design promotion validation

11 November 2026. Afterlight v2 selected as main; original Afterlight v1 and Signal archived.

- Promoted page markup exactly matches the selected v2 render before removing review chrome.
- Main application has no alternative renderers, design controls, live comparison announcement or Left/Right variant shortcuts. Old variant query parameters normalize to the selected page.
- Main source is landing-page/. Main server serves only it; build emits a clean dist/ and excludes design_archive/.
- Frozen archive snapshots are self-contained. Each page, stylesheet, script, font and artwork returned HTTP 200 in temporary server checks; those viewers were then stopped.
- SHA-256 validation found zero changes across all 37 frozen files after main-page work and reference serving.
- npm run check and npm run build both exited 0.
- Actual desktop/mobile browser checks confirmed selected root page, no switcher, zero review-only body padding, no overflow, retained CDOM model, working story preview at 82%, and mobile menu behavior.
- Old ?variant=signal link resolves to the main Afterlight v2 page and cleans its parameter. ArrowRight retains the main design.

Evidence: selection-preservation.json, archive-http-checks.json, selected-main-desktop.jpg, and design_archive/archive-manifest.json. Prior QA reports are historical; no product-engine implementation or formal accessibility certification is implied.
