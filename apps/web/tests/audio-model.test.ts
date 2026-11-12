import { describe, expect, it } from 'vitest';
import type { CdomDocument } from '@aether-dom/schema';
import fixture from '../../../packages/schema/fixtures/sample.cdom.json';
import { evaluateAudio, initialTension } from '../src/features/audio/model';

const seed = () => structuredClone(fixture) as CdomDocument;
const shot = 'shot_rooftop';
describe('derived audio mix', () => {
  it('derives the seed binding, fades unbound music and leaves Foley authored without changing canon', () => {
    const doc = seed(); const before = JSON.stringify(doc);
    expect(initialTension(doc, shot)).toBe(.75);
    const mix = evaluateAudio(doc, shot, 0);
    expect(mix.tension).toBe(.75);
    expect(mix.tracks.find(t => t.id === 'track_tension')?.gainDb).toBe(-7.5);
    expect(mix.tracks.find(t => t.id === 'track_ambient')?.gainDb).toBeCloseTo(-12.3432, 3);
    expect(mix.tracks.find(t => t.id === 'track_sign_foley')).toMatchObject({ gainDb: -8, pan: .425 });
    expect(mix.coverage.supportedBindingIds).toEqual(['binding_paranoia_to_tension', 'binding_sign_position']);
    expect(JSON.stringify(doc)).toBe(before);
  });
  it('uses editorial and preview tension only for supported mappings and clamps safe gains', () => {
    const doc = seed();
    Object.assign(doc.shots[0], { audio: { tension: .2 } });
    expect(initialTension(doc, shot)).toBe(.2);
    expect(evaluateAudio(doc, shot, 0).tracks[1].gainDb).toBeCloseTo(-19.6);
    expect(evaluateAudio(doc, shot, 0, 1).tracks.map(t => t.gainDb)).toEqual([-80, -2, -8]);
    expect(evaluateAudio(doc, shot, 0, -2).tracks[1].gainDb).toBe(-24);
    expect(evaluateAudio(doc, shot, 0, NaN).tension).toBe(.2);
    doc.bindings[0].mapping = { kind: 'identity' };
    expect(evaluateAudio(doc, shot, 0, 1).tracks[1].gainDb).toBe(0);
  });
  it('fades the authored ambient gain before clamping the final safe runtime gain', () => {
    const doc = seed(); doc.audioTracks[0].gainDb = 12;
    expect(evaluateAudio(doc, shot, 0, .9).tracks[0].gainDb).toBeCloseTo(-4.113351, 5);
    expect(evaluateAudio(doc, shot, 0, 0).tracks[0].gainDb).toBe(0);
    expect(evaluateAudio(doc, shot, 0, 1).tracks[0].gainDb).toBe(-80);
    doc.audioTracks[0].gainDb = NaN;
    expect(evaluateAudio(doc, shot, 0, .9).tracks[0].gainDb).toBe(-80);
  });
  it('rejects ambiguous, cyclic, unsupported and overflowing mappings instead of silently executing them', () => {
    const doc = seed();
    doc.bindings.push({ ...structuredClone(doc.bindings[0]), id: 'duplicate' });
    expect(evaluateAudio(doc, shot, 0, 1).coverage.unsupportedBindingIds).toEqual(['binding_paranoia_to_tension', 'duplicate']);
    expect(evaluateAudio(doc, shot, 0, 1).tracks[1].gainDb).toBe(-16);
    doc.bindings.pop();
    doc.bindings.push({ id: 'cycle', source: { entityId: 'track_tension', path: 'gainDb' }, target: { entityId: 'char_kael', path: 'traits.paranoia' }, mapping: { kind: 'identity' } });
    expect(evaluateAudio(doc, shot, 0).coverage.unsupportedBindingIds).toContain('binding_paranoia_to_tension');
    doc.bindings.pop();
    doc.bindings[0].mapping = { kind: 'linear', inputMin: 0, inputMax: 0, outputMin: -20, outputMax: 0 };
    expect(evaluateAudio(doc, shot, 0).coverage.unsupportedBindingIds).toContain('binding_paranoia_to_tension');
    doc.bindings[0].mapping = { kind: 'linear', inputMin: -Number.MAX_VALUE, inputMax: Number.MAX_VALUE, outputMin: -20, outputMax: 0 };
    expect(evaluateAudio(doc, shot, 0).tracks.every(t => Number.isFinite(t.gainDb))).toBe(true);
  });
  it('pans camera-relative animated and draft transforms with safe positions and centered unbound tracks', () => {
    const doc = seed(); const layer = doc.layers[3];
    doc.shots[0].camera.position.x = 1;
    layer.transform.x = -1;
    layer.keyframes = [{ id: 'end', timeMs: 1000, transform: { ...layer.transform, x: 3 } }];
    expect(evaluateAudio(doc, shot, 500, null, false).tracks[2].pan).toBe(-1);
    expect(evaluateAudio(doc, shot, 500, null, true).tracks[2].pan).toBe(0);
    expect(evaluateAudio(doc, shot, 500, null, true, new Map([[layer.id, { ...layer.transform, x: 5 }]])).tracks[2].pan).toBe(1);
    expect(evaluateAudio(doc, shot, 1000, null, true).tracks[0]).toMatchObject({ pan: 0, position: { x: 0, y: 0, z: -1 } });
    expect(evaluateAudio(doc, null, 0).tracks).toEqual([]);
    expect(initialTension(doc, null)).toBe(0);
  });
  it('maps each canonical numeric source before normalization unless editorial tension overrides it', () => {
    const doc = seed(); doc.characters[0].traits.paranoia = 50;
    doc.bindings[0].mapping = { kind: 'linear', inputMin: 0, inputMax: 100, outputMin: -24, outputMax: 0 };
    expect(evaluateAudio(doc, shot, 0).tracks[1].gainDb).toBe(-12);
    expect(evaluateAudio(doc, shot, 0).tension).toBe(1);
    Object.assign(doc.shots[0], { audio: { tension: .5 } });
    expect(evaluateAudio(doc, shot, 0).tracks[1].gainDb).toBeCloseTo(-23.88);
  });
});
