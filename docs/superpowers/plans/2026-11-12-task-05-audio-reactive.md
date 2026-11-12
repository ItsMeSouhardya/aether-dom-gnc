# Task05 — Audio Reactive Implementation Plan

> **For agentic workers:** Execute test-first. Independent backend/contracts, audio-engine and mixer-interface workers have fixed ownership below; root owns fixture generation, studio integration, browser acceptance and final verification. Preserve the user's database and leave all changes uncommitted.

**Goal:** Play local stems/Foley only after a creator gesture, map tension to a smooth mix, pan the bound prop and drive a bounded runtime glow, with reliable seeking.

**Architecture:** SQLite/typed commands remain canonical. A native Web Audio adapter follows the existing playback clock and explicit transport events; its buffers, analyser levels and preview controls are disposable derived state. One optional document0.3 field stores editorial shot tension; old documents remain readable without startup migration. The existing studio and large-stage layout remain intact.

**Tech stack:** Existing Next/React/TypeScript/FastAPI/SQLite; browser Web Audio, no Tone.js or other new runtime dependency. Original deterministic PCM fixtures at the existing three asset URIs. Official references: https://www.w3.org/TR/webaudio-1.1/ and https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start.

**Spec:** aether_dom_codex_kit/CODEX_TASKS.md Task05; master plan sections3–4,6–8,11.3; root/kit AGENTS; PRODUCT, selected design and studio surface brief. Task04 user commit f4eee75 is the clean baseline. Branch codex/task-05-audio-reactive reuses this checkout; no merge/push/commit.

## Decisions and constraints

