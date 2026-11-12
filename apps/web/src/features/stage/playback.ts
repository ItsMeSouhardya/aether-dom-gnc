export type PlaybackSnapshot = { timeMs: number; playing: boolean };
export type PlaybackClock = { now: () => number; request: (callback: (time: number) => void) => number; cancel: (id: number) => void };
export type Playback = {
  getSnapshot: () => PlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  seek: (timeMs: number) => void;
  play: () => void;
  pause: () => void;
  dispose: () => void;
};

export function createPlayback(durationMs: number, clock: PlaybackClock = {
  now: () => performance.now(), request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id),
}): Playback {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  let snapshot: PlaybackSnapshot = { timeMs: 0, playing: false };
  let frame: number | null = null;
  let anchorTime = 0;
  let anchorPosition = 0;
  let disposed = false;
  const listeners = new Set<() => void>();
  function publish(timeMs: number, playing: boolean) {
    if (snapshot.timeMs === timeMs && snapshot.playing === playing) return;
    snapshot = { timeMs, playing };
    for (const listener of [...listeners]) listener();
  }
  function stopFrame() { if (frame !== null) clock.cancel(frame); frame = null; }
  function tick(time: number) {
    frame = null;
    if (disposed || !snapshot.playing) return;
    const position = Math.min(duration, anchorPosition + Math.max(0, time - anchorTime));
    publish(position, position < duration);
    if (!disposed && snapshot.playing && frame === null) frame = clock.request(tick);
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    seek(timeMs) {
      if (disposed) return;
      const position = Number.isNaN(timeMs) ? 0 : Math.min(duration, Math.max(0, timeMs));
      anchorTime = clock.now(); anchorPosition = position;
      const playing = snapshot.playing && position < duration;
      if (!playing) stopFrame();
      publish(position, playing);
    },
    play() {
      if (disposed || snapshot.playing || duration === 0) return;
      anchorPosition = snapshot.timeMs >= duration ? 0 : snapshot.timeMs;
      anchorTime = clock.now();
      publish(anchorPosition, true);
      if (!disposed && snapshot.playing && frame === null) frame = clock.request(tick);
    },
    pause() {
      if (disposed || !snapshot.playing) return;
      stopFrame();
      const position = Math.min(duration, anchorPosition + Math.max(0, clock.now() - anchorTime));
      publish(position, false);
    },
    dispose() { if (disposed) return; stopFrame(); disposed = true; publish(snapshot.timeMs, false); listeners.clear(); },
  };
}
