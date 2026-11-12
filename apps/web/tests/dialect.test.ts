import { expect, it } from 'vitest';
import { checkDialectDraft } from '../src/features/lore/dialect';

it('checks forbidden words and phrases case-insensitively without changing the text', () => {
  const text = 'KINDLY leave, Your   Excellency.';
  expect(checkDialectDraft(text, ['kindly', 'your excellency'])).toEqual(['kindly', 'your excellency']);
  expect(text).toBe('KINDLY leave, Your   Excellency.');
});
it('uses word boundaries rather than matching fragments inside other words', () => {
  expect(checkDialectDraft('Unkindly handled by your excellencyship.', ['kindly', 'your excellency'])).toEqual([]);
});
it('normalizes Unicode and punctuation while preserving authored evidence terms', () => {
  expect(checkDialectDraft('ＫＩＮＤＬＹ, your—excellency!', ['kindly', 'your excellency'])).toEqual(['kindly', 'your excellency']);
});
it('ignores empty rules, deduplicates matches, and never invents a dialect rule', () => {
  expect(checkDialectDraft('kindly kindly', ['', ' ', 'kindly', 'kindly'])).toEqual(['kindly']);
  expect(checkDialectDraft('kindly', [])).toEqual([]);
  expect(checkDialectDraft('', ['kindly'])).toEqual([]);
});
it('preserves meaningful combining marks and normalizes equivalent apostrophes', () => {
  expect(checkDialectDraft('दान', ['दिन'])).toEqual([]);
  expect(checkDialectDraft('दिन', ['दिन'])).toEqual(['दिन']);
  expect(checkDialectDraft('don’t', ["don't"])).toEqual(["don't"]);
});
