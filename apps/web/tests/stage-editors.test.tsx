import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CdomDocument, SvgAsset } from '@aether-dom/schema';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import { AppearanceEditor, CameraEditor, KeyframeEditor, SvgEditor, SvgImport } from '../src/components/stage/stage-editors';
import { createPlayback } from '../src/features/stage/playback';

const document = structuredClone(sample) as CdomDocument;
const shared = { document, run: async () => true, busy: false, blocked: false };
const svg: SvgAsset = { assetId: document.layers[1].assetId, uri: 'safe.svg', sourceUri: 'original.svg', viewBox: { x: 0, y: 0, width: 100, height: 100 }, root: { tag: 'svg', id: 'root', text: '', attributes: {}, children: [{ tag: 'rect', id: 'shape', text: '', attributes: { fill: '#fff' }, children: [] }] } };

describe('stage authoring forms', () => {
  it('shows captured camera revision and named numeric controls with an explicit save', () => {
    const markup = renderToStaticMarkup(createElement(CameraEditor, { ...shared, shot: document.shots[0], onClose: () => {} }));
    expect(markup).toContain('Based on revision 0');
    for (const name of ['Camera X', 'Camera Y', 'Camera Z', 'Camera FOV']) expect(markup).toContain(`aria-label="${name}"`);
    expect(markup).toContain('Save camera'); expect(markup).toContain('Reset camera to 16:9');
  });
  it('requires an explicit import and states source rights rather than assuming ownership', () => {
    const markup = renderToStaticMarkup(createElement(SvgImport, { ...shared, shotId: document.shots[0].id, onClose: () => {} }));
    expect(markup).toContain('aria-label="Import SVG file"');
    expect(markup).toContain('Import SVG layer'); expect(markup).toContain('Unknown');
  });
  it('keeps source IDs selectable and shows supported geometry and presentation fields', () => {
    const markup = renderToStaticMarkup(createElement(SvgEditor, { ...shared, layer: document.layers[1], svg, selectedId: 'shape', onSelect: () => {} }));
    expect(markup).toContain('value="shape" selected');
    expect(markup).toContain('aria-label="SVG fill"'); expect(markup).toContain('aria-label="SVG width"');
    expect(markup).toContain('value="#fff"'); expect(markup).toContain('Save SVG changes');
    expect(markup).toContain('all layers using this asset');
  });
  it('previews interpolation without changing the saved base and supports explicit keyframe authoring', () => {
    const playback = createPlayback(8000); playback.seek(2000);
    const layer = { ...document.layers[1], keyframes: [{ id: 'k', timeMs: 4000, transform: { ...document.layers[1].transform, x: document.layers[1].transform.x + 1 } }] };
    const markup = renderToStaticMarkup(createElement(KeyframeEditor, { ...shared, layer, playback }));
    expect(markup).toContain('aria-label="Preview X"'); expect(markup).toContain(String(layer.transform.x + .5));
    expect(markup).toContain('Add keyframe'); expect(markup).toContain('Update keyframe at 4000 ms');
    playback.dispose();
  });
  it('disables authoring while canonical writes are blocked', () => {
    const markup = renderToStaticMarkup(createElement(AppearanceEditor, { ...shared, blocked: true, layer: document.layers[1] }));
    expect(markup).toContain('disabled'); expect(markup).toContain('Edit appearance');
  });
});
