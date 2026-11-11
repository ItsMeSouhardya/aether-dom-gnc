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

For a future contract change: preserve originals, assign a new schema version, document compatibility, introduce an explicit migration, regenerate types, and add success/failure fixtures in both languages. Task 00 performs no migration and creates no command or persistence API.
