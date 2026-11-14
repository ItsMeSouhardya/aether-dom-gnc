# Task 10 — Asset provenance and export-use decisions

Status: approved by the user on 13 November 2026: “Go for it.” Implementation plan:
`../plans/2026-11-13-task-10-asset-rights.md`.

## Intent and scope

Implement Task10 from the kit board and its Tasks09–29 execution rules. A creator
can inspect an asset's original/current version, record rights evidence, review a
metadata correction and save it through an audited, undoable command. Export
checks explicitly distinguish private preview, public distribution and commercial
pack use. Decisions evaluate recorded claims; they do not establish ownership,
validate a legal instrument or publish anything.

Task04 imports already retain immutable original/sanitized SVG versions; source
edits replace the current URI without replacing originals. Existing asset IDs and
four rights labels remain. Task07/08 exports embed sanitized SVG and PCM WAV from
an exact saved revision. Unknown rights currently block portable export. Preserve
that behavior and all 0.1/0.2/0.3 documents and version1 player bundles.

## Approaches

**Recommended: revision-owned ledger records with immutable local evidence.**
Add an explicit document extension for authored provenance/permissions, committed
through the existing command repository. Each record binds to exact original and
current media hashes. Forks and historic exports naturally retain their evidence;
existing inverse snapshots provide exact undo. Evidence text lives in contained,
content-addressed storage and portable bundles carry the selected evidence.

**Alternative: a separate mutable rights registry.** This could avoid a document
extension, but forks, historic revisions and offline bundles would need a second
version/reference protocol. A later registry edit must never change what an older
revision claimed. That adds synchronization work without a benefit for this local
single-user slice. Keep SQLite's existing snapshots as the sole authored authority.

The user approved the recommended approach. No new renderer, external rights
service or runtime dependency is proposed.

## Authored records and compatibility

- Introduce a preserved-source document schema **0.4.0** with optional typed asset
  ledger metadata. Keep original schemas/generated types/fixture bytes intact.
  Loading/startup never upgrades documents. The first accepted rights command
  explicitly upgrades a copied snapshot; its review states the version change.
  Undo restores the exact prior version and optional-field presence.
- Preserve each asset ID, kind, rights label, original/source URI and current
  derivative URI. A ledger record has its own format version, original/current
  SHA256 values, creator/source description, license identifier/terms evidence,
  required attribution and three explicit permission states: allowed, denied or
  unknown, one for each export use.
- Include optional provider/model lineage and parent media-version identity.
  AI-generated status alone grants no public/commercial permission.
- Voice and likeness each have explicit applicability: not applicable, required
  or unknown. Applicable consent records name a subject, covered uses, status
  and supporting evidence; missing/incompatible consent blocks broader use.
  This task records consent and performs no voice generation or impersonation.
- A corrected evidence record replaces the asset's current authored record in a
  new revision; previous revisions and their evidence blobs remain immutable.
  SVG derivatives retain origin/lineage. A changed media hash cannot inherit an
  approval for different bytes silently: refresh the version binding and require
  explicit review of retained or changed permissions.
- Explicit migration retains the lossless source through the command's immutable
  predecessor snapshot/inverse. An inspection-only request creates no canonical
  migration, revision or history entry.

## Evidence storage and command boundary

Support bounded UTF-8 text evidence in this slice: license terms, creator/source
statements and consent summaries. PDF/image evidence parsing and external license
verification remain outside scope. The editor explains that portable files include
the saved evidence text; creators should record information suitable for sharing.

Store evidence under a dedicated content-addressed assets subdirectory, using
server-generated paths and SHA256 filenames. Accept text, not client filesystem
paths. Preserve earlier blobs, bound file/count/total sizes, and reject redirected
directories, traversal, links, mismatched hashes, malformed Unicode and missing
evidence. An abandoned/failed edit may leave an unreferenced immutable blob, just
as existing SVG staging does; it cannot mutate canon or expose arbitrary files.

