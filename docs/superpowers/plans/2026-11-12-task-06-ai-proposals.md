# Task 06 — AI Proposals Implementation Plan

> **For agentic workers:** Work test-first within fixed ownership. Backend persistence, pure proposal/contracts and UI workers run independently against the interfaces below. Root owns proxies/client boundaries, studio integration, browser acceptance and handoff. Leave all changes uncommitted.

**Goal:** Request a bounded offline proposal from selected canon, inspect its context/permissions/exact diff, approve or reject, and reject stale/invalid/out-of-scope results without changing canon.

**Architecture:** A local mock provider returns untrusted JSON behind a provider protocol. Pure parsing/scope/domain validation produces an immutable review record in a separate SQLite proposal table. Only a human approveProposal command can atomically apply its stored operations as one revision/undo/audit entry. The document schemas stay unchanged.

**Stack:** Existing Next/React/TypeScript/FastAPI/SQLAlchemy/Alembic/SQLite/AJV/jsonschema. No real AI SDK, cloud key, network model call or new runtime dependency.

**Spec:** Kit CODEX_TASKS Task06, master plan sections3–4/9–11, root/kit AGENTS, PRODUCT, selected design and studio surface. Clean baseline user Task05 commit34d4e35; branch feat/task-06-ai-proposals follows the user's feat/ preference. Reuse checkout, no commit/push/merge.

## Decisions

- Preserve original kit,0.1/0.2/0.3 document schemas/types, fixtures, media, landing and archive. No new document version or startup upgrade. Add only Alembic0002 proposal storage, preserving snapshots/history.
- Mock is clearly labeled an offline deterministic demo, not a language model. Three intents: repair_pose (selected character layer → lifting_with_right_arm), move_right (selected layer x+0.25), set_tension (selected shot →0.8). Request message is untrusted context; the mock follows the chosen scenario and does not interpret arbitrary instructions. Unknown intents/refusals/errors remain errors, never edits.
- Editable permission scope is explicit selected canon IDs, max8. Allowed operation permissions are explicit and bounded to setLayerTransform,setLayerPose,setLayerAppearance,setShotCamera,setShotTension. No imports, raw SVG, recovery/new entities, undo/redo, generic restore or export operations in proposals. Mock UI initially selects only the relevant intent permission; creator may change permissions before generating.
- Read context is bounded selected entities plus necessary referenced character/constraint/injury/recovery event nodes and owning shot. Never send unrelated casts/scenes, whole document, raw media, environment or history to the provider. Context contains project/branch/base revision, read nodes, editable scope and operation permissions, intent and message marked as data. Show exactly these context nodes/IDs in the review panel. Bound context UTF8≤64KiB, nodes≤32, parsed nesting≤16.
- Provider JSON UTF8≤32KiB, strict duplicate-key/NaN/Infinity/Unicode/depth rejection; max8 operations, bounded explanation/evidence. Validate shared structural schema, whitelist, target scope/kind, unique refs and domain invariants. Evidence IDs must belong to the provided read context. Provider cannot choose trusted IDs/revision/status/permissions/model identity/cost.
- Preview dry-runs operations on a copy of the captured snapshot. Reject no-op or invalid batches. Server derives before/after diff entries for changed authored fields, with beforePresent/afterPresent for absent fields; report schema version change separately. Values/paths/explanation render as text, not executable markup. Pose is metadata, not automatic sprite rigging.
- Proposal record includes its complete immutable scope, context digest, request, provider/model/cost, operations and diff. Review status is pending_review/approved/rejected. Staleness is derived from baseRevision vs current head; no silent rebase. Creator reloads and generates a new proposal against current canon.
- Generate/list/reject never change branch revision, snapshots or undo stacks. Creation reads the snapshot, calls provider outside write lock, then verifies head again before inserting. RequestId retries return the same immutable proposal; conflicting request-ID reuse rejects. An approved/rejected decision persists across reload/restart.
- Approve uses new public human command approveProposal targetId=proposalId,args={}; expectedRevision must equal both proposal base and current branch head. Under one SQLite write lock, load server-stored proposal, revalidate scope/operations/diff, apply atomically, record proposal provenance in receipt, update status and write one revision/undo record. Never accept browser/provider-supplied replacement operations at approval. Direct approveProposal through /commands is the same explicit approval gate. Internal restore snapshots support exact batch undo/redo; public restores remain forbidden.
- Same command-ID approval replay returns original result even after later edits; a different approval command for a decided proposal rejects. Reject is idempotent for already rejected proposals and rejects approved ones. Undo restores canon but keeps the historical approval decision/receipt; there is no hidden reapproval on redo.
- New panel opens in inspector via Proposals header control, pauses preview and closes audio inspector. Request form chooses current selected layer or shot and explicit op permissions. History of latest20 proposals supports reload/review. Show base/current revision, mock provenance/zero cost, context, permission scope and readable field diffs. Approve/Reject are explicit, with busy/stale/error/empty/retry states; generation/rejection are separate from command save state. Existing stage size, audio and manual editing remain intact.

