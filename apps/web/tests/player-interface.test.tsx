import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PlayerSession } from '../src/components/player/player-session';
import { PlayerLoader } from '../src/components/player/player-loader';
import { playerFixture } from './player-fixture';

it('exposes read-only independent transport and exact saved revision without enabling audio', () => {
  const manifest = playerFixture(); manifest.document.project.revision = 27;
  const markup = renderToStaticMarkup(createElement(PlayerSession, { manifest, source: 'Local file · story.cdom.json' }));
  for (const label of ['Player shot', 'Player aspect ratio', 'Seek player', 'Player stage', 'Player time', 'Player volume']) expect(markup).toContain(`aria-label="${label}"`);
  expect(markup).toContain('Revision 27'); expect(markup).toContain('Local file'); expect(markup).toContain('Enable audio'); expect(markup).toContain('>Play</button>');
  expect(markup).toContain('value="9:16"'); expect(markup).toContain('value="16:9"');
  for (const action of ['Save', 'Undo', 'Redo', 'Generate proposal', 'Import SVG']) expect(markup).not.toContain(`>${action}`);
});

it('handles empty shots, empty layers and silent shots with recovery guidance', () => {
  const manifest = playerFixture(); manifest.document.shots = [];
  let markup = renderToStaticMarkup(createElement(PlayerSession, { manifest, source: 'Local file' }));
  expect(markup).toContain('No shots to play'); expect(markup).not.toContain('Enable audio');
  manifest.document.shots = playerFixture().document.shots;
  manifest.document.shots[0].layerIds = []; manifest.document.audioTracks = [];
  markup = renderToStaticMarkup(createElement(PlayerSession, { manifest, source: 'Local file' }));
  expect(markup).toContain('No layers in this shot'); expect(markup).toContain('No audio tracks in this shot.');
  expect(markup).toContain('disabled="">Play');
});

it('keeps local file opening available during API errors and validates route errors visibly', () => {
  const markup = renderToStaticMarkup(createElement(PlayerLoader, { initialError: 'The player revision is invalid.' }));
  expect(markup).toContain('role="alert">The player revision is invalid.');
  expect(markup).toContain('aria-label="Open local player JSON"'); expect(markup).toContain('Back to studio');
  expect(markup).toContain('Local files stay on this device.'); expect(markup).not.toContain('Try again');
});
