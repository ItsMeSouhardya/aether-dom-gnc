import { expect, it } from 'vitest';
import fixture from '../fixtures/player-rights-manifest.json';
import cases from '../fixtures/player-rights-manifest-cases.json';
import { validatePlayerManifest } from '../src/index';

it.each(cases)('rights manifest parity: $name', testCase => {
  const value: Record<string, unknown> = structuredClone(fixture);
  const updates = [...testCase.updates, ...(testCase.path.length ? [{path:testCase.path,value:testCase.value}] : [])];
  for (const update of updates) {
    let parent: unknown = value;
    for (const key of update.path.slice(0,-1)) parent = (parent as Record<string,unknown>)[key];
    (parent as Record<string,unknown>)[update.path.at(-1)!] = update.value;
  }
  expect(validatePlayerManifest(value).valid).toBe(testCase.valid);
});
it('legacy wrapper cannot strip the proof on a recorded ledger', () => {
  const value: Record<string, unknown> = structuredClone(fixture);
  delete value.exportUse;
  delete value.evidence;
  value.manifestVersion = '1.0.0';
  expect(validatePlayerManifest(value).valid).toBe(false);
});
