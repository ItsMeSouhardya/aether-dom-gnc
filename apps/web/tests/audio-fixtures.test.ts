import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('ships distinct bounded PCM loops with quiet seams at the original referenced paths', () => {
  const signals: number[][] = [];
  for (const name of ['ambient', 'tension', 'buzz']) {
    const bytes = readFileSync(resolve('../../assets/fixtures', `${name}.wav`));
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect(bytes.readUInt16LE(20)).toBe(1);
    expect(bytes.readUInt16LE(22)).toBe(1);
    expect(bytes.readUInt16LE(34)).toBe(16);
    const count = bytes.readUInt32LE(40) / 2, rate = bytes.readUInt32LE(24);
    expect(count / rate).toBe(8);
    const samples = Array.from({ length: count }, (_, i) => bytes.readInt16LE(44 + i * 2) / 32768);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / count);
    expect(rms).toBeGreaterThan(.02); expect(rms).toBeLessThan(.4);
    expect(samples.every(value => Math.abs(value) < .8)).toBe(true);
    expect(Math.abs(samples[0] - samples.at(-1)!)).toBeLessThan(.001);
    expect(Math.abs(samples.reduce((sum, value) => sum + value, 0) / count)).toBeLessThan(.01);
    signals.push(samples);
  }
  expect(signals[0]).not.toEqual(signals[1]); expect(signals[1]).not.toEqual(signals[2]);
});
