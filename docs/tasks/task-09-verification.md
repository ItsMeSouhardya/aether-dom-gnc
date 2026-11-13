# Task09 — Durable jobs and provider execution contracts

Date:13 November2026 (Asia/Calcutta). Branch:`feat/task-09-durable-jobs` (local rename requested by the user after verification).
Base:`ce00a5d7c4280b18534e7d94d0bdf9624b4b286c`. Uncommitted; user handles integration.

## Delivered behavior

- SQLite jobs side-table/Alembic0004, exact idempotent enqueue and branch-local recent history.
- Private leased claims, attempt fencing, real25/75/100 phase progress, cancellation, stale output rejection and maximum3 attempts.
- Transient bounded backoff, explicit expired-lease recovery and permanent failure diagnostics.
- Separate `pnpm jobs:worker` CLI with once/poll/lease controls and graceful stop.
- Shared bounded JobRequest/Job schemas, generated TypeScript and TS/Python semantic validation.
- Atomic pending-proposal staging, immutable initial artifact SHA256 and current decision metadata. Only the existing human approval command edits canon.
- Dedicated Jobs inspector, captured scope/revision/cost, progress/history/recovery and exact proposal review. Unknown enqueue identities survive drawer remount/reload; definite rejection releases the form.
- Fixed same-origin Next routes preserving bounded raw UTF-8 JSON to the server.

Existing synchronous proposals remain available. No paid model, cloud worker,
Redis, runtime dependency, document/command version change, generated media,
collaboration or publishing was added. The separate worker must be started.

## Verification

Final `pnpm test`: **895 passed**, one existing host-limited file-symlink skip:
518API +162schema +215web. New job coverage includes real two-connection claims,
concurrent cancel/branch advance during blocked provider work, three expired
attempts, restart/migration preservation, transactional rollback, idempotency,
hostile input, cross-language timestamp/size boundaries and result validation.

`pnpm lint`, `pnpm typecheck` (15 generated contracts; strict Python24 sources),
production `pnpm build`, `pnpm verify:preserved` and `git diff --check` pass.
Preservation covers178 original files and exact kit schema/fixture copies;
the board/baseline manifest were not changed by implementation.

Production desktop/mobile browser final run: **120 passed** (104 existing +16
Task09 cases), including actual native decoding of the completed portrait WebM
and its exactly trimmed nonzero stereo audio. **9 development smoke cases passed**,
including job remount/unknown-outcome recovery and actual WebM encoding. The single
desktop/mobile visual confirmation ran2 more cases successfully. Local browser is
installed Edge; remote CI is not claimed.

## Review and corrections

A fresh reviewer inspected tracked and untracked Task09 changes against the board
and plan. Pre-fix verdict:ready with fixes; no critical findings. All six Important
findings and the request-size parity finding were corrected with regressions:

| Finding | Regression/evidence |
|---|---|
| Definite409/422 trapped enqueue identity | Browser stale-enqueue recovery; local rejection classification unit test; lost-response retry remains idempotent |
| Polling repeatedly aborted a healthy slow response | Browser3-second history response completes despite2.5-second poll interval |
| Proxy parsing erased duplicate JSON keys | Exact raw-body unit test; public duplicate-key request returns422 with zero jobs |
| Cancel overwrote a permanent failure | API invalid-output/exhausted failure cancellation returns409 and retains diagnostic |
| Every poll/idle claim deserialized all history under write lock |2,001 historical-job regression; scoped active SQL recovery, bounded eligible claim, no historical artifact fetch |
| Reserved keys inside result context/diff reached review | Client/result API hostile nested-key regressions; staging/current/frozen artifact checks |
| Request byte budgeting differed by16 bytes | TS/Python8176-byte accepted and8177-byte rejected boundary tests |

Root also corrected the missing Cancel action for retryable failures waiting for
automatic retry, and a private staging-ID collision with synchronous requests.
Historical migration-test fixtures now actually remove the new table when
simulating old schemas; explicit0003→0004 preservation/idempotence is covered.
All reported findings are resolved; no deferred minor remains. Paid providers,
hosted queues and authenticated multi-user behavior were explicitly outside
this review/task. The wider existing synchronous proposal engine was inspected
only for interaction with Jobs.

## Broad regression discovered during verification

The existing native WebM test reproduced nonempty files whose decoded audio was
0.54/0.72/0.96 seconds for an authored1-second clip. Empty-only fallback did not
catch that. A unit regression first proved incomplete bytes were accepted; the
native result now undergoes bounded cancellable decoded-audio duration validation
before download and uses the existing local WebCodecs fallback when incomplete.
No export dependency or format was added. Existing track cleanup remains covered.

Initial broad browser failures also included two new assertions matching Next's
route announcer in addition to the intended alert; those locators now stay inside
the Jobs region. These were assertion-scope failures, not a removed recovery path.
An initial job smoke failure was a test worker consuming older intentionally
queued work; its bounded harness now waits for its own branch's jobs to settle.
No test was skipped or weakened to hide these failures.

## Visual evidence

One batched desktop/mobile review inspected real jobs/results and readable
before/after controls at1440×1000 and mobile390×844. One correction makes native
progress use studio sage rather than the browser's bright green; the one
confirmation round verified that correction. Final captures:
`task-09-desktop.png`, `task-09-mobile.png`. Impeccable mechanical detector ran once
on the changed studio UI and returned `[]`.

## Data preservation and operations

Regular user project was read only before/after migration/startup: one branch,
revision25,25commands, sorted Python JSON SHA256
`6217a55330829d6bac624146856e7995415eb91dc7cd048f9bda6ea02a90fab4`, unchanged.
Its jobs table is empty. All browser/API/worker mutations use isolated DB/media
roots. Original/imported assets, landing, archives, kit and original plans remain
unchanged. No commit, push, merge or PR was performed.

Sandboxed API baseline stalled; approved local process permissions ran the suite
successfully. Existing Python3.12 `.venv-task04` override remains. A simultaneous
typecheck/build briefly raced regenerated `.next/types`; sequential typecheck
after the completed build passed. No dependency or host security-policy changes.

Preview:studio on http://127.0.0.1:3001/ and API on http://127.0.0.1:8001/.
Start the worker from a separate root terminal to execute queued mock work.
Next ordered task is Task10, only when separately requested.
