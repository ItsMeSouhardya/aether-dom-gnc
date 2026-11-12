# Creative document contract

`cdom.schema.json` is the canonical JSON Schema 2020-12 for `.cdom` version **0.1.0**. It and `fixtures/sample.cdom.json` are unchanged copies of the supplied kit. Both AJV (TypeScript) and jsonschema (Python) use this exact schema. Neither validator coerces, repairs, or mutates documents.

```powershell
pnpm --filter @aether-dom/schema test
pnpm --filter @aether-dom/schema types:generate
pnpm --filter @aether-dom/schema types:check
```

Import `validateCdom(value: unknown)` from `@aether-dom/schema`. It returns `{ valid: true, document }` or `{ valid: false, issues: [{ path, message }] }`. Generated `CdomDocument` types are checked in; never edit them manually. `types:check` detects schema/type drift without rewriting files. The web app validates untrusted API JSON before reading fields. Both languages reject NaN and infinity, including overflow decoded from JSON numbers, without replacing them or mutating the input.

The Python boundary is `apps/api/app/contracts.py`: `validate_document(document)` returns issues; `load_fixture()` returns fresh validated fixture data. Both suites consume `fixtures/invalid-cases.json` to pin shared rejection behavior.

This preliminary schema checks **structure**. It does not resolve IDs, enforce branch consistency, inspect referenced asset files, evaluate bindings, or diagnose continuity. The intentional left-arm contradiction is valid structurally and remains unchanged. The `spatial.x` binding target describes later runtime behavior; it is not an authored field to inject into the fixture. Runtime/UI state never becomes canon by passing through this viewer.

The schema's `$id` is an identifier, not a hosted endpoint or runtime network dependency. Validators load the checked-in file. The fixture includes asset URI metadata; actual SVG/audio assets are not supplied by this task.

For a future document-contract change: preserve originals, assign a new schema version, document compatibility, introduce an explicit migration, regenerate types, and add success/failure fixtures in both languages. Task 02 leaves the supplied document schema and fixture unchanged.

## Commands — Tasks 02–03

`command.schema.json` separately defines command version **0.2.0**. Existing Task 02 envelopes/operations remain valid. Import generated `CdomCommand` and `validateCommand(value)` from this package. It returns `{valid:true, command}` or `{valid:false, issues}`. Both languages use this schema and additionally reject unpaired Unicode surrogates before persistence/serialization. Valid supplementary characters are preserved. Generation/drift checks cover document, commands and analysis.

Every command requires `commandId`, `projectId`, `branchId`, `expectedRevision` (nonnegative safe integer), a human actor `{kind:'human',id:string}`, `op` and `reason`. `setLayerTransform` also requires stable `targetId` and nonempty partial `args` drawn from `x`, `y`, `z`, `scale` and `rotationDeg`. Values must be finite; scale must be positive. `undo` and `redo` have no target/args. Unknown fields and agent actors are rejected. This envelope is a local attribution record, not authentication.

`setLayerPose` requires a character-layer target and `{pose:string|null}`. `recordConstraintRecovery` targets a limb-injury constraint with `{eventId,sceneId,order,description}`. It creates a physical-recovery event, appends its scene membership and links the constraint atomically. The event ID must be globally unused; its order must be unique, a safe integer and later than the injury. Equivalent integral JSON numbers such as `2.0` follow integer semantics. Undo removes the event/membership and restores the prior constraint exactly; existing Task 02 transform inverses remain supported.

The API checks branch/target identity and revision, validates the resulting `.cdom`, then atomically persists a snapshot, immutable audit/forward/inverse records and undo/redo stacks. Conflicts return 409 without writing. Exact command replay preserves its original committed document/receipt/history; derived analysis may reflect current asset availability. New edits clear redo without erasing audit. Original document schema/fixture bytes stay unchanged.

## Derived analysis — Task 03

`analysis.schema.json` version **0.1.0**, generated `DocumentAnalysis` and `validateAnalysis(value)` describe revision-bound issues/evidence, nodes/edges/cycles and command invalidation. The validator also rejects duplicate graph/issue identities, dangling edges and unknown evaluated nodes. Changed IDs may name entities removed by undo. The web additionally checks analysis revision and graph identities against its document.

