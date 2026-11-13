# Task09 Durable Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox tracking.

**Goal:** Run bounded offline proposal work durably with job history, recovery and explicit review, without job lifecycle changes touching creative canon.

**Architecture:** A separate SQLite side table and leased local worker own execution state. Enqueue captures the exact validated proposal request and selected-node input hash against a saved revision. A fenced successful completion atomically stores a pending proposal and artifact reference; only the existing human approve command edits canon. Dedicated Jobs inspector uses the existing studio design. No Redis, cloud SDK or new runtime dependency.

**Tech Stack:** Existing JSON Schema/AJV/generated TS, FastAPI/SQLAlchemy/Alembic/SQLite, Next16/React, Vitest/Pytest/Playwright.

**Spec:** `aether_dom_codex_kit/CODEX_TASKS.md` later-epic execution rules/review focus and Task09; master plan §§3–4,9–10,12; PRODUCT.md; docs/design/studio.md.

## Global Constraints

- Preserve document0.1/0.2/0.3, commands0.6 and original kit/schema/fixture, landing/archive/media. No startup document upgrade.
- Jobs and staged proposals never change revision, snapshots, audit or undo stacks. Approval retains existing validation/scope/revision checks.
- Server-only worker; provider runs outside SQLite write transactions. Claim tokens stay private. Every progress/completion is fenced by token, lease, state and revision.
- Bounded three attempts; cancelled/stale jobs are terminal. Expired claims become explicitly retryable failures while attempts remain. Transient retry has bounded backoff; malformed output is terminal.
- Keep zero-cost deterministic mock explicit. Existing synchronous Task06 proposals remain supported. No paid provider, generation of media or publish actions.
- Work in existing checkout on feat/task-09-durable-jobs (user-requested local rename after implementation). User handles commit/push/integration; preserve regular database/media.

## Review Focus

1. Expired worker A completes after worker B has claimed the retry: fenced, no duplicate result/proposal.
2. Cancellation or branch advancement during provider work: discard late output with no canonical or proposal writes.
3. Lost enqueue response/reused request ID: identical retry returns same job; changed payload or branch reuse conflicts.
4. Malformed JSON, prototype keys, Unicode/numeric size boundaries, forged result identity: reject before exposing review controls; never render raw HTML.
5. Network polling, remount, StrictMode and branch changes: abort stale requests, retain unknown-outcome idempotency identity and avoid duplicate enqueue/approval.

## Contract and state decisions

`JobRequest` uses the exact Task06 ProposalRequest shape: requestId, expectedRevision, scopeIds, allowedOps, intent, message. The sole supported kind is proposal generation. Public `Job` fields: jobId, projectId, branchId, baseRevision, request, inputHash, provider, modelVersion, estimatedCost, actualCost, status, attempt, maxAttempts, progress, createdAt, updatedAt, leaseExpiresAt, nextAttemptAt, error, result. Status: queued/running/succeeded/failed/cancelled/stale. Cost objects are amount/currency with local mock amount0 USD; actualCost is nullable until execution settles. Error is nullable {code,message,retryable}; result is nullable {kind:'proposal',proposalId,sha256}. Public timestamps use UTC ISO strings; tokens/internal scheduling columns never leave the repository. SHA256 covers canonical sorted compact JSON, including exact selected-node input context or stored initial proposal artifact respectively.

Routes under `/api/v1/projects/{projectId}/branches/{branchId}/jobs`: GET latest20, POST enqueue; `/{jobId}` GET; `/{jobId}/cancel` and `/retry` POST empty object; `/{jobId}/result` GET one validated stored Proposal. List returns {jobs:[...]}, other job routes return Job directly, result route returns Proposal directly. Validate branch, payload/identity, bounded bodies and strict query/path resources. Canon approval remains `approveProposal` via commands; reject uses existing proposal decision API. Job creation/decisions are idempotent. Existing completed artifact remains historical if canon later advances; its approval is stale.

Dedicated Jobs inspector contains scoped deterministic scenario enqueue, latest job list, progress/attempt/cost/status, Refresh jobs, Cancel job/Retry job when allowed, and explicit Review result. Reuse ProposalReview for exact before/after plus approval/rejection; explain separate worker startup when queued. Poll while visible at a modest interval, pause hidden, abort on unmount, and preserve request identity on uncertain enqueue retry. No browser worker/admin trigger endpoint.

## Task 1: Durable contracts, API and worker

**Files:** Create schema job-request/job schemas, generated types, `src/jobs.ts`, shared fixtures/tests; API `job_domain.py`, `job_repository.py`, `job_worker.py`, migration0004, job tests; modify schema generator/index, persistence tables and main route registration. Keep repository integration narrow. Add worker script to tools/api.mjs and root package.json.

**Interfaces:** `JobRepository(repository)` exposes enqueue/list/get/cancel/retry/result, claim/progress/finish/recover; worker `run_once` and module CLI use the same repository and existing prepare_proposal. Exact Python signatures remain local implementation detail; public JSON contract above is fixed.

