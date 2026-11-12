import { expect, it } from 'vitest';
import { validateCdom, type CdomDocument } from '../src/index';
import sample from '../fixtures/sample.cdom.json';

it('rejects unpaired surrogate document text and keys without repairing them', () => {
  const title = structuredClone(sample); title.project.title = '\ud800';
  const key = structuredClone(sample) as CdomDocument; key.characters[0].traits = { ...key.characters[0].traits, ['\udfff']: 0.2 };
  expect(validateCdom(title).valid).toBe(false);
  expect(validateCdom(key).valid).toBe(false);
  expect(title.project.title).toBe('\ud800');
});
it('preserves valid supplementary Unicode in portable documents', () => {
  const document = structuredClone(sample); document.project.title = 'Neon Shogun 🦾';
  expect(validateCdom(document).valid).toBe(true);
});