## Public contracts

ProposalRequest:
```
{requestId:string,expectedRevision:number,scopeIds:string[],allowedOps:ProposalOpName[],intent:'repair_pose'|'move_right'|'set_tension',message:string}
```
ProposalOperation is a strict union of the five whitelisted existing op/targetId/args shapes. No command envelope fields inside operations.

Proposal:
```
{proposalId,projectId,branchId,baseRevision,agentRole:'lore'|'visual'|'acoustic',
 scopeIds,allowedOps,intent,message,operations,evidenceNodeIds,explanation,
 contextNodes:[{id,kind,value:JSON}],contextDigest,
 diff:[{entityId,path,before:JSON,after:JSON,beforePresent:boolean,afterPresent:boolean}],
 schemaVersionBefore,schemaVersionAfter,provider:'local_mock',modelVersion,
 estimatedCost:{amount:number,currency:'USD'},previewRef:null,
 status:'pending_review'|'approved'|'rejected',createdAt,reviewedAt:string|null,reviewedBy:string|null,approvalCommandId:string|null}
```
All listed fields required, bounded strings/arrays/JSON. Diff paths are entity-relative readable paths (e.g. transform.x,pose,audio.tension) rather than misleading array JSON pointers. No top-level before/after full document.

Shared exports: Proposal,ProposalRequest,ProposalOperation,ProposalOpName plus validateProposal(value)->{valid:true,proposal}|{valid:false,issues}, validateProposalRequest(value)->{valid:true,request}|{valid:false,issues}. Public command schema0.5 adds approveProposal with empty args and existing human-only envelope; document health remains0.3.

REST (branch-scoped):
- GET /api/v1/projects/{p}/branches/{b}/agent-proposals →{proposals:Proposal[]} latest20.
- POST same path with ProposalRequest →Proposal.
- POST /agent-proposals/{proposalId}/reject with JSON{} →Proposal.
- POST existing /commands with approveProposal →normal CommandResult, receipt op approveProposal,targetId proposalId, optional proposal provenance fields (may include proposalId/provider/modelVersion/approvedBy) retained in immutable audit. Existing TS receipt validation permits this op without weakening others.

Next proxies expose only fixed paths and enforce same-origin JSON for POST. No generic URL proxy. All responses no-store. UI compares trusted response project/branch/base/scope/request fields to its captured request before displaying approval.

## Ownership

### Worker A — Persistence and API

Own apps/api/app/repository.py,main.py,persistence/tables.py,new migrations/versions/0002_agent_proposals.py, new proposal_repository.py helper if useful, API proposal tests and API README. Do not modify domain provider/schema/web files owned by others.

Integrate WorkerB functions. Repository constructor/create_app accept optional proposal_provider for tests, default MockProposalProvider. Methods list_proposals(project,branch)->list[Proposal]; create_proposal(project,branch,value)->Proposal; reject_proposal(project,branch,proposalId)->Proposal. execute handles approveProposal as described, under current transaction. Extract execute-in-transaction helper only if it reduces duplication while preserving every old history/replay test.

Store proposal_id PK, project_id,branch_id,request_id UNIQUE, request JSON, record JSON. Decisions atomically update record; approval also updates canonical tables. Migration adds only this table. Rejection/creation do not store anything in canonical snapshots. Use internal restoreStageSnapshot forward/inverse from exact before/after and union changed IDs for one-command batch. No database/media writes outside temp tests.

### Worker B — Shared contracts, provider and pure domain

