import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import type { CdomDocument } from '@aether-dom/schema';
import { LayoutEditor } from '../src/components/stage/layout-editor';
it('identifies portrait-only saved values and explicit draft actions', () => {
  const document = structuredClone(sample) as CdomDocument;
  const html = renderToStaticMarkup(createElement(LayoutEditor, { document, shot: document.shots[0], layerId: 'layer_kael', sources: {}, busy: false, blocked: false, run: async () => true, onPreview: () => {} }));
  expect(html).toContain('Portrait composition'); expect(html).toContain('Edit portrait X');
  expect(html).toContain('value="-0.22"'); expect(html).toContain('Fit subjects'); expect(html).toContain('Save portrait layout');
  expect(html).toContain('16:9'); expect(html).not.toContain('Save transform');
});
