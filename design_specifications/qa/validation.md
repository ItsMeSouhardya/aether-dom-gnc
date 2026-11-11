# Validation record

Historical initial comparison (Afterlight / Folio / Signal). The active comparison has since changed to Afterlight / Afterlight v2 / Signal; see `afterlight-v2-validation.md` for the current iteration.

11 November 2026. Scope: local, provisional three-direction landing page prototype. Final visual selection and product engineering remain pending.

## Commands and delivery

- `npm run check` — exit 0 (application/server/build JavaScript syntax).
- `npm run build` — exit 0; creates `dist/` with `data-prototype="false"`.
- Local HTML and self-hosted Manrope WOFF2 — HTTP 200.
- Temporary production-mode browser at port 4174 — confirmed `data-prototype=false`, `#design-switcher.hidden=true`. Temporary browser and server closed after the check.
- Development preview at `http://localhost:4173/` retained for user comparison. No dependency installation, cloud credentials, account creation, or public deployment.
- Impeccable archive: 59 original skill/metadata files; SHA-256 verification found 0 mismatches. Official license retained separately.

## Browser checks

Inspected all three desktop and mobile heroes using requested viewport overrides of 1440×900 and 390×844. Browser JPEG captures exclude some viewport chrome; see the independent review for capture scope. The viewport override was cleared after verification.

| Check | Afterlight | Folio | Signal |
|---|---|---|---|
| One H1 | 1 | 1 | 1 |
| Main contains complete page sections | 8 | 7 | 8 |
| Broken section-anchor targets | 0 | 0 | 0 |
| Horizontal overflow at 390px | None | None | None |
| Story preview tension | 82% | 82% | 82% |
| Reset tension | 35% | 35% | 35% |

Additional browser checks:

- Mobile menu opens, follows the section link, then closes.
- Native FAQ disclosure opens and reveals content.
- URL buttons and keyboard cycle work; ArrowRight from Signal wraps to Afterlight.
- Browser Back restores the prior variant URL.
- Range ArrowRight changes 35% → 36% without switching designs.
- Signal has no horizontal overflow at a 360px spot check.
- Loaded fonts and no broken images observed.
- Production mode hides comparison controls.

`interaction-results.json` contains the per-variant measured evidence. The scene is an illustrative UI demonstration, with visualized sound and in-memory state only.

## Corrections and review

First inspection exposed an Afterlight landmark nesting error and anchor-scroll timing interference. The corrected page has all eight intended sections inside its main landmark, and instant anchors allow immediate use of the target controls. Mobile hero captions also clear the comparison bar; text is visible immediately during its short entrance.

The independent reviewer requested three bounded corrections, then scored all three **resolved** with disposition **ship** at the fix-verdict scope:

- Signal skip-link and selection contrast: dark foreground on acid accent, **12.42:1**.
- Dark-context focus: Signal header outline **12.42:1**; Signal/Folio studio outlines **12.79:1** against the studio surface. Browser computed focus styles matched the corrected colors with `:focus-visible` active.
- Mobile manifesto labels: hidden so the H2 starts the section; confirmed computed `display:none` and recaptured both pages.

See `independent-review.md` and `independent-verdict.md`. Corrections have dedicated `*-fixed.jpg` screenshots. Other JPEGs capture representative hero, demo, roadmap, and footer regions.

## Verification limits

Full-page browser capture was unsupported; visual review covers the captured regions, and remaining sections were structurally inspected in source. This is not a formal assistive-technology audit or a production-product certification. No domain test suite was added because there is no domain implementation in this throwaway visual prototype. The future engine/API tests belong to Task 00 and subsequent tasks.