Own packages/schema/**, apps/api/app/proposal_domain.py,proposal_provider.py, related pure API/schema tests, schema README. Do not edit repository/main/persistence/web.

Export Protocol ProposalProvider with name:str,model_version:str, generate(context:dict)->str; MockProposalProvider implements local deterministic intent outputs. No network. Root/provider tests may inject invalid/forbidden/stale payload adapters via create_app.

Domain exact interfaces:
- validate_proposal_request(value:object)->dict; strict shared request schema/portable bounds.
- build_context(document:dict,request:dict)->dict; read permissions/context as above.
- prepare_proposal(document:dict,request:dict,provider:ProposalProvider)->dict: returns trusted draft fields **agentRole,operations,evidenceNodeIds,explanation,contextNodes,contextDigest,diff,schemaVersionBefore,schemaVersionAfter,provider,modelVersion,estimatedCost,previewRef**. Does not choose proposal/project/branch IDs, request/scope/status/timestamps (WorkerA fills them). Bounded parse and copy-only dry run.
- apply_proposal(document:dict,proposal:dict)->tuple[dict,list[str]]: revalidate stored batch/permissions/evidence against current base, dry-run and verify stored diff/schema versions match exactly. Returns copy+changed IDs, no writes. Raises existing CommandError422 for invalidscope/provider/domain,409 for base mismatch. Unknown provider exceptions become safe typed errors, not success drafts.

Generate shared schema/types and export validators above; add approveProposal command0.5 and generated types. Do not add command apply_operation support for approveProposal (repository gate owns it); no public generic batch.

### Worker C — Review panel

Own only apps/web/src/components/proposals/proposal-panel.tsx and new focused component test. Read ImpeccableOperate/craft-floor, relevant Next client docs and React skill before UI. Root owns CSS/API/client integration.

Export ProposalPanel props:
```
{document:CdomDocument,layerId:string|null,shotId:string|null,busy:boolean,blocked:boolean,
 run:(operation:CommandOperation,reason:string,expectedRevision?:number)=>Promise<boolean>,onClose:()=>void}
```
Root supplies lib/proposal-api.ts exports loadProposals(document,signal?):Promise<Proposal[]>, requestProposal(document,request,signal?):Promise<Proposal>, rejectProposal(document,proposalId):Promise<Proposal>. Shared types fromB. Root adds approveProposal CommandOperation.

Labels: section AI proposals; button Generate proposal; Scope (select selectedlayer/shot); Mock scenario (repair_pose/move_right/set_tension); Request message textarea; permission checkbox labels Allow setLayerTransform etc; Approve proposal; Reject proposal; Refresh proposals; Close proposals. Clearly label Local mock provider. No selection →shot scope available; empty/no validselection →disabled Generate with guidance.

Default scenario repair_pose for character layer, move_right for other layer, set_tension for shot. Scope changes reset relevant intent/permissions intentionally, never retarget an existing displayed review record. At first Generate capture exact revision/scope/ops; async late responses suppressed on unmount/request generation. Do not let refreshed document rebase the stored proposal; comparebase and disable Approve if stale, explain reload/regenerate. All errors/rejections leave document unchanged. Successful run approveProposal passes proposal.baseRevision, then refresh proposal list. Review records persist server-side. Request retry/unknown outcome must not invent approval success. No raw innerHTML, response parsing in UI, new framework or hidden model calls.

## Root implementation and verification

- [x] Baseline clean at34d4e35;505 tests pass/1 legacy hostskip. User database revision6/history6/schema0.1 hash3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab recorded. Branchcreated only.
- [x] Pure/domain/backend workers record missing-feature RED→GREEN; contract/provider invalid JSON, scope escape, duplicate keys, Unicode, bounds, no-op/domain error, transactional batch, restart/replay/stale/concurrent approval and exact undo covered.
- [x] Root client/proxy tests RED then implement fixed API boundaries and identity/request/diff validation. Integrate approveProposal union/receipt and loader reuse.
- [x] Root studio header/inspector integration, pause preview on open, preserve audio/manual editing and responsive controls. Update relevant current design/product docs.
- [x] Browser RED before UI then generation no canon write, reject no write, approve exact displayed diff, reload/history/undo, stale proposal reject/regenerate, deniedpermissions, mock/error/empty and desktop/mobile no-overflow. No userDB commands.
- [x] Full lint/types/unit/API/build/preservation, production browser and development effect smoke; one batched visual pass/correction/confirmation. Native browser CUA outcome summary recorded.
- [x] Fresh read-only whole-branch review and regression fixes; final evidence/context and running preview. No commits/pushes/merges; nextTask07.

Final evidence (13 November2026):585 unit/API tests passed,1 legacy host skip;84 production desktop/mobile cases and3 development smoke cases passed; lint/types/drift/build/preservation clean. Whole-branch findings and numeric wire-bound follow-up fixed with shared regressions and reviewer confirmation. See docs/tasks/task-06-verification.md. User revision6/hash unchanged. All Task06 changes remain uncommitted on feat/task-06-ai-proposals.

## Review focus

- Approval/rejection races, duplicate network retries and later undo must never apply twice or confuse persisted decisions with current canon.
- Stale server/client responses or changed selection/permission state must not silently expand scope or approve operations the creator did not inspect.
- Provider JSON is hostile: duplicate keys, deep/nonfinite/Unicode payloads, scope escapes, forbidden ops and prompt injection stay inert and rejected.
- Preview dry run and approval revalidation must match exactly including absent fields/schema upgrade; one invalid op rolls back the entire batch/status/history.
- Migrations, old histories, initial runtime/audio/large-stage behavior and preserved user revisions must survive the new side-table without any automatic content rewrite.
