# Task 02 — Commands and persistence

Verified 11 November 2026 (Asia/Calcutta). Branch `feat/task-02-commands-persistence`, based on merged Task 01 commit `a1e4526`. Changes remain uncommitted for the user.

## Delivered behavior

- Shared versioned command schema and generated TypeScript union: `setLayerTransform`, `undo`, `redo`. Every envelope requires stable identities, unique command ID, human actor, reason and expected revision. Transforms accept nonempty partial finite values; scale must be positive.
- SQLite owns canon through SQLAlchemy and an initial Alembic migration. Startup migrates and seeds only an absent branch. Every accepted action atomically commits a validated immutable snapshot, audit command/receipt, exact forward/inverse transforms and persistent undo/redo stacks. Revision and active-branch head advance on undo/redo. New edits clear redo without deleting audit history.
- Stale revisions return 409 with no writes; concurrent writers have one winner. Identical command-ID/payload retries return the original committed result. Different payloads under an existing ID conflict.
- Studio loads the saved branch, keeps drafts/selection separate, and updates its document cache only from validated server responses. Explicit Save transform/Cancel, Undo/Redo, recent change history and saved/error states follow the selected Afterlight Operate design. Stale drafts, invalid success responses and uncertain network outcomes block writes until Reload latest.
- Database defaults to ignored `data/aether-dom.sqlite3`; environment override, migration and stopped-service backup instructions are documented. E2e owns ports 3100/8100 and a unique database, separate from the user's preview database.

## Evidence

| Check | Final result |
| --- | --- |
| `pnpm test` | 151 passed: 36 shared contract, 39 web boundary/draft/selection, 76 Python/API |
| `pnpm test:e2e` | 34 desktop/mobile browser tests passed against production build and fresh services |
| `pnpm lint` | ESLint zero warnings, Ruff and retained landing syntax checks passed |
| `pnpm typecheck` | Both generated contracts match; TypeScript and strict mypy passed (8 Python source files) |
| `pnpm build` | Production build passed, including both new dynamic project routes |
| `pnpm verify:preserved` | All 178 original files preserved; document schema and fixture match kit bytes |
| Dependency consistency | Offline strict peer check and `pip check` passed; no lockfile change |
| Migration | Initial migration/seed run twice successfully against a temporary database |
| Development startup | Temporary Next dev on port 3001 compiled `/` and returned HTTP 200; stopped afterward |

API/domain tests cover partial-field preservation, exact multistep inverse/redo, restart durability with redo, full audit/snapshot immutability, one winner across concurrent repositories, command replay across restart, history limiting without deleting snapshots, and rollback after a snapshot insert but before the audit insert. Invalid commands, non-finite/oversized JSON numbers, missing identities, stale revisions and unavailable undo/redo leave canon unchanged.

Browser tests exercise save → refresh → exact undo/redo, two-editor conflict without lost updates, invalid drafts with no POST, a draft opened before Undo retaining its original revision, and a server-committed save whose response is deliberately lost. The original selection, empty/error/retry, keyboard, long-title reflow, stage containment and immutable seed-overview coverage remains green.

Desktop/mobile form captures and the expanded history were inspected. No horizontal overflow, clipped controls or new design defects were observed. CUA separately confirmed the restored preview loads revision 0, selects Kael, opens the five-field draft with disabled unchanged Save, and cancels back to unchanged saved values. No commands were sent to the regular preview database during verification.

- [Desktop draft](task-02-desktop.png)
- [Mobile draft](task-02-mobile.png)
- [Saved revision and history](task-02-history.png)

## Review and corrections

A fresh read-only reviewer inspected the full tracked/untracked Task 02 implementation against the kit and plan. One P2 defect was reproduced: Python accepted a 401-digit integer that decodes as Infinity in JavaScript, making a saved branch unreadable by the studio. Positive/negative raw-JSON API regressions failed with HTTP 200 before the correction. The shared Python finite-number guard now rejects overflowing integers; both return 422 without revision/history writes. The reviewer confirmed the fix and found no remaining concrete source issues.

The initial browser integration run exposed valid saves rejected with 403 because Next normalized the internal request URL to localhost while the browser used 127.0.0.1. A failing proxy regression pinned the mismatch. Origin validation now compares the incoming Host authority and request protocol, ignores forwarded headers, and still rejects cross-origin writes. The reviewer confirmed this correction. Final full browser acceptance passed after both fixes.

The initial production build's CSS worker exited during package-manager shim startup. Invoking the same installed Next CLI with Node succeeded; the web build script now makes that launcher explicit. The normal root build command passes. Sandbox workers also encountered process/memory restrictions; successful full verification used approved execution outside the sandbox. One automatic approval review was temporarily unavailable due to a usage limit; it resumed successfully after the user's continuation. No approval bypass or unresolved rejection remains.

## Handoff

Root preview: <http://127.0.0.1:3000/> (production web session 96750), API: <http://127.0.0.1:8000/> (session 19021). Both use the final sources; the saved database is seeded at revision 0 with empty history. Previous Task 01 services and all temporary/e2e services were stopped. Restart with `pnpm dev:api` and `pnpm dev`, or the documented production start command after building.

RTK remains blocked by Windows Application Control; direct tools were used. Impeccable's engine cache remains unavailable, so selected design/Operate/craft guidance was consulted directly. SQLAlchemy uses the same pinned version's supported pure-Python build because its compiled extension was blocked; the workaround is documented in the API README. These do not block the installed application or checks. CI is configured but has not been run remotely.

No commit, push, PR or merge was performed. Original document schema/fixture, kit, landing and archives are preserved. Next is **Task 03 — Dependency graph and linter**. Full rendering, arbitrary document editing, branch creation, playback, AI and auth remain outside Task 02.
