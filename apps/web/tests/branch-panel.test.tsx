import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import type { CdomDocument } from '@aether-dom/schema';
import { BranchPanel } from '../src/components/branches/branch-panel';
it('exposes an explicit fork, captured source revision and read-only comparison', () => {
  const html = renderToStaticMarkup(createElement(BranchPanel, { document: sample as CdomDocument, busy: false, blocked: false, onBusyChange: () => {}, onSwitch: () => {}, reload: () => {}, onClose: () => {} }));
  expect(html).toContain('Branches'); expect(html).toContain('Fork name'); expect(html).toContain('Create fork');
  expect(html).toContain('Revision'); expect(html).toContain('read-only'); expect(html).not.toContain('Apply merge');
});
