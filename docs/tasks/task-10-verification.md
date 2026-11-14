# Task 10 — Asset provenance and commercial-use policy

Completed 14 November 2026 (Asia/Calcutta). Implemented the approved design and
Task 10 execution rules. Work remains uncommitted on `feat/task-09-durable-jobs`
from baseline `3330d8f`; the user handles integration. The separately requested
shared-resource library and presentation roadmap are preserved. No Task 11 code
was started.

Design: [approved scope](../superpowers/specs/2026-11-13-task-10-asset-rights-design.md).
Plan: [completed checklist](../superpowers/plans/2026-11-13-task-10-asset-rights.md).

## Delivered behavior

- Optional asset provenance in document 0.4 and human-only `setAssetEvidence` in
  command 0.7. Reviewed edits capture branch/revision and media identity, use normal
  audit/invalidation, and support exact undo/redo/replay/fork/restart. Only accepted
  edits upgrade copied snapshots; earlier schemas/types/fixtures and startup stay
  unchanged. No SQL migration or runtime dependency was added.
- Immutable bounded text evidence with exact original/current raw hashes and
  portable payload hashes, creator/source/license/attribution, per-use permission,
  optional provider/model lineage and voice/likeness consent. Changed derivatives
  retain originals and earlier records and need a fresh evidence review.
- Revision-bound inspection shows original/current bindings, existing rights and
  effective private/public/commercial decisions, reasons and attribution. Drafts
  require Review changes then Save evidence. They freeze during a pending save;
  stale/uncertain outcomes retain text. If Undo removes an imported target, the
  captured draft remains copyable and unsavable until Cancel restores navigation.
- Server and offline wrapper 1.1 validation recompute policy, verify proof coverage/
  hashes and media bindings, and reject inconsistent immutable-URI hashes. Legacy
  wrapper 1.0 private preview remains readable within its included-media scope.
- JSON/WebM explicitly choose intended use. A ledger's denial, unknown permission,
  missing proof, incompatible consent or stale binding overrides legacy allowance.
  WebM offers an opt-in matching **Source + evidence JSON** companion; it contains
  the full project, media and proof text. Bare WebM embeds no ledger.

Policy evaluates recorded claims; it does not establish ownership, authenticate a
license or provide automatic legal clearance. Text evidence is suitable for sharing
only if the creator chooses its contents accordingly. No live provider, PDF/image
evidence parser, hosted publication or marketplace transaction is introduced.

## Verification

| Check | Final result |
|---|---|
| API/schema/web suite | **1,067 passed**: 619 API, 225 schema, 223 web; 5 host skips |
| Lint | ESLint zero-warning, Ruff and landing/tool syntax pass |
| Contracts/types | 17 generated contracts; strict schema/web TS and mypy 30 files pass |
| Production build | Next 16.4.6 build passes |
| Production browser checks | 132 distinct desktop/mobile cases verified across full and targeted runs |
| Development lifecycle smoke | 9 passed in 40.0s; current corrected source, clean child-process output |
| Review | Whole-change review's two Important findings addressed; scoped correction approved; no open Critical/Important finding |
| Visual/documentation | Once-only detector returned []; two visual corrections scored resolved/ship; fresh documenter reconciled studio/player notes |
| Preservation | 178 approved baseline checks; 806 reference hashes, all 8 media files and regular project unchanged |
| Shared resources | 755 source files, 27 skill entries/variants and RTK provenance pass |

The full production attempt had 130 passes and two strict-locator failures: newly
visible per-use reasons made an old generic 'stale' query ambiguous. The assertion
now targets the inspection alert; both affected desktop/mobile cases passed the corrected production rerun (2/2 in22.3s). This is reported across
runs, not as a falsely green original 132-case run. A first targeted launch selected
the blocked bundled Chromium because the runner label omitted its Edge setting;
the corrected run uses installed Edge.

