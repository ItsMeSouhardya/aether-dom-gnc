# Task 11 — Articulated character posing and canon-aware motion

The user requested implementation of Task11 from `aether_dom_codex_kit/TASKS PT2.md`
and selected a **Kael-inspired rig** as the original example. That board is the
scope authority; the implementation decisions below stay within its rigid-FK
slice. No Task12 integration, IK, skinning or provider work is included.

## Result

A creator adds one original articulated character as a separate saved layer,
selects a bone or attachment, previews a bone angle and an explicit semantic action,
then reviews/saves or cancels. Bone-angle keyframes animate through the existing
clock. The saved pose reproduces in both aspects, native preview, portable reopen
and browser WebM. Original Kael/Vance sprites and fixtures remain unchanged.

## Approach

Use a rig owned by its visual layer and one sanitized SVG source with named,
non-overlapping direct-child groups as attachment slots. All parts share the
source asset's exact bytes, provenance and export permission. This minimizes media
and authority changes while making each limb independently articulated.

Separate assets per limb would also work but add asset collection/rights/portable
reference paths without improving this small original example. GPU skinning would
require dynamic texture/mesh handling beyond the rigid task. Instead, rig scenes
use the existing native-SVG fallback; flat scenes retain their current GPU path.
This is an extension of the incumbent renderer, not another renderer.

The render plan evaluates rigid matrices before presentation. WebM serializes
rig SVG at each frame, retaining the existing static cache for flat sources. Raw
portable SVG and its evidence hashes remain unchanged; evaluated trees are derived
runtime values, never canonical assets.

## Authored contract

Document **0.5.0** adds optional `layer.rig`. Preserve0.1–0.4 schemas/generated types
and exact dispatch; never upgrade on reads. Successful rig commands upgrade only a
copied snapshot; inverse snapshots restore exact predecessor version/presence.

`Rig = {id, name, bones:RigBone[], attachments:RigAttachment[]}`.

`RigBone = {id, name, parentId:string|null, rest:{x,y,rotationDeg}, rotationDeg,
limb:string|null, action:string|null, keyframes?:RigBoneKeyframe[]}`.

`RigBoneKeyframe = {id,timeMs,rotationDeg}`.

`RigAttachment = {id,name,boneId,elementId}`.

Limits:1–32 bones,1–32 attachments,128 total bone keyframes per rig. Names are
1–80 nonblank scalar characters; stable IDs retain the existing1–128 scalar bound
and reserved-key rules. `limb`/`action` are nullable1–80 scalar strings. Rest x/y
are finite within±10000 SVG units; rest and authored/keyframed angles are finite
within±360 degrees. Frame times are nonnegative safe integers, unique per bone,
and within the owning shot. Rig/bone/attachment/frame IDs are globally unique
canonical entities. Require one root, valid parents, no cycles, valid bone slots,
unique source element references and a128-total budget.

The layer's existing `assetId` owns the SVG and `characterId` binds the depicted
character. A rig uses `kind:'character_sprite'`; reject inconsistent ownership,
ambiguous shot membership and unsupported source kinds. Attachment element IDs are
SVG source IDs, not new canonical IDs. Each must identify a direct-child `g` of the
SVG root; disallow a transformed SVG root to keep coordinates unambiguous. An
attachment's existing group transform is retained after the derived matrix.

Canonical document validation checks rig topology, IDs, ownership and timing.
Import/domain and portable boundaries additionally check actual sanitized SVG
attachment references. Invalid rig/source combinations fail before canonical writes
or portable acceptance. Renderer failures remain bounded and visible; malformed
data must not crash the editor or silently become a different pose.

## Pure evaluation

SVG coordinates use x right, y down; positive rig angles are clockwise. Rest
transforms are relative to the parent. Let `R(b)` be the accumulated rest matrix
and `P(b,t)` the accumulated posed matrix. For a source group bound to b, apply
`P(b,t) * inverse(R(b))` before its original source transform. At all-zero authored
angles this is the identity, preserving the original rest artwork and paint order.
Root attachment placement, layer/world projection and portrait overrides remain
outside the SVG bone evaluator.

Bone angles interpolate linearly, including through zero rather than implicit
shortest-arc rotation. Base angle acts at time0 unless a time0 frame replaces it;
hold the last value beyond the last frame. Layout evaluates the authored base
pose; Animate/player/export evaluate the requested playhead. Invalid/nonfinite
time is rejected; negative time clamps to0. Every matrix stays finite and the
bounded graph is evaluated iteratively/deterministically.

Shared TS `evaluateRig(rig,timeMs,animate=true)` and matching Python
`evaluate_rig(rig,time_ms,animate=True)` return
`{boneMatrices:Record<id,Matrix2D>,attachmentMatrices:Record<id,Matrix2D>}`;
`Matrix2D=[a,b,c,d,e,f]` follows SVG affine convention.
`validateRig(rig)` returns the standard valid/issues result;
`validateRigBindings(rig,svg)` validates actual slot membership.
`applyRigToSvg(svgAsset,rig,timeMs,animate)` returns a copied derived SVG asset and
does not mutate the source or canonical rig. Export these from the shared package
where callers can test the same interface. Share fixture matrices across runtimes
with tolerance1e-9; UI/runtime should not invent a second evaluator.