A human-only typed command targets an existing asset and the captured revision.
The server validates identity, media hashes, complete permission/evidence records
and storage integrity before committing. Store exact forward/inverse data, audit
and dependency invalidation through the current repository. Reserved stored
restore operations remain private; AI proposal operation permissions stay unchanged.
UI drafts and evidence inspection never change creative canon.

## Policy and export behavior

- Private preview preserves legacy behavior: a known existing rights label can
  still export **only when no ledger record exists**, without inventing evidence.
  Once a ledger exists, its private-use permission, evidence validity and current
  media binding govern; denied, unknown, missing or stale records cannot fall back
  to the legacy allowance. This precedence is the implementer's call, clarified
  after the builder check. Unknown rights labels remain blocked; correcting the
  label is an explicit reviewed metadata edit, never a side effect of granting a
  permission. Local studio preview stays usable while evidence is incomplete.
- Public distribution and commercial pack use require explicit compatible
  version-bound permission, usable evidence, attribution when required and any
  applicable voice/likeness consent. Missing, denied, malformed or unknown claims
  block the requested use. Commercial pack use includes redistribution of assets,
  so general permission to display an asset is insufficient.
- A legacy rights label alone never grants either broader use. Changing a
  public-use permission does not change ownership classification automatically.
- Return per-asset blocking reasons, required attribution and the requested use
  bound to project/branch/revision/media versions. Check the complete set of
  assets that will actually be included in the export, including referenced audio.
- The server enforces decisions when assembling saved-revision portable media.
  Extend the portable wrapper with versioned evidence and the explicit use.
  Retain version1 compatibility. Shared TS/Python validation independently checks
  records, selected-use decisions and embedded evidence integrity; imported files
  cannot gain permission by editing a cached allowed flag.
- The read-only player shows the selected use/attribution. WebM generation checks
  the same recorded permissions, including local-file playback/export with the
  API unavailable. Old local bundles remain private-preview compatible.
- No hosted publishing or actual marketplace pack creation is added. Public and
  commercial export choices describe the intended use of a downloaded artifact.

## Interface proposal

Extend the existing studio with an **Assets** inspector in its current charcoal,
sage and Manrope styling. List visual and audio assets, default to the selected
layer's asset, and show stable ID, original/current hashes and existing rights.
Present the three use decisions with concrete blocking reasons and attribution.

**Edit evidence** opens a captured-revision draft. Fields group creator/source,
license/evidence, use permissions, lineage and applicable consent. **Review
changes** shows authored before/after values and schema impact; **Save evidence**
is the explicit command, **Cancel** discards the draft. Stale/uncertain saves use
the existing reload-required behavior. A blocking export links to the relevant
asset's evidence editor rather than ending in a dead error.

Studio JSON export and player WebM export expose the intended-use choice with
private preview as the default. Attribution and blocking results remain visible
before download. Include empty/loading/error/retry states, keyboard focus, bounded
long evidence/identifiers and stacked narrow layouts. Keep the landing page and
reference archives unchanged. No visual redesign or new imagery is needed.

## Verification and preservation

The implementation plan must identify exact files, interfaces, failing tests and
commands before code changes. Cover shared TS/Python schema/policy parity; legacy
compatibility; media/evidence hash/path rejection; missing/unknown/incompatible
rights; consent/attribution; stale/replayed commands; restart, fork, undo and redo;
immutable original bytes; exact historical/offline export evidence; and browser
edit/review/save/recovery/export flows at desktop/mobile sizes.

Run relevant baseline and final lint/types/tests/build/e2e/preservation checks.
All mutation tests use isolated database/media roots. Preserve the regular user
project and the pending agent-resource-library changes. Reuse the suitable active
checkout; no commit/push/merge/PR without the user's instruction. Update current
context and Task10 verification evidence with actual results and limitations.

The builder may settle field spelling, module boundaries, bounded limits and
control layout within this design. An unexpected change to scope or compatibility
returns to the user; routine implementation choices need no additional approval.