Five Windows-host skips are four real POSIX FIFO tests and one pre-existing
file-symlink privilege test. Native Windows junction/reparse attack controls ran;
Linux runtime and remote CI are not claimed. Root tests were rerun after the
integration corrections. Production/browser tests use isolated databases/media.

Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm test:e2e`, `pnpm verify:preserved`,
`node tools/verify-agent-resources.mjs`, `git diff --check`. On this host the
pinned pnpm entry is invoked through Node; API tests use a process-only contained
`--basetemp`. Browsers set `AETHER_E2E_CHANNEL=msedge`; development also sets
`AETHER_E2E_DEV=1`. The ignored verification runner drops conflicting inherited
NO_COLOR only in child environments; no global configuration changed.

## Review and regressions

Fresh contract review found signed-zero payload hashes unstable after JSON
roundtrip. Portable SVG hashing now normalizes zero while raw byte hashes remain
exact. Storage review found publication TOCTOU, FIFO blocking reads, untyped SVG
observation failures and contradictory offline raw bindings. All were corrected
with regressions and scoped approval. Windows evidence creation/publication/cleanup
uses retained native handles after a verified anchor; actual attribute-only
junction conversion fails closed with no external file effects. POSIX uses
directory descriptors. Successful unlocked attack controls prevent sandbox denials
from being mistaken for security evidence.

UI review found a slow-save draft-loss race; a delayed real committed response
reproduced it, and the busy fieldset correction passed scoped review. Whole-change
review found missing-target draft recovery and absent effective use decisions. A
guarded prior-component substitution reproduced the missing Creator field after
Undo; exact SHA restoration and desktop/mobile GREEN checks verified retained
creator/proof text, actual Reload completion, and opening Branches/Export. A focused
shared-policy adapter suite covers legacy allowance, denial, missing proof/consent,
observed raw/payload mismatch, errors and attribution. Some policy permutations are
unit-tested rather than separately repeated in every browser state.

The misleading private-denial fixture name now says public denial. Review details
now include consent subjects/proof identities, prior proof text and parent lineage.
Two nonblocking maintenance notes remain: an unused Python inspection-store
argument and dense consent/form JSX. They do not weaken command or policy checks.
Dedicated fresh generic agents performed Impeccable finish/documentation roles
because the harness does not expose the named agent types. Their visual verdict
covers the supplied captures and the two scored fixes, not an unrestricted audit.

## Evidence captures

- [Asset inspector desktop](task-10-assets-desktop.png), [mobile](task-10-assets-mobile.png)
- [Review desktop](task-10-review-desktop.png), [mobile](task-10-review-mobile.png)
- [Export recovery desktop](task-10-export-desktop.png), [mobile](task-10-export-mobile.png)
- [Player companion desktop](task-10-player-desktop.png), [mobile](task-10-player-mobile.png)
- [Effective decisions desktop](task-10-final-readonly-desktop.png), [mobile](task-10-final-readonly-mobile.png)
- [Removed-target recovery desktop](task-10-final-recovery-desktop.png), [mobile](task-10-final-recovery-mobile.png)

Captures are unedited browser output. Desktop is 1440×1000, with a 1440×2000 review
view to show its full content; mobile is 390×844 CSS pixels at DPR 3. Full-page
heights vary. Ignored reports/diffs/logs remain in
`.superpowers/sdd/2026-11-13-task-10-asset-rights/` while work is uncommitted.

## Data and environment

The regular user project remains one branch at revision 28/history 28, sorted
Python JSON SHA256
`0e6acce2a50cb24f8f14527fddb3667e45d45f4f032f6729a9578bf132fcdbc6`.
All eight media files and 806 protected reference/archive files match their initial
hashes. The separate roadmap request adds only its authorized board redirect and
updates that one preservation-manifest entry; the other 177 entries are unchanged.

RTK remains blocked by Windows Application Control. Bounded file APIs and approved
processes are the documented fallback; no security policy was changed. Sandboxed
TestClient/server processes stall on this host; isolated approved-process checks
pass. The ignored virtualenv was pointed at the same verified Python 3.12.14 after
a host runtime update removed its prior base; packages/versions are unchanged.
Ordinary PowerShell still lacks pnpm on PATH; the documented pnpm-free API/worker
launcher remains available. No global PATH, dependency or host configuration change.

## Decisions and costs

1. Applicable required consent covers private use too; unknown applicability blocks
   broader use. Cost: some private previews require more evidence.
2. Only portable SVG payload hashes normalize signed zero. Cost: that derived hash
   omits the sign; exact source-byte hashes retain it.
3. WebM uses a separate exact-source/evidence companion. Cost: users must retain it.
4. Legacy wrapper checks govern included media. Cost: unused ledger metadata can
   travel without proof; it confers no permission for that asset.
5. Existing Unicode asset IDs remain valid lookup keys. Cost: routing must preserve
   bounded opaque identity and careful encoding; file containment remains separate.

## Handoff

Work is saved and reviewed, uncommitted and unpushed. Use Asset references → Edit
evidence → Review changes → Save evidence; inspect effective decisions and use
Export JSON → intended use → Review export → Download JSON. Keep the matching
source/evidence JSON with WebM for records. All test-owned services stop after
verification; restart normal API/web with the README commands to load new sources.

Next separately requested work is **Task 11 — Articulated character posing and
canon-aware motion** in [TASKS PT2.md](../../aether_dom_codex_kit/TASKS%20PT2.md).
