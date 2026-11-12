# Task 07 — Aspect-ratio & player Implementation Plan

> **For agentic workers:** Implement the fixed interfaces below test-first. Independent backend/contracts and player workers own disjoint files; root owns composition, editor, proxies and acceptance. Leave all changes uncommitted.

**Goal:** Edit saved9:16 compositions, inspect subject-safe bounds, play the same saved manifest independently, and export/reopen a portable JSON bundle offline.

**Architecture:** Reuse existing `shot.layoutOverrides['9:16'].layerTransforms`; no document version or startup migration. A typed human command replaces/removes one shot's portrait override atomically. Pure composition evaluates overrides with keyframes for both studio/player. A revision-bound read-only manifest embeds sanitized SVG trees and bounded WAV data outside the unchanged canonical document; JSON is the initial portable bundle format, as allowed by master-plan4.1/8. A separate player route loads that exact manifest or a locally opened export, sharing renderer/playback/audio code and requiring an audio gesture.

**Stack:** Existing Next16/React/TS, FastAPI/SQLite, Three.js/SVG/WebAudio, shared schemas. No new dependency, model call, public publishing, ZIP parser or video export (Task08).

**Spec:** Kit CODEX_TASKS Task07; full AETHER_DOM_MASTER_PLAN especially4.1/6/8/11; root/kit/web AGENTS; current context, PRODUCT, selected design and studio brief. Clean Task06 baseline32912ca, user committed/pushed;585 tests passed/1 legacy hostskip. Reuse suitable checkout, branch feat/task-07-aspect-player; no commit/push/merge.

## Decisions and interfaces

- Preserve original kit, document0.1/0.2/0.3 schemas/types/fixture, source media, landing and archives. Override edits fit every existing document version and retain it. No SQL migration.
- Public command0.6 `setShotLayoutOverride`, shot target, args `{aspectRatio:'9:16',layerTransforms:Record<string,Transform>|null}`. Full five-field transforms, finite values, positive scale, max64 entries, all targets uniquely owned/listed by the shot. Null removes only portrait override. Replacement is atomic, expectedRevision checked, exact snapshot inverse, changed IDs include shot and before/after layer IDs. No-op rejects. No new AI proposal permissions.
- Aspect selection is temporary, defaults to camera aspect. Portrait uses saved override where present; others inherit base. Animation uses override plus authored keyframe-minus-base translation/rotation/depth, and multiplicative scale ratio. Full scene/layers/assets stay unchanged. Studio drag/nudge/depth in portrait saves the override map; the portrait inspector edits exact values explicitly, never base transform. Switch cancels ephemeral drags; Save/Cancel retain captured revision and never silently rebase.
- Guides inset5% horizontally/10% vertically. Pure bounding-box checks include rotation/camera/depth. Missing/nonfinite/hidden/unsafe subject state reports unavailable or outside guidance; never claims all possible animation is safe. `Fit subjects` explicitly reviews a draft that packs visible character sprites in reading order inside safe bounds at time0 using source viewBoxes, shrinks uniformly only as needed, preserves depth/rotation. Save is required. Backgrounds may crop; unsupported rigs/text semantics are not optimized.
- `PlayerManifest`: `{manifestVersion:'1.0.0',document:CdomDocument,assets:PlayerAsset[]}`. PlayerAsset union `{assetId,kind:'svg',svg:SvgAsset}` or `{assetId,kind:'audio',mimeType:'audio/wav',dataBase64:string}`. Exactly one entry per asset used by shot-owned layers/tracks; no unrelated files. SVG identity/URI must match saved metadata. Audio must match referenced audio asset and decode to existing bounded PCM16 WAV constraints. Unique document IDs/membership/references required for export/play; clear422 for missing/unsupported/unknown-rights media. Canon remains exact, with embedded media only in manifest wrapper.
- Whole UTF8 JSON manifest≤32MiB, assets≤64, each audio≤8MiB; finite numbers/scalar text/depth≤32/tree≤200000 nodes checked before recursive validation. Raw parse must handle malformed JSON/deep payload safely. Base64 strict/canonical, validated WAV bytes before decode/play. Shared `validatePlayerManifest(value)` returns `{valid:true,manifest}` or `{valid:false,issues}`; public type `PlayerManifest` and helper `decodeManifestAudio(base64):ArrayBuffer` exported if useful. Reject unsafe SVG using existing validator, mismatched IDs/metadata, duplicate/missing/extra entries and invalid WAV. API uses same schema/semantic checks and conservative numeric byte allowance to avoid JS serialization overflow.
- GET `/api/v1/projects/{p}/branches/{b}/player-manifest?revision=N` returns manifest for exact saved revision (optionalN uses one captured head). No history/proposals/secrets in wrapper. GET same path with `download=1` sends attachment `aether-dom-rN.cdom.json`, same validated object/no-store. Assemble from one immutable snapshot, reuse safe asset readers, no canonical or export-job writes. Reads never fetch network URIs. Server/client errors actionable.
- Next fixed proxy mirrors manifest query, rejects invalid/extra query or identity segments, streams bounded32MiB and preserves errors, no-store; server-only origin.
- `/player` loads current seeded project's manifest; optional `revision` pins saved snapshot. Aspect selector16:9/9:16, shot selector, Play/Pause/seek, explicit Enable audio, status/error/retry/empty states, link back to studio, local JSON open. Local JSON player uses only embedded assets and never contacts API for media. Reopening replaces/cleans up clock/audio/assets; no canonical write controls. A file remains local. JSON download is an explicit user action; no automatic export/public publishing.
- Studio header Player and Export JSON actions bind current saved revision and disclose drafts are excluded. Export uses same manifest as player. Readable player lets scene lead with quiet charcoal/sage controls and responsive portrait frame,44px touch targets, reduced-motion aware glow. No lore interactions/choices invented.

