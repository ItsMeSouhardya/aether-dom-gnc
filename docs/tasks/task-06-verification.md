# Task 06 — AI proposals verification

Completed 13 November 2026 (Asia/Calcutta), on `feat/task-06-ai-proposals`, based on the user's Task05 commit `34d4e35`. Changes are uncommitted; no push, PR or merge was performed.

## Delivered behavior

An offline deterministic provider implements the proposal protocol. Selected-node context, explicit target scope and operation permissions bound every request. Strict JSON parsing rejects duplicate keys, nonfinite numbers, invalid Unicode, excessive depth/size, forbidden operations, scope escape, invalid evidence, domain errors and no-op batches. The three mock scenarios repair a selected character pose, move a layer X by0.25, or set shot tension to0.8. The message is inert context, not interpreted instructions. No model SDK, cloud key, network call or new runtime dependency was added.

Proposal requests, provider payloads and persisted review records have shared schemas and generated types. Command0.5 adds human-only `approveProposal` with empty args. Document0.1/0.2/0.3 schemas/types and the original fixture remain unchanged. Alembic0002 adds a separate proposal table without rewriting snapshots/history or upgrading documents.

Generate/list/reject do not change canon. Approval revalidates the stored context, scope, operations and exact diff under the existing SQLite transaction; base revision and command revision must match current head. One atomic command writes one revision, undo entry and provenance receipt, and records the decision. Invalid batches, stale approvals and decision races roll back. Replay is idempotent. Exact undo restores the authored snapshot while retaining the historical approval decision.

The inspector panel shows readable Before/After fields, base/current revision, permitted scope, captured context, provider/model and zero estimated cost. Generation focuses and scrolls to the current review above saved history. Opening it pauses preview and closes the mixer. Stale approvals are disabled with reload/regenerate guidance. Fixed Next proxies enforce same-origin JSON, bounded bodies, no-store responses and validated identities. The command client validates approval provenance against the submitted command.

## Verification

- Final unit/API run: **585 passed** —364 Python/API,89 shared-schema and132 frontend;1 legacy host-limited file-symlink test skipped.
- ESLint/Ruff, strict TypeScript/mypy (17 Python source files), generated-type drift and production build passed.
- `pnpm verify:preserved`:178 original files preserved; original kit/schema/fixture byte copies match.
- **84 production desktop/mobile browser cases passed**, followed by **3 development effect/audio/proposal smoke cases passed**. Tests use fresh databases and copied fixture assets on3100/8100. CI includes the same development proposal smoke.
- Real browser inspection at1536×850 and390×844 confirmed desktop stage/review balance, readable wrapping, exact pose diff and reachable approval/rejection controls. Viewport override reset; isolated visual services stopped. Captures: `task-06-desktop.png`, `task-06-mobile.png`.

Feature tests cover invalid provider output, prompt injection staying inert, explicit permissions, bounded context excluding unrelated cast, no canonical writes before approval, rejection, restart durability, stale regeneration, replay, concurrent approvals, multi-operation rollback, absent-field/schema diff, exact undo/redo and persisted decision history. New browser cases cover the complete request/reject/approve/stale/permission/error flows on desktop/mobile.

The first integrated production browser run passed83/84; an existing fullscreen case timed out while showing Opening studio. A production rebuild overlapped that run. The final stable-build run passed all84 cases, with no concurrent build.

## Review corrections

A fresh read-only whole-branch review found two concrete boundary defects. TypeScript counted array indexes as extra JSON nodes while Python counted values; both now count values consistently, pinned by a shared array-heavy fixture. Preview budgeting initially omitted final identity/timestamp/decision growth; preparation now reserves worst-case metadata and each create/approve/reject transaction validates the actual final record before writing. Fault injection and real boundary lifecycle tests verify complete rollback.

A follow-up numeric audit reproduced Python exponent JSON fitting122662bytes while JavaScript decimal serialization expanded it to132902bytes. Python now conservatively reserves16bytes per finite numeric value in every existing byte-bound check, including metadata reservation. Shared unsafe/safe numeric fixtures verify the unchanged128KiB/4096-node contract. No oversized review record can poison saved history through these paths. A separate root regression rejects mismatched approval receipt provenance.

The reviewer independently confirmed the final bounds corrections with9 Python and3 TypeScript regressions passing, with no remaining concrete findings.

## User data and runtime

The regular project remains revision6, history6, schema0.1.0. Before/after sorted Python JSON SHA256: `3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab`. Its proposal history is empty. All mutations used isolated test/visual databases. The API was restarted to load the side-table migration; no user project commands were sent.

Final preview: web `http://127.0.0.1:3000/`, API `http://127.0.0.1:8000/`, both HTTP200. Background launcher PIDs2976(web)/31712(API), with ignored logs in `data/task06-*-preview.log`. Existing `.venv-task04`/`.env.api.local` selects the healthy pinned Python3.12 runtime. RTK0.42.4 now works and was used for final verification; older host-blocked RTK notes are historical. Installed Edge was used through `AETHER_E2E_CHANNEL=msedge`; CI keeps standard Chromium. Remote CI has not run.

Task06 uses the selected Afterlight product/design, Impeccable Operate/craft guidance and existing React patterns. No engine detector score is claimed. Landing, frozen archives, original source plans, media and document schemas remain preserved. Real AI providers, auth and export are outside this slice. Next ordered work: Task07 — Aspect-ratio & player.