## Commands and original fixture

Command **0.8.0** retains all prior operations and adds:

- `importRigLayer`, shot target; args `{assetId,layerId,name,rights,characterId,svg,rig}`.
- `setRigBonePose`, bone target; args `{rotationDeg,action:string|null}`.
- `setRigBoneKeyframe`, bone target; args `{keyframeId,timeMs,rotationDeg}`.
- `deleteRigBoneKeyframe`, bone target; args `{keyframeId}`.

Every command remains human-only, revision-checked and reversible. Validate rig,
SVG, IDs and shot/character references before committing; no-op pose saves reject.
Provider/proposal operation permissions are unchanged. Import uses existing safe
SVG storage, preserving accepted original bytes and immutable sanitized versions.

Add new original `assets/fixtures/kael-articulated.svg` and
`kael-articulated.rig.json`, with original-source/rights documentation. The artwork
is a small editable geometric character in the incumbent visual vocabulary,
with torso/head and independently jointed arms; no tracing or alteration of the
old drawings. All animated parts have stable named groups. A fixed read-only
`GET /api/v1/fixtures/articulated-rig` returns bounded
`{templateVersion:'1.0.0',name,svg:string,rig:Rig}`. It reads only those checked-in
paths. The client validates shape/rig/bounds, remaps canonical rig IDs with a fresh
instance prefix, and submits the source to normal command validation. Raw SVG is
data, never injected into HTML before server sanitization.

The Add original rig affordance explicitly chooses shot and character (Kael by
default). It creates a new layer/asset and retains all existing IDs/artwork. It
does not run at startup or mutate the user's project without the action. Position
and scale use the established import fit; creator transforms remain editable.
Private export can use the known original-rights fallback without a ledger;
broader use still requires the existing explicit evidence review.

## Dependency and continuity behavior

Register nested rig, bone, attachment and bone-frame entities with actual JSON
pointers. Pose/frame edits return changed bone/frame IDs, not a whole-layer dirty
root that would invalidate sibling bones. Edges carry layer/source→rig→root bone,
parent bone→child, frame→its bone, bone→its slots and slots→owning shot. Avoid
slot→layer→rig cycles; normal layer→shot composition dependencies remain. Old/new
graph invalidation handles removed frames/undo. Changing a bone invalidates its
descendant bones/attachments and output consumers, never sibling bones.

Bone `limb` and `action` are explicit authored semantics, never inferred from
rotation. Supported action `lift` on `left_arm`/`right_arm`, associated through
layer.characterId, reuses existing injury/recovery chronology and evidence.
Angles alone do not claim lifting. Unspecified actions make no semantic claim;
unknown non-null semantics produce a limited-coverage warning. Contradictions are
soft, evidence-linked diagnostics and do not prohibit intentional story authoring.
Keep existing flat-sprite pose checks intact.

## Interaction and recovery

Extend the existing Operate inspector; no marketing/landing changes. A Rig panel
shows the bone hierarchy and attachment selection, base/local angle, explicit
limb/action, current time and authored bone keyframes. Controls use native labels,
current charcoal/sage/Manrope and touch targets. Selecting an attachment selects
its owning bone without mutating canon. Explain native rig rendering honestly.

Editing captures project/branch/layer/bone/revision. Preview is temporary and uses
the same evaluator; Cancel restores saved rendering. Review names before/after
angle/action; Save uses the captured revision. Freeze all draft controls while
busy. Stale/unknown saves use existing reload-required recovery and retain draft
text. If Undo removes the rig/bone/layer, preserve recoverable drafts until explicit
Cancel. Prevent competing drafts/inspector changes consistently with existing UI.
Keyframe add/update/delete are explicit reviewed actions, with finite time/angle
errors and exact undo. Seeking a saved pose does not create a command.

## Verification and handoff

Cover cross-runtime graph/matrix cases, parent-child rotation, unrelated siblings,
time0/interpolation/seek/hold, malformed IDs/topology/slots and frame budgets. Add
real API tests for import/pose/frames, conflicts/replay/undo/redo/fork/restart and
old-version preservation. Check linter injury inclusive start/exclusive recovery,
unknown semantics and evidence IDs. Rig parts must survive rights checks and
portable SVG integrity; offline tampering with a binding must fail.

Browser acceptance adds an actual rig, previews/cancels, saves/reloads/undoes and
authors a bone frame, verifies native SVG geometry changes at known times, checks
both aspects and a reopened portable file with API blocked, and records a real
WebM containing animated rig frames. Include stale, removed-target, keyboard and
narrow states. Compare rendered transforms/decoded frames, not only button text.
Use isolated DB/media roots; preserve regular revision28/media baseline and all
archives/old fixtures. Run final lint/types/tests/build/browser/preservation gates,
one bounded visual batch plus correction/confirmation, and one final detector.
User handles commit/push; Task12 starts only on a separate request.