## Ownership and tasks

### A — Backend and shared contracts

Own `packages/schema/**` (except root may consume exports), `apps/api/**`. Add command contract/operation and tests. Create manifest schema/generated types/validator including strict audio decoder shared with client. Export `PlayerManifest`, `validatePlayerManifest`, `decodeManifestAudio`. Implement manifest builder and fixed API endpoint. Preserve generated original document files. Existing command typing in web is root-owned.

- [x] RED missing override operation: exact override-only edit, membership/foreign/ambiguous refs, invalid floats/scale/count, null removal/no-op, stale/replay/restart and exact undo.
- [x] Implement typed operation with existing private snapshot inverse; retain original version and other aspect maps/base layers.
- [x] RED manifest: exact revision/export-download agreement, portable SVG/audio, later edits cannot change old manifest, no DB writes, local path/rights/type/size failures and invalid references.
- [x] Implement snapshot-based bounded assembly and semantic schema validator; strict WAV/base64/identity/structural limits. Shared safe/unsafe fixture cases in TS/Python.
- [x] Run API/schema tests, lint/types/drift; report RED/GREEN and ownership complete. No userDB writes.

### B — Independent player

Own only new `apps/web/src/app/player/**`, `components/player/**`, `features/player/**`, `lib/player-api.ts` and focused `apps/web/tests/player*.test*`; root owns proxies/shared composition and audio hook parameter extension.

Consume A's manifest exports and root's `features/stage/composition.ts` functions `composeLayers(layers,shot,aspect):CdomDocument['layers']` and `compositionCamera(shot,aspect):StageCamera`. Compose returns copied layers whose base and keyframes implement override deltas, so existing renderer/audio evaluation uses them unchanged. Root extends `useAudioPreview(playback,settings,dependencies?:AudioDependencies)` to use embedded audio loader. Asset states use `assetKey`.