Graph edges point from dependency to dependent; forward/reverse indexes and iterative traversal produce deterministic ordering. Impact excludes changed roots, while evaluation includes existing roots and their evaluable dependents. Invalidation traverses both adjacent revision graphs so removed edges still invalidate prior consumers; only current nodes are evaluated. Global cycle IDs appear on graph; invalidation lists affected cycles. Cycle-blocked descendants are omitted from evaluation order. This computes impact, without evaluating bindings into canon.

## Stage extension — Task 04

`cdom.v0.2.schema.json` adds optional layer `name`, `visible`, `opacity` (0–1), and `keyframes` (up to 128 `{id,timeMs,transform}` records), plus asset `name` and `sourceUri`. `validateCdom` and Python choose the exact schema by authored version: 0.1.0 documents reject extension fields. The original schema, fixture and `cdom.generated.ts` remain unchanged. `CdomDocumentV1` and generated `CdomDocumentV2` remain exported. Validators neither upgrade nor mutate input. Accepted new stage commands perform a lossless copied 0.1.0→0.2.0 upgrade, preserving later versions; undo restores prior optional-field presence and schema version. No SQL migration or automatic startup upgrade is needed.

Command contract **0.3.0** retains old operations and adds `setShotCamera`, nonempty partial `setLayerAppearance`, `importSvgLayer`, `editSvgElement`, `setLayerKeyframe`, and `deleteLayerKeyframe`. Camera bounds, all five keyframe transform fields, rights/name bounds and public-operation allowlists are structural checks. The command domain enforces shot-duration limits, globally unused import/keyframe IDs, unique frame times, safe editable SVG attributes, and target identity. Trusted stored restoration operations are never public commands.

`svg.schema.json` and `validateSvgAsset` describe bounded, sanitized SVG JSON, never source HTML. Exports are `SvgNode`, `SvgData`, and `SvgAsset` (`SvgData` plus `assetId`, `uri`, `sourceUri`). The client checks a maximum of 512 nodes/depth 16 before recursive validation, positive finite viewBox dimensions, portable text, unique source IDs, UTF-8 size bounds, and whitelisted tags/attributes with finite numeric and safe presentation values. IDs remain source identities; renderers scope DOM IDs separately. The API rejects unsafe XML, unsupported SVG and unsafe storage paths. Only canonical revision-bound asset references can be read; originals and unreferenced rollback blobs are never served.

Nested keyframes are canonical entities in graph/analysis identity coverage, with `keyframe → layer` dependencies. Frame deletion and undo retain removed IDs in receipts/invalidation while current graph nodes describe only the returned revision.

The linter recomputes from the supplied snapshot and injected asset inventory. It checks reference identity/membership, binding paths/ranges/cycles, physical constraints and ordered-event validity. Known poses are standing and lifting with the left/right arm; other semantics disclose limited coverage. Shots follow the maximum order of their scene events. Recovery never retroactively clears an earlier scene. File probing is restricted to the actual workspace assets directory and contained descendants; redirected roots, traversal and escaped links are rejected, and remote URIs are never fetched. Forbidden-term matching is an unsaved local draft check; no dialogue field is added to the document.

## Audio extension — Task 05

`cdom.v0.3.schema.json` adds only optional `shot.audio:{tension:number}` with tension from 0 through 1. Audio objects require tension and reject additional fields. Earlier 0.1.0/0.2.0 schemas reject this field and remain unchanged, as do their generated types. Public `CdomDocument` uses the V3 optional shape with version `'0.1.0' | '0.2.0' | '0.3.0'`; generated `CdomDocumentV3` is also exported. Exact-version validation never adds fields or upgrades documents.

Command contract **0.4.0** retains existing operations and adds `setShotTension`, with a shot `targetId` and `{tension:number}` from 0 through 1. The domain requires an existing globally unique shot; normal expected-revision, validation, dependency invalidation and audit rules apply. Successful saves losslessly upgrade a copied document to 0.3.0. Private snapshot inverses preserve exact prior schema and optional-field presence through undo/redo/restart. Stage commands preserve 0.3.0. Playback gains, tension drafts, panning and analyser values are derived runtime data and never enter this field or canonical state automatically.

## Creator-reviewed proposals — Task 06