- [x] Write failing schema/API/repository tests for idempotent enqueue (same ID; changed payload409), no revision/history changes, unsafe inputs, branch isolation, exclusive claims and cancellation/restart recovery; run red.
- [x] Implement strict shared validation, migration and transactionally fenced lifecycle. Test deterministic clock/lease boundaries including expired completion, stale base, malformed output, max-attempt exhaustion and transient backoff. Progress cannot decrease or revive terminal work.
- [x] Add worker CLI polling/once modes with signal cleanup; use captured immutable revision/context. Atomically insert validated pending proposal and result ref under job completion lock. Run focused then full API/schema tests green.

## Task 2: Studio client and job inspector

**Files:** `apps/web/src/lib/job-api.ts`, `job-proxy.ts`; fixed Next job routes; `components/jobs/job-panel.tsx`; studio-shell.tsx and limited studio.css; API/proxy/component tests and e2e jobs.spec.ts.

**Interfaces:** Consume Task1 JSON and exported Job/JobRequest/validateJob/validateJobRequest. Use existing run(command, reason, expectedRevision) and ProposalReview. Human requested dedicated drawer; inherit charcoal/sage/Manrope and existing inspector sections.

- [x] Write failing transport/proxy tests for exact job/resource/request identity, invalid/oversize responses, query/origin/content-type checks; component test waiting/cancel/retry/review/stale/unknown-outcome states. Read installed Next routing docs and Impeccable Operate/craft-floor before production UI code.
- [x] Implement abortable API helpers, fixed same-origin JSON routes and Jobs inspector; close competing inspectors and pause preview. Keep async job lifecycle independent of canonical save busy state and persist no UI draft into canon.
- [x] Add desktop/mobile browser tests against isolated API/database and a test-controlled worker process: enqueue, refresh/reload, execute, review/reject/approve, cancel and stale outcomes. Assert exact saved revision changes only on approval, no overflow or console errors.

## Task 3: Verification, review and handoff

- [x] Run lint/types/generated drift/unit/API/build/preservation; production desktop/mobile e2e plus relevant dev lifecycle checks. Preserve regular DB document/history/hash before/after.
- [x] One batched desktop/mobile visual inspection, one correction/confirmation only if needed, mechanical detector once. Fresh whole-change review with plan/spec and real test evidence; reproduce/fix important findings with red→green regressions.
- [x] Update root/API/schema README, PRODUCT.md, studio brief and current context with contracts/worker commands/limitations/evidence. Record exact results in docs/tasks/task-09-verification.md. Do not mark kit task complete by editing its preserved bytes; current context/evidence track completion.

## Execution ledger

- Baseline: clean feat/task-08-branches-exports at ce00a5d; Task08 and board expansion committed by user. Task09 branch created after sandbox escalation permitted the Git ref write. No new worktree required; reuse suitable checkout per app instructions.
- Scope ruling: user requested implementation of the existing scoped board and selected the dedicated Jobs drawer; local execution/storage choices above fill implementation detail, no redesign or feature expansion. Existing user integration preference means no agent commit/push.
- Baseline790 passed/one existing host skip. Sandboxed API run stalled; approved local process permissions passed. Regular user DB revision25/history25/hash6217a553…fab4 captured read only and remains unchanged after migration, with zero regular jobs.
- Task1 complete: side-table0004, lease/attempt/revision fencing, progress25/75/100, scoped active recovery and SQL-limited claims, permanent diagnostic preservation, atomic proposal/artifact staging, strict input/result boundaries. Both real worker connections and late completions covered.
- Task2 complete: dedicated Jobs inspector, abortable/poll-deduplicated transport, exact raw-JSON proxy, current decision review, durable pending enqueue identity, definite rejection recovery and retry cancellation. Unit/API/browser regressions exercised actual behavior.
- Fresh whole-change review completed before its usage-limit interruption; consolidated pre-fix verdict returned on resume. Six Important findings plus request-size parity corrected with red→green regressions; no Critical or deferred minor. Broader paid-provider/auth behavior remains future scope.
- Ruling: the broad required browser suite reproduced nonempty native WebM with0.54/0.72/0.96s audio for a1s clip. Added bounded decoded-duration validation and reused existing WebCodecs fallback, rather than skipping/weakening the regression. Cost:one extra local decode before native audio output is offered. Unit regression red→green; actual production desktop/mobile decode now passes.
- Final source checks:895 tests passed (518API/162schema/215web), one existing skip; lint/types/15 generated contracts/build/preservation/diff checks pass. Typecheck rerun sequentially after a `.next/types` build race passed. Full production browser suite120passed; development smoke9passed; visual confirmation2passed. Final captures and context/evidence updated. No required work remains; branch and uncommitted changes are kept for user integration.
