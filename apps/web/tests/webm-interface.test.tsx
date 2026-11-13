import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WebMExport } from '../src/components/player/webm-export';
import { PlayerSession } from '../src/components/player/player-session';
import { playerFixture } from './player-fixture';

it('offers an explicit bounded recording gesture, default audio and honest encoding limitations', () => {
  const markup = renderToStaticMarkup(createElement(WebMExport, { manifest: playerFixture(), shotId: 'shot_rooftop', aspect: '16:9', onStart: () => {} }));
  expect(markup).toContain('Record WebM'); expect(markup).toContain('Clip duration');
  expect(markup).toContain('Include audio'); expect(markup).toContain('checked=""');
  expect(markup).toContain('real time'); expect(markup).toContain('30 seconds'); expect(markup).toContain('64 MiB');
  expect(markup).toContain('Reactive glow'); expect(markup).toContain('portable JSON');
  expect(markup).not.toContain('Download WebM'); expect(markup).not.toContain('MP4');
});

it('integrates export into the independent saved player', () => {
  const markup = renderToStaticMarkup(createElement(PlayerSession, { manifest: playerFixture(), source: 'Local file' }));
  expect(markup).toContain('aria-label="WebM preview export"');
  expect(markup).toContain('Record WebM');
});
