# Codex repository instructions — AETHER-DOM

Read `AETHER_DOM_MASTER_PLAN.md` and `CODEX_TASKS.md` before coding. This repository implements a creative IDE for motion comics/animatics with a versioned `.cdom` typed project model.

## Non-negotiable architecture
- Treat `.cdom` and validated branch revisions as canonical. Never let UI state, AI text, renderer cache or audio-frequency values modify canon directly.
- Every edit flows through a typed command: validation -> apply -> dependency invalidation -> audit -> undo data. Use explicit `expectedRevision` and stable entity IDs.
- AI returns proposal objects only. No unreviewed AI writes, exports, posting or destructive work.
- All domain calculations should be pure, deterministic, unit tested and runnable without cloud keys.
- Start with **one renderer** (Three.js stage plus SVG overlay), with WebGL/DOM fallback. Do not install PixiJS at the same time without a documented reason.
- Prefer local-first execution: SQLite and checked-in fixture assets; avoid requiring Docker, hosted databases or paid APIs to load the example project.
- Keep vendor SDK calls behind interfaces; use server-side environment secrets only.
- Sanitize uploaded/generated SVG; reject unsafe paths, scripts and unsupported files. Keep provenance/rights metadata.

## Development rhythm
1. Confirm the current phase and list files you expect to modify.
2. Make the smallest coherent vertical slice; do not implement deferred subsystems speculatively.
3. Add unit or integration tests for domain behavior.
4. Run relevant lint, typecheck and tests and report exact results.
5. End with changed files, working behavior, limitations, and next recommended task.

## Technology defaults
- Web: Next.js 16 App Router, TypeScript, Tailwind, Zustand, `@xyflow/react`.
- Stage: Three.js + native SVG overlay; WebGL2 fallback is mandatory.
- API: Python FastAPI + SQLAlchemy, migrations with Alembic; SQLite for dev.
- Contract: canonical JSON Schema in `packages/schema`, validated on client and server. Maintain schema version and migrations.
- Audio: browser WebAudio/Tone.js with locally checked-in licensed sample clips.
- Tests: Vitest (pure TS), Pytest (Python domain/API), Playwright (critical browser flows).

## First-pass acceptance
- A developer can start web and API locally with documented commands.
- Seeded Neon Shogun project is displayed, editable, and can be saved/reloaded.
- Left-arm canon contradiction is diagnosed with evidence; a proposed fix is previewed before apply.
- Changing tension and moving an audio emitter modifies corresponding live audio behavior without any LLM.

## Do not claim
- Perfect editing of arbitrary AI-generated raster assets, guaranteed zero drift, verified CTR improvements from saliency alone, Whisper-native phoneme alignment, generated multi-stem output from Lyria, or blanket 60 fps on all devices.