`proposal-request.schema.json`, `proposal-payload.schema.json` and `proposal.schema.json` separate creator permissions, untrusted provider output and trusted review records. Public exports are `ProposalRequest`, `Proposal`, `ProposalOperation`, `ProposalOpName`, `validateProposalRequest(value)` and `validateProposal(value)`. Requests have an immutable revision, one through eight unique selected layer/shot IDs, explicit allowed operations, one deterministic scenario, a request ID and an optional message of up to 2,000 Unicode characters. An 8 KiB UTF-8 request limit applies in both languages.

The five proposal operations are `setLayerTransform`, `setLayerPose`, `setLayerAppearance`, `setShotCamera` and `setShotTension`. Their argument shapes reuse the public command contract. Provider JSON contains only operations, evidence IDs and explanation. Trusted IDs, revision, scope, provenance, cost and decision fields cannot be supplied by the provider. The local mock is an offline deterministic demonstration; it interprets only the selected scenario and does not call a language model or interpret message instructions.

Context contains selected entities and necessary owning-shot, character, constraint and injury/recovery-event nodes. Context is limited to 32 nodes and 64 KiB; provider responses to 32 KiB and eight operations. Unicode scalar text, finite numbers, duplicate JSON keys, maximum depth 16 and structural bounds are checked before recursive schema validation. Shared record validation bounds total UTF-8 size to 128 KiB and 4,096 visited values, and verifies context identity, evidence membership, operation permissions, diff targets and decision consistency. Freeform explanations and values remain text data.

The structural budget counts each array value once and counts object keys as well as values in both runtimes. Shared array-heavy and metadata-boundary fixtures pin cross-runtime acceptance. Preview acceptance reserves the maximum serialized width of final identity, timestamp and review strings within the same record budget, including JSON escaping. `validate_proposal_record` also checks actual final records before persistence, so metadata errors roll back creation and review decisions.

Python additionally reserves 16 UTF-8 bytes per finite JSON number in every bounded request, context, provider payload and review-record check. This conservative wire allowance covers JavaScript expanding Python exponent notation into longer decimals after decoding, such as `1e+20` becoming `100000000000000000000`. It uses the existing byte limits; it does not increase them. A shared numeric boundary fixture proves that an oversized JavaScript record is rejected server-side while a smaller array-heavy numeric record remains accepted by both runtimes.

Pure API validation dry-runs on a copied base snapshot and rejects invalid targets, permission escapes and no-op batches. Diff entries name entity-relative authored fields such as `transform.x` and `audio.tension`, with explicit before/after presence flags. Schema changes are reported separately. Approval rebuilds the captured context and verifies its digest, evidence, operations and exact diff against the unchanged base. Proposals are stored separately from canonical `.cdom`; generation and rejection do not create revisions.

Command contract **0.5.0** adds only `approveProposal`, with a proposal `targetId`, empty `args`, explicit human actor and expected revision. The repository loads the stored proposal and applies its batch atomically as one undoable revision. Browser-supplied replacements and public snapshot restores remain forbidden. Document schemas and existing command operations are unchanged.
# Portable player manifests

`player-manifest.schema.json` defines the version1.0.0 media wrapper. Its `document`
is validated separately against the preserved0.1/0.2/0.3 canonical schemas. Import
`PlayerManifest`, `validatePlayerManifest`, `parsePlayerManifest`, and
`decodeManifestAudio` from `@aether-dom/schema`. Prefer `parsePlayerManifest` for
untrusted raw JSON: it checks UTF8 size and nesting before parsing. Validation
never repairs or mutates input.

The wrapper embeds exactly the SVG/audio assets referenced by shot-owned layers
and tracks. It rejects ambiguous IDs, invalid membership/references, unsupported
layers/media, unknown rights, mismatched SVG metadata, unsafe SVG, and noncanonical
base64 or invalid PCM16 WAV. Shared limits are32MiB per JSON manifest,64 assets,
8MiB per WAV, depth32, and200000 JSON nodes. WAV retains the existing mono/stereo,
8–48kHz,16-bit, maximum30-second rules. Neither local imports nor validation reads
authored URIs. The shared fixture and case table exercise both TS and Python.

Command contract0.6 adds human-only `setShotLayoutOverride` with a shot target and
`{aspectRatio:'9:16',layerTransforms:Record<string,Transform>|null}`. Transforms
require all five fields, positive scale, and at most64 uniquely owned layer IDs.
Null removes the portrait override. Canonical document schemas stay unchanged.
