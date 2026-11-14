# Task10 Asset Rights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox tracking.

**Goal:** Record version-bound asset evidence through reviewed reversible edits and enforce explicit export-use decisions without claiming legal clearance.

**Architecture:** Optional asset provenance in canonical document0.4 is authored through the existing command/revision repository. Immutable contained text evidence and existing media versions are referenced by SHA256. Shared deterministic policy evaluates recorded permissions; server assembly and offline player validation enforce the same rules.

**Tech Stack:** Existing JSON Schema/AJV/generated TS, FastAPI/SQLite, Next16/React, Vitest/Pytest/Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-13-task-10-asset-rights-design.md`, approved by user: “Go for it.” Task10 and Tasks09–29 execution rules in the kit board.

## Global Constraints

- Preserve schemas0.1/0.2/0.3, original fixtures/kit, immutable originals, landing and archives. Never upgrade on startup. Existing IDs remain stable.
- Rights edits are human typed commands with expectedRevision, audit, invalidation and exact inverse. Provider/proposal permissions remain unchanged.
- Legacy known-rights private preview is allowed only without a ledger. Once present, denied/unknown/stale/incomplete records govern. Unknown rights labels block export.
- Public distribution and commercial pack use require explicit permission, evidence, attribution and applicable consent. Permission does not establish ownership or publish.
- Evidence is bounded UTF-8 text, stored immutably by hash. UI discloses its inclusion in portable files. No PDF/image parsing or live legal/provider service.
- SVG/audio remain the supported media; this task adds no new decoder. Unsupported/missing media has an actionable blocked state.
- Reuse current feature checkout and preserve pending shared-library changes. User handles commits/push/integration. Use isolated DB/media roots for mutation tests.

## Review Focus

1. Existing ledger denies private use or has an obsolete media hash: legacy rights must never bypass it (Task1/2 regression).
2. SVG changes after evidence save: preserve original and old evidence, mark the new derivative unreviewed until explicit correction (Task2).
3. Offline manifest contains a forged allow flag, altered evidence or swapped SVG/audio: recompute policy and check payload hashes rather than trusting cached results (Task1/2/3).
4. An older tension/stage operation follows a0.4 edit: retain its provenance/version; undo/redo/fork/restart keep exact records (Task2).
5. A dirty form sees selection/revision/network changes: preserve captured identity, block stale save and provide a working evidence recovery path (Task3).

## Interfaces and record decisions

Use names below consistently; field spelling is an implementation choice now fixed for all tasks.

`ExportUse = 'private_preview' | 'public_distribution' | 'commercial_pack'`.
`Permission = 'allowed' | 'denied' | 'unknown'`.
`EvidenceBlob = {uri:string,sha256:string,text:string}`.
`AssetProvenance = {ledgerVersion:'1.0.0',original:{uri,sha256},current:{uri,sha256,payloadSha256},creator,source,license,attribution,permissions:Record<ExportUse,Permission>,evidence:{uri,sha256,label}[],lineage:{provider,model,parentSha256:string|null}|null,consents:Consent[]}`.
`Consent = {kind:'voice'|'likeness',applicability:'not_applicable'|'unknown'|'required',subject:string,status:Permission,uses:ExportUse[],evidenceHashes:string[]}`. Require exactly one record of each kind. Required consent must cover the requested use with allowed status and referenced evidence. Unknown applicability blocks public/commercial use. Empty/unknown license or creator/source blocks an asserted broader permission. Licensed public/commercial use requires evidence; creator-original statements also need evidence, which may be a recorded creator statement. Attribution is explicit text; empty means none required as recorded by the creator.

Limits:8 evidence records/asset;64KiB UTF-8 per text;256KiB evidence text/asset;128KiB authored provenance JSON; creator/source/license/attribution each at most2000 scalar characters; provider/model/subject at most256; paths must be canonical `assets/evidence/<64 lowercase hex>.txt`. Keep non-whitespace requirements where a field asserts a known value. Bound command JSON to512KiB and validate before recursive use.

`AssetUseDecision = {assetId,use,allowed,reasons:string[],attribution:string[]}`.
TS `evaluateAssetUse(asset,use,evidence?:EvidenceBlob[]):AssetUseDecision`; Python `evaluate_asset_use(asset,use,evidence=None)->dict`. Pure, no I/O. Match URI identity and evidence hashes; server separately validates actual media hashes against stored bindings. New manifest validation additionally checks payload bindings.

`sha256Bytes(bytes:Uint8Array):string`, `svgPayloadHash(svg:SvgData):string`; Python matching `svg_payload_hash(svg)` and hashlib for raw bytes. SVG payload hash covers viewBox IEEE754 binary64 hex values and a deterministic JSON tree (explicit field order, ASCII-sorted attribute keys, scalar strings), avoiding Python/JS decimal serialization differences. Normalize negative zero to positive zero for this portable payload representation because JSON.stringify loses its sign; raw original/current byte hashes still distinguish exact source bytes. Audio payload hash is its exact WAV SHA256. Original/current raw byte hashes remain separate from portable payload hashes.

Command `setAssetEvidence` targets an existing asset. Args: `{rights,expectedAssetUri,expectedSourceUri,creator,source,license,attribution,permissions,lineage,consents,evidence:{label,text}[]}`. Server computes all paths/hashes; clients cannot submit arbitrary evidence paths or trusted media hashes. Schema command0.7 retains existing commands. Accepted edit upgrades a copied snapshot to0.4; exact stored inverses preserve predecessor bytes/optional-field presence. No-op correction rejects.

Revision-bound inspection: `GET /projects/{project}/branches/{branch}/assets/{asset}/ledger?revision=N` returns `{projectId,branchId,revision,assetId,original,current,evidence:EvidenceBlob[],error:string|null}`. Missing/unsupported media can return a bounded error state for recovery; unsafe identities/query return typed errors. Actual file contents never come from arbitrary client paths. No-cache and same-origin proxy conventions apply.

Player wrapper1.1 adds `{exportUse,evidence:EvidenceBlob[]}` while retaining version1.0 private-preview loading. Canonical provenance travels inside the exact document. Embed only evidence referenced by included media; deduplicate by hash and enforce existing32MiB/64-media/200000-node/depth32 bundle bounds plus evidence limits. Validate exact evidence coverage, integrity, policy and media payload hash. Existing wrapper schema/types remain readable, and old fixtures stay unchanged. Server `build_player_manifest(..., export_use='private_preview')` and repository/API query `use` enforce the requested use. Offline WebM changes use only if shared evaluation passes; no trusted cached allow flag.

## Task 1: Shared records, hashing and pure policy

**Files:** create `packages/schema/asset-provenance.schema.json`, `cdom.v0.4.schema.json`, `src/asset-rights.ts`, `src/asset-hash.ts`, generated provenance/V4 types, `fixtures/asset-rights-cases.json`, `tests/asset-rights.test.ts`; modify `src/index.ts`, `src/commands.ts`, `scripts/generate-types.mjs`, `command.schema.json`; create `apps/api/app/asset_rights.py`, `tests/test_asset_rights.py`; modify `apps/api/app/contracts.py`, `apps/web/src/lib/snapshot.ts` and its compatibility test; update the API health expectation for0.4 support.

**Produces:** the exact record types, command args, hashing/policy functions above and exact-version0.4 document validation. Validators reject malformed/duplicate consent/evidence records, unsafe paths, nonportable values and bounds without mutation. No storage, API or UI yet.

- [x] Write TS/Python failing tests: legacy private allowed/public denied; ledger denial overrides legacy; unknown rights blocked; consent/use incompatibility; evidence tampering/duplicates/unsafe paths; old versions reject new fields;0.4 validates; SHA256 known vectors and shared SVG payload digest.
- [x] Run focused Vitest/Pytest, record the missing-feature RED results.
- [x] Implement the shared schemas/types, bounded pure policy and matching deterministic hashes. Regenerate types using the existing generator; preserve old generated document types.
- [x] Run focused tests, existing schema/API suites and generated drift checks. Record GREEN evidence. Review Task1 against spec and quality before proceeding.

## Task 2: Immutable evidence, audited commands and portable export

**Files:** create `apps/api/app/asset_evidence.py`, `asset_commands.py`, `tests/test_asset_evidence.py`, `tests/test_asset_rights_api.py`; modify `commands.py`, `stage_commands.py`, `audio_commands.py`, `repository.py`, `main.py`, `linter.py`, `player_manifest.py`; extend `packages/schema/player-manifest.schema.json`, `src/player-manifest.ts`, its generated type and shared manifest tests; add new shared rights-manifest fixtures without modifying originals.

**Consumes:** Task1 types/functions. **Produces:** contained evidence storage, command/inspection API and validated1.1 manifests. Evidence files are immutable and branch references determine access. A derivative URI change leaves prior provenance stale until reviewed; setAssetEvidence refreshes its current hash and lineage parent, retaining original identity. All earlier operations preserve0.4. Include asset ID in changed/invalidation receipts.

- [x] Write failing isolated API/domain tests for reviewed correction/replay/conflict/no-op/undo/redo/restart/fork, original bytes, malicious/missing/corrupt evidence and media, derivative staleness and older tension commands preserving0.4.
- [x] Write failing shared/player tests for private/public/commercial decisions, exact historical evidence, tampered evidence/payload rejection and legacy compatibility.
- [x] Run focused RED tests; implement immutable text storage with strict containment and standalone regular-file checks, exact human command, no-cache ledger route and permission-gated1.1 export. Surface incomplete provenance in diagnostics without preventing ordinary editing.
- [x] Run focused and broader API/schema suites, strict types and original preservation; record GREEN. Review Task2 spec/quality before UI integration.

## Task 3: Evidence review and export-use UI

**Files:** create `apps/web/src/components/assets/asset-panel.tsx`, `src/lib/asset-ledger-api.ts`, ledger proxy route under existing assets, focused frontend tests and `tests/e2e/asset-rights.spec.ts`; modify studio shell, player surface/WebM panel, player/manifest API/proxy, command draft types, shared studio styles and relevant tests.

**Consumes:** Task1 policy/types, Task2 command/inspection/manifests. **Produces:** Assets inspector and explicit-use JSON/WebM export with attribution/blocking recovery. Assets pauses preview/closes competing panels. Use existing design tokens and forms. Preserve dirty captured revision; review diff before Save evidence; no save or file write on draft/cancel. Evidence inclusion is disclosed before review/export. Do not expose raw file paths as editable uploads.

For WebM evidence retention, offer an explicit companion portable-JSON download
from the exact manifest/use captured for the completed video. Keep the existing
WebM encoding format; explain that the JSON carries evidence/attribution and should
be retained with the video. A use/scope change clears both prepared downloads.

- [x] Read installed Next guides, React best practices and Impeccable craft-floor before UI edits.
- [x] Write failing unit/browser tests for asset inspection, edit→review→save, cancellation, stale/unknown save recovery, export blocking→edit evidence recovery, attribution, public/commercial choice and offline bundle/WebM enforcement.
- [x] Observe RED, implement same-origin bounded identity-checked loaders/proxy and existing-style keyboard/mobile UI; run focused GREEN checks.
- [x] Run complete lint/typecheck/unit/API/schema/build/e2e/preservation checks sequentially where generated Next types conflict. Use isolated roots and record exact counts/skips.
- [x] Inspect desktop/mobile once in a batched pass, fix material findings once, confirm once; run one final Impeccable detector scan.

## Task 4: Final review, evidence and handoff

**Files:** update `README.md`, API/schema READMEs, `PRODUCT.md`, studio/player design briefs, `docs/tasks/task-10-verification.md`, `current context.md`; retain this plan as progress record.

- [x] Prepare a diff including tracked/untracked Task10 files, preserving the initial shared-library baseline. Dispatch one fresh whole-change reviewer against design/board, interfaces and review-focus list; fix material findings with RED→GREEN regressions.
- [x] Record actual final checks, limitations and no automatic legal clearance. Confirm regular user DB/media and original schemas/archives unchanged.
- [x] Update plan/context and report delivered behavior, evidence, integration state and Task11 as next separate request. No commit/push.

## Execution ledger

- User approved design; continuing implementation without another confirmation. Reusing current non-main feature checkout per approved design and desktop worktree guidance. Pending archive work stays intact.
- Exact interface conflicts reviewed:1→2 schema/policy/command shapes,2→3 inspection route/manifests and1→3 policy types align above. Commercial pack means redistribution permission. Old known-rights fallback applies only with no ledger.
- Shell-script bookkeeping is adapted to Node file APIs because RTK is blocked by host policy; source scripts remain untouched. Per-task tests/reports live under `.superpowers/sdd/2026-11-13-task-10-asset-rights/`. Commit steps are omitted to preserve the user's integration preference.
