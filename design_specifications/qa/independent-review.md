disposition: fix

Inputs: code-first comparison; no approved comp, measured reproduction, or QUALITY BAR card supplied. Those are not treated as requirements for these three provisional prototypes. Original-request scope and browser interaction checks were supplied by the parent. Independent file/image review only; no browser run or product-code edits.

## persistence

Pass. `PRODUCT.md`, `design_specifications/design.md`, and `design_specifications/reference-analysis.md` preserve product truth, the three candidate contracts, reference interpretation, and the explicit absence of a final choice. The buildless prototype remains separate from the planned IDE stack.

Evidence is valid for the stated scope: all six named desktop/mobile hero JPEGs show their correct direction and document top, with no blank or malformed regions. Desktop images are 1432×895; mobile images are 382×826. The two demo captures and the additional Signal mobile roadmap/footer captures show the regions their names claim. Compression limits fine typography judgments, and none is treated as a full-page capture. The current files were inspected after the parent reported settling and recapturing the six heroes. `interaction-results.json` records one H1, valid anchors, preview 82%, reset 35%, and no horizontal overflow for all three variants at the reported 390px viewport. The parent additionally reports working menu/FAQ, history and arrow-key switching, slider-key isolation, no overflow at 360px, and passing check/build commands; these are supplied evidence, not independently rerun tests.

## fidelity

| Element | Assessment | Evidence |
|---|---|---|
| TYPE | Match across all three | Afterlight uses restrained Manrope; Folio uses literary Instrument Serif with italic emphasis; Signal uses assertive Space Grotesk. The captured heroes have distinct silhouettes rather than a color-only reskin. |
| MATERIAL | Match | Afterlight visibly ships cinematic raster landscape; Folio visibly ships warm stone/glass artwork; Signal uses an authored geometric semantic diagram appropriate to the system direction. No imitation material substitutes for the focal assets. |
| GROUND | Match | Charcoal Afterlight, warm paper Folio, and cooler industrial Signal agree with their named contract palettes. No approved comp exists for pixel reproduction claims. |
| First viewport and reading order | Match | Full-bleed immersive Afterlight; split editorial Folio; typographic/diagram Signal. Mobile stacks are appropriate adaptations explicitly anticipated by the responsive contract. The hero captions clear the comparison control. |
| Structural distinction | Match in source | Afterlight leads with manifesto then demo; Folio places the editorial module spread before the demo; Signal puts the demo immediately after the hero and module strip. Shared FAQ/workflow content supports meaningful comparison without adding product scope. |
| Product truth | Match | Source and captured demos label the interaction illustrative. FAQ, roadmap, footer, and module note disclose development status. No invented customer, pricing, launch, performance, or signup claims. |
| Accessible comparison | Contradicted in limited states | Named buttons, pressed state, live announcements, URL/history behavior, native disclosures, labelled range, and reduced-motion rules are present. Surface-specific contrast defects remain in the keyboard states listed below. |
| Mobile manifesto hierarchy | Contradicted against the craft floor | The `.side-note` labels become small text immediately above the manifesto H2 on mobile; the floor explicitly refuses eyebrows. This assessment comes from the source, not an uncaptured lower-page visual claim. |

## ceiling

Reached for a reviewable three-direction prototype in the captured regions. Each direction commits to a different subject, lettering voice, ground, and entry sequence while remaining consistent with the supplied reference analysis: sparse editorial hierarchy, strong material subject, precise annotations, neutral palettes, controlled accent. No material visual-world rebuild is indicated. Lower-page visual acceptance is limited to the two demo views and Signal roadmap/footer views; other sections were assessed structurally in code. This is not full-page, assistive-technology, or production-product certification.

## material_fixes

1. **P2 — Signal keyboard skip link is unreadable.** `landing-prototype/styles.css:8`, `.skip-link` with `:root[data-variant=signal]`: the accent background `#d7ee78` receives `--bg` text `#e8e9e1`, only **1.05:1**. Give the Signal skip link a dark foreground such as its `--fg`; verify the revealed keyboard state. The same foreground pairing occurs in `::selection` and should be corrected in that surface override as well. This fails the contrast floor and accessible-navigation promise.
2. **P2 — Variant focus overrides lose contrast on dark surfaces.** `landing-prototype/styles.css:8`, `:root[data-variant=signal] :focus-visible` and `:root[data-variant=folio] :focus-visible`, outrank the later `.studio-demo :focus-visible` rule at line 12. Signal's outline is **2.38:1** on its dark header and **2.64:1** on the studio; Folio's outline is **2.52:1** on the studio. Scope the light-surface outlines and restore a light contrasting outline for dark headers/studios with sufficient specificity. Verify keyboard focus on header links and demo buttons/range in both directions; keep the existing readable light-surface focus treatment.
3. **P2 — Remove mobile manifesto eyebrows.** `landing-prototype/app.js:65` and `:69`, `.manifesto .side-note` and `.folio-statement .side-note`; `styles.css:26` stacks these small labels immediately above their headings. Remove the redundant labels or integrate their useful wording into normal prose. Preserve the H2 as the section entry point, as required by the craft floor's explicit eyebrow ban.

## keep

Keep the three distinct hero compositions, local fonts/assets, restrained reference-led palettes, clear concept-art/demo labels, explicit planned status, creator-review language, and working comparison controls. Acceptance after the listed fixes covers this local design comparison and its supplied viewport/interaction evidence; it does not select a final direction, approve deployment, or authorize product implementation. No further speculative polish or product scope is required.
