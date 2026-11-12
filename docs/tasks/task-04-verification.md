# Task04 verification — Editable 2.5D stage

Verified12 November2026, Windows, Node22.23.3, pnpm11.25.0, Python3.12.14.

Branch: feat/task-04-2-5d-stage. Base: c56eec46a84f05c5fe077056337d7efe920a86b5. Changes remain uncommitted; no push, merge or PR was performed. The user handles Git integration.

## Delivered behavior

- Single Three.js WebGL2 compositor with accessible native SVG fallback, four original local SVG fixtures, fitted camera frame and selectable planes/sprites.
- Camera-correct drag commits once on release; Escape/cancel sends no command. Keyboard/numeric edits, visibility/opacity and depth reorder preserve unrelated layers.
- Static SVG import and geometry/presentation editing preserve asset and source element IDs. Originals and normalized versions are immutable local files; shared instances disclose their shared source. Active/unsupported content, malformed trees and unsafe paths are rejected.
- Camera pan/dolly/FOV/aspect controls,16:9 reset and linear keyframes with independent seek/play/pause. Preview never changes base transforms or persists frames.
- Lossless optional document0.2 extension, command0.3, both document versions readable, exact inverse restore and immutable revision-bound asset reads. No startup upgrade or SQL migration.

## Final checks

| Check | Result |
| --- | --- |
| pnpm lint | ESLint zero warnings; Ruff and retained landing syntax clean |
| pnpm typecheck | Generated drift, schema/web TypeScript and strict mypy13 sources clean |
| pnpm test | API261, schema65, web94:420 passed;1 legacy host-limited file-symlink skip |
| pnpm build | Production Next build succeeded |
| pnpm test:e2e |60 desktop/mobile tests passed, including14 stage cases |
| Development regression | AETHER_E2E_DEV=1, stage effect-replay case:1 passed |
| pnpm verify:preserved |178 original files preserved; original schema/fixture match kit bytes |
| git diff --check | Clean |

Each browser run uses a unique ignored database and asset root containing copied checked-in fixtures. Import/edit tests use temporary roots. The regular user database/media are excluded from test writes.

Missing-feature tests were recorded before implementation. The first production stage test failed on absent Import SVG controls. Asset-loader tests failed on the missing module; contracts/security/engine workers recorded focused RED→GREEN checks. The full regression run caught latest-health incompatibility in the immutable seed overview; its new boundary test failed before the compatibility fix and passed afterward. A mobile mouse-drag test was corrected to scroll the actual target into view before obtaining pointer coordinates.

## Independent review and visual confirmation

Fresh read-only review inspected all uncommitted Task04 source, including command/history/state, SVG storage, renderer, projection and UI lifecycle. Two P2 findings were addressed:

1. React development effect replay disposed a memoized playback controller. Reproduced in a real Next development browser: Play never became Pause. Cleanup now pauses/cancels the clock, retaining a usable controller across effect replay; the same browser regression passed. CI also runs it in development mode.
2. Bitmap scaling changed non-scaling SVG stroke semantics. Assets containing non-scaling strokes now use native SVG, including attributes introduced by later edits. Text also uses native rendering to preserve inherited font metrics. Regressions verify no rasterization/allocation and safe pending texture cleanup.

Backend shape-child rejection was aligned with the client validator. Dedicated SVG tests now pass88 cases, including source immutability, malformed XML, IDs, deep trees, hostile attributes, content hashes and Windows redirected filesystem entries.

Bounded Impeccable pass: desktop1440×900 and mobile390×844 inspected together; one correction batch increased touch controls to44px and restored consistent inspector padding. Final desktop/mobile confirmation passed. No landing/archive refinement was made. The Impeccable engine cache was unavailable; selected product/design/Operate/craft-floor guidance was applied directly, with no detector claim. RTK remains blocked by host policy; direct tools were used.

## Preserved regular project and local runtime

The prior Python3.14 environment's native extension is blocked by Windows Application Control. Separate ignored .venv-task04 uses official bundled Python3.12.14 with pinned requirements and the documented same-version puremypy workaround. Root ignored .env.api.local sets AETHER_PYTHON; tools/api.mjs loads that optional override. The old environment and security policy remain intact.

Regular data/aether-dom.sqlite3: revision0, zero history entries, last-write2026-11-11T23:29:59.6899005+05:30. File SHA256 before final restart:275416e4a62ff8bfb1ac0af0abc95b5b28aa55bbbecc60d4aaa72980cff14c79. Canonical sorted-JSON SHA256 before/after restart:a997714cdf7983f8329783959a183783da2b26e87c069a6e634c7a3fbb3258c7. Existing title metadata differs from the pristine seed; it was preserved without an authoring command.

Final preview: web127.0.0.1:3000 (session32332), API127.0.0.1:8000 (session33710). Browser preview left open. Temporary test services stopped normally.

## Deliberate scope

WebGL2 ships first; WebGPU, audio graph, advanced rigs/Bezier authoring, export and AI remain later tasks. Three missing audio fixtures remain honestly reported. Import is a bounded static SVG subset, not an unrestricted SVG editor. Safe originals and versioned SVG directories must be backed up with SQLite. Next ordered task: Task05 — Audio graph.

## Fullscreen sizing follow-up

User screenshot showed a thumbnail-sized frame in a fullscreen desktop browser. A new1536×730 regression reproduced309.33px frame width inside1020px stage workspace (expected greater than70% of workspace). Height allocation to216px tracks plus three stacked bottom headers caused the shrink; the900px width cap also constrained larger screens.

Layout now starts with compact timeline controls, explicit Show/Hide tracks and automatic tracks in Animate. Desktop drawer headers share one row; expanded content spans all columns. Removed the frame cap and desktop minimum page height; reduced desktop workspace padding. Mobile timeline heading/playback controls wrap with44px actions and no artificial empty timeline height. No camera/transform or other authored state was changed.

At the same scaled-desktop viewport, native browser measurement confirmed719.64×404.79px, retaining16:9:2.3× previous width. Regression also checks1920×930 exceeds900px, track toggling and Animate. All62 production browser cases and94 frontend unit tests passed after the correction; lint/types/build/preservation and diff checks clean. Bounded desktop/mobile inspection found the cramped mobile heading, corrected in one batch, then confirmed. Final web preview session54072; user's revision6 retained. This follow-up remains uncommitted with Task04.
