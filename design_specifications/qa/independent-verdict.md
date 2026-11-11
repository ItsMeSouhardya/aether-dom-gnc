## verdict

All six new named captures are present and valid for their stated regions. This is a scored pass on the three findings in `independent-review.md`, using the captures, final scoped CSS rules, and the parent's reported computed keyboard-state evidence; no browser was run by the reviewer.

1. **Resolved — Signal skip-link contrast.** `signal-skip-link-fixed.jpg` visibly shows dark readable text and an inner dark focus outline on the lime skip link. The final Signal `.skip-link` and `::selection` overrides use `#20231d` on `#d7ee78`; the text contrast is 12.42:1. The parent reports that the focused link is visible with those computed colors.
2. **Resolved — Dark-surface focus contrast.** `signal-header-focus-fixed.jpg` shows a clear lime focus outline around the header link. `signal-studio-focus-fixed.jpg` and `folio-studio-focus-fixed.jpg` show clear light focus outlines around the tension input. The scoped header/studio selectors now outrank the variant-wide focus rules; the parent reports `:focus-visible` true with the intended computed colors. The header contrast is 12.42:1 and the studio outline contrast is 12.79:1 against its dark surface.
3. **Resolved — Mobile manifesto eyebrows.** `afterlight-mobile-manifesto-fixed.jpg` and `folio-mobile-manifesto-fixed.jpg` show the manifesto headings as the section entry points, with no small label above either. The final mobile rule hides the two direct-child `.side-note` elements; the parent reports computed `display:none` at 390px. The heading/prose hierarchy remains intact.

No regressions introduced by these scoped fixes are visible in the supplied recaptures.

## remaining

Clear. Ship covers the scored fixes to the local three-direction design comparison, not the whole surface or a production product. No final design direction is selected. The acceptance limits recorded in `independent-review.md` remain in force.

disposition: ship
