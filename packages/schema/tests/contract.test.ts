import { describe, expect, it } from 'vitest';
import sample from '../fixtures/sample.cdom.json';
import invalidCases from '../fixtures/invalid-cases.json';
import { validateCdom } from '../src/index';

describe('canonical .cdom structural contract', () => {
  it('accepts the supplied fixture without changing the intentional continuity issue', () => {
    const before = JSON.stringify(sample);
    const result = validateCdom(sample);
    expect(result.valid).toBe(true);
    expect(sample.layers[1].pose).toBe('lifting_with_left_arm');
    expect(JSON.stringify(sample)).toBe(before);
  });

  it.each(invalidCases)('rejects $name with a field location', testCase => {
    const input = structuredClone(sample);
    let parent: Record<string | number, unknown> = input as unknown as Record<string, unknown>;
    for (const key of testCase.path.slice(0, -1)) parent = parent[key] as typeof parent;
    const key = testCase.path.at(-1)!;
    if (testCase.remove) delete parent[key];
    else parent[key] = testCase.value;
    const before = JSON.stringify(input);
    const result = validateCdom(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: expect.any(String), message: expect.any(String) })]));
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([null, [], 'document', 0])('rejects non-document input %j', input => {
    expect(validateCdom(input).valid).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity, Number('1e400')])('rejects non-finite authored coordinates %s', value => {
    const input = structuredClone(sample);
    input.layers[0].transform.x = value;
    expect(validateCdom(input).valid).toBe(false);
    expect(Object.is(input.layers[0].transform.x, value)).toBe(true);
  });
});
