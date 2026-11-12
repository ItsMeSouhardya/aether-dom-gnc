import { expect, it } from 'vitest';
import { createPlayback, type PlaybackClock } from '../src/features/stage/playback';

it('publishes exact transport actions even for repeated equal seeks, without changing snapshot subscribers', () => {
  let now = 0; let tick: ((time: number) => void) | undefined;
  const clock: PlaybackClock = { now: () => now, request: callback => { tick = callback; return 1; }, cancel: () => { tick = undefined; } };
  const playback = createPlayback(1000, clock);
  const events: unknown[] = [];
  const off = playback.subscribeTransport(event => events.push(event));
  let snapshots = 0; playback.subscribe(() => { snapshots++; });
  playback.seek(0); playback.seek(0);
  expect(events).toEqual([{ type: 'seek', timeMs: 0, playing: false }, { type: 'seek', timeMs: 0, playing: false }]);
  expect(snapshots).toBe(0);
  playback.play(); now = 200; tick?.(now);
  expect(events).toHaveLength(3);
  playback.pause(); playback.play(); now = 1200; tick?.(now);
  expect(events.slice(-3)).toEqual([{ type: 'pause', timeMs: 200, playing: false }, { type: 'play', timeMs: 200, playing: true }, { type: 'end', timeMs: 1000, playing: false }]);
  off(); playback.dispose(); playback.seek(0);
  expect(events).toHaveLength(6);
  expect(Object.keys(playback.getSnapshot())).toEqual(['timeMs', 'playing']);
});
