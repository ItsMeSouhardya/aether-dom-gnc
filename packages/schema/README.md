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

## Commands — Task 02

`command.schema.json` separately defines command version **0.1.0**. Import generated `CdomCommand` and `validateCommand(value)` from this package. It returns `{valid:true, command}` or `{valid:false, issues}`. Both TypeScript and Python read this same schema; generation/drift checks cover both contracts.

Every command requires `commandId`, `projectId`, `branchId`, `expectedRevision` (nonnegative safe integer), a human actor `{kind:'human',id:string}`, `op` and `reason`. `setLayerTransform` also requires stable `targetId` and nonempty partial `args` drawn from `x`, `y`, `z`, `scale` and `rotationDeg`. Values must be finite; scale must be positive. `undo` and `redo` have no target/args. Unknown fields and agent actors are rejected. This envelope is a local attribution record, not authentication.

The API checks branch/target identity and revision, validates the resulting `.cdom`, then atomically persists a new snapshot, immutable audit/forward/inverse records and undo/redo stacks. Conflicts return 409 without writing. Exact replay of a command ID/payload returns its original result; a different payload under that ID conflicts. Undo restores authored values exactly while revision metadata advances. New edits clear redo without erasing the audit. General reference integrity and dependency invalidation remain Task 03.