- [x] RED player manifest client and pure loading tests; reject mismatched route revision/project/branch and malformed/oversized input.
- [x] Implement bounded client load/open/export helpers. `loadPlayerManifest(projectId,branchId,revision?,signal?)` →Promise<PlayerManifest>; `readPlayerFile(file:File)` →Promise<PlayerManifest>; use same validator. Studio uses the shared loader, then a local Blob download with busy/error feedback.
- [x] Implement `/player` with independent mounted loader/session, shared GpuStage/SvgContent/clock/audio, composed document for aspect, exact revision labels, shot/aspect/seek/play/audio controls, local file open, loading/error/retry/empty. Never mutate canon. Preserve strict effect replay and teardown. Read web instructions, React skill/local Next docs and relevant Impeccable guidance before UI.
- [x] Focused tests/lint/types; report done without touching root/backend files.

### Root — Composition and editor integration

Own new `features/stage/composition.ts`, `components/stage/layout-editor.tsx`, tests, studio-shell/layer-stage/inspector integration, CSS, command union/receipt handling, fixed manifest proxy/routes, audio hook optional dependency, all e2e/docs.

- [x] RED pure override composition: no mutation/base untouched, portrait/static/keyframe delta math, 16:9 unchanged, rotation/depth bounds, deterministic subject fitting, incomplete assets/unfit states.
- [x] Implement `composeLayers`, `compositionCamera`, `subjectSafety`, `fitSubjects` with explicit failure results and finite arithmetic. Share studio/player.
- [x] RED proxy/client identities, query/size/error handling; implement fixed no-store endpoint only.
- [x] RED browser portrait control; integrate preview aspect, guides and exact portrait override form/Save/Cancel/Fit subjects/removal. Editing base inspector remains only in base view; portrait cannot accidentally submit a base transform. Audio and stage use same composed document; new save pauses playback.
- [x] Add Player/current-revision and explicit JSON export actions; temporary unsaved drafts excluded. Download and reopen exported manifest test with backend blocked to prove portable playback.
- [x] Full lint/types/unit/API/build/preservation, complete production desktop/mobile suite, development smoke. All mutation tests use isolated assets/DBs. One batched desktop/mobile visual pass and correction/confirmation completed; Impeccable detector returned no findings.
- [x] Fresh whole-branch read-only review; regressions for material findings. Update README/PRODUCT/studio/player surface/evidence/current context and plan ledger. Final preview uses current sources and user state unchanged; no commit/push/merge. NextTask08.

## Review focus

1. Portrait drags/nudges/inspector edits must not modify base or another shot/aspect, including stale drafts and aspect switches mid-drag.
2. Playback/keyframes, camera projection and audio emitter positions must evaluate the same composed snapshot in player/studio without canon writes or claimed universal subject safety.
3. Export reads one immutable revision and sanitized contained media; missing/unknown-rights/oversized assets fail atomically rather than yielding partial bundles or leaking files.
4. Locally opened hostile/deep/cyclic/nonfinite/unsafe SVG/base64/WAV input is rejected before rendering or decoding, with no remote/media request.
5. Replacing manifest/shot/aspect and development effect replay must tear down old audio/clock/async loads; imported file remains local and no project command is exposed.

## Execution ledger

Baseline32912ca clean,585 tests passed/1 legacy hostskip. User API was not running at start; record read-only SQLite fingerprint before implementation. Ruling: use portable JSON wrapper with embedded media as initial bundle format — master plan4.1 explicitly permits JSON before ZIP; avoids new archive/parser/runtime and supports a truly offline file reopen. Video remainsTask08. Existing checkout is suitable and developer prefers reuse; no additional worktree. Requested ordered task spec supplies direction/authorization; routine design/implementation choices recorded here without an extra approval pause.

Final ledger (13 November2026): original user state stayed revision6/history6/schema0.1.0/hash3a7fc9d7954c5b284c9d6215bf33daace4cef3ea9149b6f405e3bf4d740229ab. Backend404/shared109 tests pass; player11 focused tests pass. Root shared composition/proxy/editor RED→GREEN. Fresh review's two P2 findings fixed test-first: fit evaluated frame0 and guard an already-active aspect. Root clean-inspector/nudge and mobile footer/stage/padding regressions also fixed. Final production browser94/94 and development smoke5/5 pass; CI mirrors smoke. Final suite/lint/types/preservation evidence is in docs/tasks/task-07-verification.md. No commits/push/merge or user project commands.
