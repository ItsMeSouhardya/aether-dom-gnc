# Task 01 — Studio shell verification

11 November 2026 (Asia/Calcutta). Baseline commit: c23fb3e. Branch: feat/task-01-studio-shell. Changes are left uncommitted; no push or merge performed.

## Working behavior

The root Next.js route now opens a desktop-first studio over the validated Neon Shogun fixture. It includes a project explorer, scene/shot selection, front-to-back layer navigator, center layout blockout, read-only transform inspector, timeline placeholder, diagnostics disclosure and status footer. The Task 00 overview remains at `/document`, with header links in both directions.

Select a shot in Project, then a layer in Layers or on the stage. Navigator/stage selection stays synchronized. The inspector reads the exact authored X/Y/Z, scale, rotation, pose and source metadata. Kael retains x=-0.65 and y=-0.1; Vance retains x=0.65. Choosing The Escape clears the prior shot/layer and presents a useful empty state. Escape on the stage and Clear selection clear only layer selection. Reload remounts the UI store and restores initial selection.

The per-mounted-studio Zustand store contains selection IDs and dispatch only. Pure projection/selection functions read the schema-generated document type. No document write, revision change, localStorage persistence or alternate canonical state is introduced.

Stage blocks are explicit placeholder geometry; no nonexistent SVG/audio requests or fabricated media appear. Bounds are fitted/clamped for viewing, while inspector values remain original. Z sorts the stage back-to-front and navigator front-to-back. This is the DOM static fallback, with no Three.js/Pixi dependency or Task 04 compositor. Timeline bars show layout/duration placeholders, not editable clips. Diagnostics distinguishes structural validation from the continuity checks that have not run; the intentional arm contradiction is displayed only as the fixture's existing document note.

## Verification evidence

| Command/check | Result |
| --- | --- |
| Initial `pnpm test` baseline | 58 tests passed |
| Final `pnpm test` | 70 passed: 20 schema, 18 web (12 new selection/projection + 6 network boundary), 32 Python/API |
| `pnpm lint` | Passed; ESLint zero warnings, Ruff and landing syntax checks |
| `pnpm typecheck` | Passed; generated-type drift, both TS projects, strict Python typing |
| `pnpm build` | Passed; studio, overview and both read-only route handlers |
| `pnpm test:e2e` | 24 passed, desktop and mobile, including both studio and retained overview |
| `pnpm verify:preserved` | 178 original files unchanged; schema/fixture copies match kit bytes |
| `pnpm peers check` | No peer dependency issues |

Browser acceptance covers actual API fixture loading, stage/navigator/inspector synchronization, exact transform values, empty scene recovery, keyboard selection/Escape, reload reset, API failure/retry, empty projects, multiple shots in one scene, narrow layouts (1024/720/360px), long titles/branch names, JSON endpoint invariance and no console/page errors on the healthy paths. Existing overview coverage, including invalid-contract handling and local font loading, remains green at `/document`.

Desktop 1440×1000 and mobile 390px full-page captures were inspected in an initial batch and one confirmation batch. Files: `task-01-desktop.png`, `task-01-mobile.png`. The stage-height regression also exercises 1440×800 with expanded diagnostics. CUA independently selected Kael and observed the matching navigator/stage state, original transform, pose and asset metadata. Its temporary tab is not a required runtime dependency.

## Review and correction evidence

A fresh read-only reviewer examined tracked/untracked implementation, tests and scoped plan, and ran isolated edge checks. It found two accessibility/resilience issues, initially graded Minor: indistinguishable spoken names for multiple shots within one scene, and mobile overflow from long unbroken schema-valid titles. Both were treated as required acceptance corrections because they impair shot selection or narrow access. The parent also found a canvas fitting defect when diagnostics reduced vertical space.

Each correction was reproduced before its fix:

- Stage frame top measured -122.8125px relative to its viewport at 1440×800; the new bounds test failed. Container-size fitting now preserves the full frame and aspect ratio; desktop/mobile regression passes.
- Two shot buttons had the same accessible name. The new test failed to find distinct controls; labels now include shot IDs and selecting either works.
- Long title/branch/scene names caused horizontal overflow at 360px. The new no-overflow assertion failed; heading/branch text now wraps and the regression passes.

Navigator ordering was also aligned with the same depth-sorted stage view in this bounded correction batch. Full unit/API, browser and source checks passed afterward. No deferred minor findings remain. No second independent review or open-ended polish loop was used.

Scope rulings on review exclusions:

- Commands, persistence and undo/redo belong to Task 02; no editable-looking controls are introduced.
- Semantic reference/duplicate-ID checking, continuity and invalidation belong to Task 03. This shell filters unresolved/foreign membership safely and does not claim semantic validation.
- Actual source-media rendering, Three.js, drag/reorder, camera manipulation and layout overrides belong to Task 04. The blockout is explicitly labeled.
- Playback, keyframes, audio and tension remain later work; timeline controls do not pretend to play.
- AI, publishing, authentication, collaboration and a full lore/graph interface are outside this task's acceptance.
- Roving tree arrow keys and automatic cross-panel focus/scroll are optional future enhancements. Native buttons support Tab/Enter/Space and preserve focus through selection; Escape clears stage selection.

## Files and limits

Changes are in `apps/web/src/components/studio/`, `apps/web/src/features/studio/`, root/overview routing and styles, Zustand dependency/lockfile, web/browser tests, README/PRODUCT/current context and new plan/design/evidence docs. API, schema, fixture, landing, archives, original plans and vendor references are unchanged.

The studio inherits Afterlight's charcoal/sage/Manrope identity with a restrained Operate layout. Mobile stacks the panels and prioritizes reachability; it does not promise a full mobile authoring workflow. Structural validation remains distinct from linter correctness. The schema's preliminary reference semantics are not expanded here.

The Impeccable engine launcher still cannot install its cache; project context and playbooks were read directly, with no detector pass claimed. RTK remains blocked by Windows application control. ESLint registry maintenance notice and pure-Python mypy setup are unchanged from Task 00. Local checks ran on Windows/Node 22.23.3/Python 3.14.6; remote CI was not run in this task.

Next: **Task 02 — Commands and persistence**.
