# Player surface — Tasks 07–08

Mode: **Experience**. Let the saved scene lead. Preserve Afterlight charcoal, sage, Manrope and familiar controls; use no decorative effects or marketing claims.

Task08: WebM preview sits below playback, with clip duration, Include audio, Record, progress/Cancel and an explicit Download link on success. It records the saved/local manifest from time zero, pausing preview first. Native encoding is real time; an empty native recording can fall back to bounded WebCodecs encoding. Task09 regression checks also exposed nonempty native files with shortened audio: actual encoded audio duration is now checked before download and incomplete output uses that same fallback. Changing shot/aspect/file or hiding/leaving the page cancels and releases resources. No partial file is offered. Show duration/size/codec/font/glow limits and portable-JSON recovery. No microphone, screen capture or public upload exists.

The header identifies AETHER-DOM/Player, provides Open JSON and Back to studio. Project, branch, exact revision and source appear above the stage alongside native shot/aspect selects. A fitted16:9/9:16 frame leads; the transport offers Play/Pause, seek, elapsed/duration and explicit Enable audio. Volume and reduced-motion-aware glow are temporary. Keyboard frame controls use Space, arrows, Home and End.

On narrow screens header/actions and selectors wrap; portrait remains tall, controls keep44px targets, and status copy flows below. The stage and transport share one visual surface. Native SVG fallback preserves playback when WebGL2 is unavailable. Both use the studio's projection/composition code.

Loading states name the saved/file read. Error states explain retry or local-file recovery. Empty projects/shots explain how to continue. Opening a file, choosing a shot/aspect or leaving the player stops old audio/clock state. Local files render only after shared bounded validation, and embedded sources have no network fallback. No save, proposal approval, import into canon, audience choice or publishing action exists here. Downloaded JSON requires this app's player; it is not a standalone executable web page.
