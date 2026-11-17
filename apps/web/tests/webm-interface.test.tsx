import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WebMExport } from '../src/components/player/webm-export';
import { PlayerSession } from '../src/components/player/player-session';
import { LoreDetails } from '../src/components/player/lore-details';
import { playerFixture } from './player-fixture';
import rights from '../../../packages/schema/fixtures/asset-rights-cases.json';

it('offers an explicit bounded recording gesture, default audio and honest encoding limitations', () => {
  const markup = renderToStaticMarkup(createElement(WebMExport, { manifest: playerFixture(), shotId: 'shot_rooftop', aspect: '16:9', onStart: () => {} }));
  expect(markup).toContain('Record WebM'); expect(markup).toContain('Clip duration');
  expect(markup).toContain('Include audio'); expect(markup).toContain('checked=""');
  expect(markup).toContain('real time'); expect(markup).toContain('30 seconds'); expect(markup).toContain('64 MiB');
  expect(markup).toContain('Reactive glow'); expect(markup).toContain('portable JSON');
  expect(markup).not.toContain('Download WebM'); expect(markup).not.toContain('MP4');
});

it('explains repair according to saved-project or imported-file provenance', () => {
  const document = playerFixture().document;
  const hotspot = { id: 'missing', label: 'Missing', targetKind: 'character' as const, targetId: 'character_absent', positions: { '16:9': { x: .5, y: .5 }, '9:16': { x: .5, y: .5 } } };
  const render = (localFile: boolean) => renderToStaticMarkup(createElement(LoreDetails, { document, hotspot, localFile, close: () => {} }));
  expect(render(false)).toContain('Saved character target unavailable: character_absent');
  expect(render(false)).toContain('Return to the studio to repair the saved source');
  expect(render(true)).toContain('Open a corrected saved JSON file');
  expect(render(true)).toContain('studio that owns it');
});

it('integrates export into the independent saved player', () => {
  const markup = renderToStaticMarkup(createElement(PlayerSession, { manifest: playerFixture(), source: 'Local file' }));
  expect(markup).toContain('aria-label="WebM preview export"');
  expect(markup).toContain('Record WebM');
});

it('shows each distinct attribution once without changing the portable evidence', () => {
  const manifest = playerFixture();
  for (const [index, asset] of manifest.document.assets.entries()) {
    asset.provenance = { ...structuredClone(rights.provenance), attribution: index === 2 ? 'Music by Bea' : 'Art by Ada' } as typeof asset.provenance;
  }
  const before = JSON.stringify(manifest);
  const markup = renderToStaticMarkup(createElement(WebMExport, { manifest, shotId: 'shot_rooftop', aspect: '16:9', onStart: () => {} }));
  expect(markup.match(/Attribution: Art by Ada/g)).toHaveLength(1);
  expect(markup.match(/Attribution: Music by Bea/g)).toHaveLength(1);
  expect(JSON.stringify(manifest)).toBe(before);
});