- Preserve original0.1 schema/fixture/kit, existing0.2 schema/types, visual fixtures, landing and archives. No SQL migration or automatic document upgrade. Keep user revisions/media intact; all mutation tests use temporary roots/databases.
- Native Web Audio is sufficient for three local tracks; adding Tone would duplicate transport/scheduling. AudioContext is not created/resumed until explicit Enable audio click. Play preview alone remains silent before enable. Disable stops sources/closes context; enabling again is supported.
- Extend0.3 document with optional shot.audio={tension:number0..1}; nothing else. Command0.4 adds setShotTension targetshot args{tension}; exact undo restores prior schema/field presence. Stage operations must preserve0.3, never downgrade to0.2. Supported versions0.1/0.2/0.3; health latest0.3.
- Default editorial tension derives from the supported character numeric source binding (seed Kael paranoia); authored shot.audio.tension overrides that input for the shot's supported music-gain mappings. Slider preview is clearly unsaved until Save tension. Other source traits are never edited by the slider.
- Whitelist supported finite numeric linear/identity bindings. For supported music gainDb targets, evaluate the mapping into derived gainDb (overrides that track's static base gain); unbound ambient music fades with cos(T*pi/2) times authored gain. Foley retains authored gain. No binding writes canon; unsupported/ambiguous/cyclic mappings disclose coverage and do not execute. Guard all runtime gains against overflow/NaN and clamp safe derived dB to[-80,0].
- Tension changes smooth AudioParams (~50ms) without source restarts. User master volume/mute, headphone/spatial choice and glow toggle are preview-only. Default safe master0.6. UI explains headphone stereo pan and the optional spatial mode/fallback.
- Panning follows camera-relative evaluated bound-layer transform, including keyframes and ephemeral drag drafts. Headphone mode uses StereoPanner clamp((layer.x-camera.x)/2,-1,1); spatial mode uses PannerNode equalpower/listener facing-Z, or reports stereo fallback. No bound layer means centered playback.
- Share the current authoritative millisecond playback. Add explicit subscribeTransport events (play,pause,seek,end) without changing getSnapshot's shape or breaking subscribers. Never infer seek by frame-gap heuristics or rebuild sources every RAF. Source offsets use timeline seconds modulo clip duration; all sources restart together after each seek. Pause/end/unmount/disable/shot-change stop old nodes; loading and rapid operations use generation tokens so obsolete completions cannot start audio.
- PCM fixtures are original project-owned synthesized ambient, tension and electric Foley, not generated-provider stems or copyrighted recordings. Generator uses only Python stdlib. Existing asset IDs/rights/URIs remain unchanged.
- Binary read endpoint GET /api/v1/projects/{p}/branches/{b}/audio/{assetId}?revision=N resolves only a referenced audio asset at that saved revision. Bound safe workspace assets paths, reject redirected roots/children/hardlinks, traversal/network references, invalid/truncated/oversized WAV. PCM16 mono/stereo,8–48kHz,≤30sec,≤8MiB. No arbitrary file serving, upload or range endpoint.
- Analyser uses bounded low-band sampling at visual-frame rate, smoothed attack/release, delivered through an imperative subscriber bus. No analyser values in React state/Zustand/canon. Native overlay glow on bound Foley props works above GPU and fallback. Respect reduced-motion preference; explicit glow opt-in can override it. No new visual framework or per-sample React rerender.
- Mixer opens in the inspector from an Audio control in timeline header, preserving default compact tracks and desktop stage size. Existing transform/SVG/camera/diagnostics flows stay usable. Loading/off/unavailable/decode-error states are explicit and retryable.

## Fixed interfaces and ownership

### A — Backend/contracts

Own packages/schema/**, apps/api/app/{contracts,commands,stage_commands,repository,main}.py, new audio_assets.py and audio command helper if useful, corresponding tests and API/schema READMEs. Do not change web/root docs/fixture files.

- New cdom.v0.3.schema.json and generated CdomDocumentV3; public CdomDocument uses latest optional shape with version union. Preserve0.1/0.2 schemas/types. Add setShotTension and all structural/domain/security/restart/replay/stale/undo tests.
- Repository.get_audio_asset(project,branch,asset,revision?) returns bytes; GET returns audio/wav,no-store,content length. Typed errors consistent with existing API. Reuse immutable revision and containment rules; tests isolate media.
- Existing stage commands only upgrade0.1→0.2, preserve0.3. Snapshot inverse remains compatible. New audio command upgrades losslessly to0.3 and restores exact prior fields/version on undo.

### B — Audio engine

Own apps/web/src/features/audio/{types,model,engine}.ts, features/stage/playback.ts (add transport events only), new audio-model/audio-engine tests and relevant playback tests. Do not change UI/root loader.

Public types in types.ts:
```
AudioUiSettings={tensionPreview:number|null,masterGain:number,muted:boolean,spatialMode:'headphones'|'spatial',reactiveGlow:boolean}
AudioSettings=AudioUiSettings & {document:CdomDocument,shotId:string|null,animate:boolean}
AudioStatus={state:'off'|'loading'|'ready'|'unsupported'|'error',enabled:boolean,message:string,spatialMode:'headphones'|'spatial'|'stereo-fallback'}
AudioFrame={level:number,tracks:{id:string,gainDb:number,pan:number}[]}
AudioPreview={enable:()=>Promise<void>,disable:()=>void,update:(settings:AudioSettings)=>void,setLayerDraft:(id:string,transform:Transform|null)=>void,getSnapshot:()=>AudioStatus,subscribe:(listener:()=>void)=>()=>void,getFrame:()=>AudioFrame,subscribeFrame:(listener:(frame:AudioFrame)=>void)=>()=>void,dispose:()=>void}
```
Export createAudioPreview(playback:Playback,initial:AudioSettings,dependencies?:{contextFactory?:()=>AudioContext,loadAsset?:(document:CdomDocument,asset:{id:string,uri:string},signal:AbortSignal)=>Promise<ArrayBuffer>}):AudioPreview. Default loadAsset uses fixed same-origin exact-revision audio endpoint, verifies response size/type, no arbitrary URI fetch. Root may pass loader dependency. Export pure evaluateAudio(document,shotId,timeMs,tensionPreview?,animate?,drafts?) producing derived track gain/pan/position and tension; export initialTension(document,shotId). Engine getters return stable status snapshots; frame bus never mutates status for every sample.

Meaningful tests: no context before enable; gesture synchronous resume; decode failure/retry; real scheduling graph adapter; exact repeated seeks, one active source/track, modulo offsets; no restart on ordinary ticks/gain changes; cancellation/races/disposal/StrictMode; pan sign/camera/keyframe/draft; supported mappings/cycles/bounds; analyser outputs finite bounded.

### C — Mixer interface

Own only apps/web/src/components/audio/audio-panel.tsx plus new focused component tests. Use shared engine types from B and expanded CommandOperation from root. Export AudioPanel props:
```
{document:CdomDocument,shotId:string|null,runtime:AudioPreview,settings:AudioUiSettings,onSettingsChange:(patch:Partial<AudioUiSettings>)=>void,busy:boolean,blocked:boolean,run:(operation:CommandOperation,reason:string,revision?:number)=>Promise<boolean>,onClose:()=>void}
```
Root mounts it as a whole inspector section. Enable audio, Disable audio, preview volume, mute, headphones/spatial selector, Reactive glow toggle; Tension range0..1 and explicit Save tension/Cancel tension capture base revision at first draft. Restore null preview on cancel/success; never rebase an open draft. Show linked tracks, effective dB/pan outputs and analyser meter via subscribeFrame direct DOM refs (not React frame state). Status subscribe may use useSyncExternalStore. Clear empty/error/loading/retry guidance; warn no headphones promise of audible verification. Existing sage/charcoal classes,44px touch targets, reusable controls. Source IDs remain visible. Root owns timeline launcher/selection behavior/CSS/stage glow.

## Root tasks and tests

- [x] Baseline420 tests/1skip and clean user Task04 commit f4eee75 recorded; user project revision6/hash preserved. New branch only, no main/remotes changes.
- [x] Three original WAV fixtures and reproducible generator; header/signal/seam and byte checks pass. Supplied document unchanged.
- [x] Fixed bounded binary proxy/loader plus command receipts and latest-health compatibility integrated and tested.
- [x] Disposable audio session bridge, preview settings/drafts, timeline launcher, inspector and imperative drag/glow integration complete.
- [x] Missing-feature RED and all audio acceptance paths GREEN, including real OfflineAudioContext stereo output/re-seek identity. Native stage fallback remains covered by existing regressions.
- [x] Final505 unit/API tests/1skip, full76 browser cases, final14 audio cases and2 development cases passed; lint/types/build/preservation clean. Visual corrections and confirmation complete; additional functional marker defect pinned by a failing/passing containment regression.
- [x] Fresh review's threeP2 findings fixed with regressions. Docs/context/evidence recorded; preview and branch left uncommitted.

## Execution evidence

- Full evidence and exact verification chronology: docs/tasks/task-05-verification.md. Desktop/mobile captures alongside it.
- Three review fixes: allow live audio pan drafts in Layout, fade raw authored ambient gain before safety clamp, schedule native shot-end stops independently of RAF.
- Integration fixes: stable focused time editing during playback; properly contained timeline markers; prominent tension controls and compact native checkboxes.
- Browser host fallback: bundled Chromium launch failed; installed Edge selected only via optional AETHER_E2E_CHANNEL. Default CI Chromium unchanged. Development lifecycle regression added to CI.
- No new runtime packages/lock changes, no SQL migration, no automatic document upgrade. Original schemas/types/media and user revision6/hash preserved. No commits/pushes/merges.

## Review focus

- Rapid enable/disable/seek/shot switches and decode completion cannot resurrect old audio or allocate leaked contexts/sources.
- Normal visual ticks must not restart audio sources; repeated seeks remain phase-aligned and don't layer duplicate voices.
- High-frequency analyser/glow updates must never produce canonical revisions or React sample-rate updates; reduced-motion state is respected.
- Old documents/history survive new schema support and exact audio undo; stage commands never drop audio version/metadata.
- WAV path/content validation and binary proxy preserve sandbox boundaries and errors without exposing arbitrary files; fixture/testing never alters user media.
