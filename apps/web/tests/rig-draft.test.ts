import { expect, it } from 'vitest';
import { parseRigAngle, parseRigTime } from '../src/features/rig/draft';

it('accepts finite bounded angles and integral shot times', () => {
  expect(parseRigAngle('-45.5')).toBe(-45.5);
  for (const value of ['', 'NaN', 'Infinity', '361', '0x10']) expect(parseRigAngle(value)).toBeNull();
  expect(parseRigTime('1000', 1000)).toBe(1000);
  for (const value of ['', '-1', '1.5', '1001']) expect(parseRigTime(value, 1000)).toBeNull();
});
