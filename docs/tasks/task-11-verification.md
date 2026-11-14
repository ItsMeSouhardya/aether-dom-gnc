# Task 11 — Articulated posing and canon-aware motion

Completed 15 November 2026; implementation began 14 November
(Asia/Calcutta). Branch `feat/task-11-articulated-rigs`, based on user Task10 commit
`2874c26af6653be776dc5a00f7fff4ba01c7582f`. No staging, commit or push; the user
owns integration. Task12 remains a separate request.

Scope: [design](../superpowers/specs/2026-11-14-task-11-articulated-rigs-design.md)
and [plan](../superpowers/plans/2026-11-14-task-11-articulated-rigs.md), implementing
Task11 in `aether_dom_codex_kit/TASKS PT2.md`. User selected a separate Kael-inspired
original rig. Original Kael/Vance artwork is preserved.

## Delivered behavior

- Optional layer-owned rigid SVG rig in document 0.5, human commands in 0.8; older
  formats remain readable without a startup upgrade. One root, stable bone/slot/
  frame IDs, 32 bones/32 slots and 128 total frames per rig. Pure shared TS/Python
  forward kinematics evaluates copied SVG transforms; runtime matrices stay out
  of canon. No IK, skinning, new dependency or database migration.
- Original four-bone/four-slot geometric fixture with separate provenance. The
  fixed read-only template endpoint supplies inert source; Add original rig is
  explicit, uses fresh canonical IDs and normal sanitized SVG storage. Parts share
  one source asset and its existing rights/evidence/export decisions.
- Select bone or attachment, preview a local angle/action, review before/after and
  Save or Cancel. Reviewed frame add/update/delete and seek use the existing clock.
  Captured revision/target survives stale, uncertain and removed-target recovery;
  fields freeze during Save. Selection resets legacy editors independently, so
  their captured fields cannot save to another layer.
- Exact command inverses/replay/restart/fork and descendant-only invalidation.
  Explicit `lift` plus arm semantics uses injury/recovery evidence as a soft
  diagnostic; angles imply no action. Unknown semantics warn about limited coverage.
- Native fallback in rig scenes and per-frame WebM SVG evaluation share the saved
  pose/time with studio, player and portable reopen. Flat GPU behavior is retained.
  Portable files keep original SVG sources and canonical rig data separately.
  Existing audio/evidence edits preserve document 0.5 and exact undo.

## Final verification

| Gate | Evidence |
|---|---|
| Complete API/schema/web suite after correction | 1,164 passed: 673 API, 265 schema, 226 web; 5 existing host skips |
| Lint | ESLint zero-warning, Ruff and tool syntax pass |
| Types/contracts |19 generated contracts, strict TS and mypy 32 files pass |
| Production build | Next 16.4.6 build passes on corrected source |
| Production browsers |140/140 passed in 3.7 min on the final post-Unicode production build |
| Development lifecycle |36 diagnostic/studio/rig cases passed in 1.5 min before the final schema-only Unicode correction |
| Both-aspect decoded WebM |Decoded 1280×720 landscape and 720×1280 portrait; known-time matrix parity and changing pixels pass |
| Reviews | Whole-change Important finding and doc correction fixed; scoped re-review approved; no open Critical/Important finding |
| Visual | Fresh finish reviewer: ship; 6 valid raw captures; no material fixes. Once-only detector over 8 targets: [] |
| Preservation |178 originals and 755 shared-resource source files pass; regular project unchanged |

The five Windows skips are the existing four POSIX FIFO cases and one symlink
privilege case. Remote CI/Linux execution is not claimed. Test/browser writes use
isolated databases/media. The regular branch stays revision28/history28, snapshot
SHA256 `0e6acce2a50cb24f8f14527fddb3667e45d45f4f032f6729a9578bf132fcdbc6`.
All 8 original fixture/media files and 836 protected reference/landing/old-contract/
fixture paths match starting SHA256 at the recorded audit.

## Regressions and evidence limits

Behavioral RED/GREEN covered unchanged rig matrices, missing source bindings,
ambiguous duplicate SVG IDs, explicit injury semantics, invalidating source edits,
v5 audio/evidence downgrade, legacy transform-editor retargeting, and Unicode text/ID parity. The final shared Unicode cases reproduce a raw API HTTP 200 where 422 was required and reject it consistently after the fix. Explicit whitespace classes and strict ID endings cover BOM, NEL and trailing-newline boundaries. Shared runtime
cases pin budgets, IDs, timing and attachment matrices within 1e-9. The browser
checks actual group matrices, equality between saved studio and API-blocked player,
and decoded changing WebM pixels rather than only button labels.

Intermediate browser failures are not hidden: incorrect Seek time selector,
missing reselection after Reload, and a mobile diagnostics fetch racing accepted
Save were corrected in tests. Fresh focused runs above supersede those attempts.
The first full production attempt had 126 passes and 14 failures: a broad
Inspector query stopped the recovery test before Undo, leaving recovery recorded
and causing later injury assertions to fail. Exact region locators preserve those
assertions and cleanup. The combined 36-case development run and corrected 140-case
production run pass. After the final Unicode contract correction, fresh full
unit/lint/type/build checks pass; its final production rerun passes all 140 cases in3.7 min.
Product source stays frozen during runs. Two implementation agents hit usage
limits; continuation recovered their saved source/evidence without restarting.


No named Impeccable agent types are exposed by this harness. Fresh generic agents
fulfilled its separate finish-review and documentation contracts; existing design
authority/tokens were preserved. Earlier landing/product design metadata ambiguity
was reported without unrelated repair.

Whole-change review classified these as nonblocking test maintenance: separate TS/Python
portable cases rather than a shared fixture, a late-time API case that also exceeds
the frame budget, and missing focused template-loader HTTP/timeout tests. Core
shared timing tests and actual endpoint/import browser checks cover the underlying
paths. Rejected SVG source edits can leave an unreferenced immutable candidate blob
under the existing storage architecture, without accepting canonical changes.

The six reviewed raw captures are preserved below. Working test screenshots in
`.impeccable/review/` can be refreshed by later browser runs; these saved copies
retain the reviewed states.

The rig remains an editable rigid SVG as required by Task11. Raster replacement
would need a different attachment design; advanced skinning and IK remain in
optional Task19. No new design world or renderer was introduced.

Raw captures: [rig desktop](task-11-rig-desktop.png),
[rig mobile](task-11-rig-mobile.png), [review desktop](task-11-review-desktop.png),
[review mobile](task-11-review-mobile.png), [player desktop](task-11-player-desktop.png),
[player mobile](task-11-player-mobile.png).

Commands use the pinned pnpm Node entry on this host: `pnpm test`, `pnpm lint`,
`pnpm typecheck`, `pnpm build`, `pnpm test:e2e`, `pnpm verify:preserved`,
`node tools/verify-agent-resources.mjs`, `git diff --check`. Browser runs select
installed Edge; development additionally sets `AETHER_E2E_DEV=1`. RTK remains
Windows Application Control blocked; bounded file APIs and isolated approved
processes were used without changing host policy or global configuration.

Final logs in the ignored plan workspace: `handoff-test.log`, `handoff-lint.log`,
`handoff-type.log`, `handoff-build.log`, `handoff-production-e2e.log`,
`handoff-preservation.json` and `whole-fix-review.md`. The complete raw source
checkpoints are retained until the user commits; they are not staged.
