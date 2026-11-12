import { describe, expect, it } from 'vitest';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import type { CdomDocument } from '@aether-dom/schema';
import { composeLayers, compositionCamera, fitSubjects, subjectSafety } from '../src/features/stage/composition';
import { interpolateTransform } from '../src/features/stage/geometry';

const fixture = () => structuredClone(sample) as CdomDocument;
const boxes = { asset_kael: { x: 0, y: 0, width: 130, height: 200 }, asset_vance: { x: 0, y: 0, width: 130, height: 200 } };
describe('authored aspect compositions', () => {
  it('uses portrait overrides without mutating base canon or landscape', () => {
    const doc = fixture(), before = structuredClone(doc), shot = doc.shots[0];
    const portrait = composeLayers(doc.layers, shot, '9:16');
    expect(portrait[1].transform.x).toBe(-.22);
    expect(portrait[2].transform.scale).toBe(.85);
    expect(portrait[0].transform).toEqual(doc.layers[0].transform);
    expect(composeLayers(doc.layers, shot, '16:9')).toEqual(doc.layers);
    expect(compositionCamera(shot, '9:16')).toEqual({ ...shot.camera, aspectRatio: '9:16' });
    expect(doc).toEqual(before);
  });
  it('carries keyframe deltas and scale ratios into portrait animation', () => {
    const doc = fixture(), layer = doc.layers[1];
    layer.keyframes = [{ id: 'frame', timeMs: 1000, transform: { ...layer.transform, x: .35, y: .1, scale: 2, rotationDeg: 30 } }];
    const result = composeLayers(doc.layers, doc.shots[0], '9:16')[1];
    const halfway = interpolateTransform(result, 500);
    expect(halfway.x).toBeCloseTo(.28); expect(halfway.y).toBeCloseTo(.1);
    expect(halfway.scale).toBeCloseTo(1.275); expect(halfway.rotationDeg).toBe(15);
    expect(layer.transform.x).toBe(-.65); expect(layer.keyframes[0].transform.x).toBe(.35);
  });
  it('does not apply an override to a foreign or unlisted layer', () => {
    const doc = fixture(); doc.layers[1].shotId = 'other'; doc.shots[0].layerIds = ['layer_vance'];
    expect(composeLayers(doc.layers, doc.shots[0], '9:16')[1]).toEqual(doc.layers[1]);
  });
  it('fits both rotated/depth-offset subjects inside portrait safe bounds in reading order', () => {
    const doc = fixture(), shot = doc.shots[0];
    shot.layoutOverrides = {}; doc.layers[1].transform.rotationDeg = 20; doc.layers[2].transform.z = 1;
    const before = structuredClone(doc), fit = fitSubjects(doc.layers, shot, '9:16', boxes);
    expect(fit.valid).toBe(true); if (!fit.valid) return;
    const fitted = { ...shot, layoutOverrides: { '9:16': { layerTransforms: fit.layerTransforms } } };
    const safety = subjectSafety(doc.layers, fitted, '9:16', boxes);
    expect(safety.map(item => item.status)).toEqual(['safe', 'safe']);
    expect(fit.layerTransforms.layer_kael.x).toBeLessThan(fit.layerTransforms.layer_vance.x);
    expect(fit.layerTransforms.layer_kael.rotationDeg).toBe(20);
    expect(fit.layerTransforms.layer_vance.z).toBe(1);
    expect(fit.layerTransforms.layer_kael.scale).toBeLessThanOrEqual(1);
    expect(fitSubjects(doc.layers, shot, '9:16', boxes)).toEqual(fit); expect(doc).toEqual(before);
  });
  it('reports missing, hidden, clipped and animated subject states honestly', () => {
    const doc = fixture(), shot = doc.shots[0];
    shot.layoutOverrides = {}; doc.layers[1].transform.x = 20;
    expect(subjectSafety(doc.layers, shot, '9:16', boxes)[0].status).toBe('outside');
    doc.layers[1].visible = false;
    expect(subjectSafety(doc.layers, shot, '9:16', boxes)[0].status).toBe('unavailable');
    expect(fitSubjects(doc.layers, shot, '9:16', {})).toMatchObject({ valid: false });
    doc.layers[1].visible = true; doc.layers[1].transform.x = 0;
    doc.layers[1].keyframes = [{ id: 'f', timeMs: 1000, transform: { ...doc.layers[1].transform, x: 20 } }];
    expect(subjectSafety(doc.layers, shot, '16:9', boxes, 1000)[0].status).toBe('outside');
    doc.layers[1].transform.z = 10;
    expect(fitSubjects(doc.layers, shot, '9:16', boxes)).toMatchObject({ valid: false });
  });
  it('fits the evaluated time-zero keyframe while retaining later animation deltas', () => {
    const doc = fixture(), shot = doc.shots[0]; shot.layoutOverrides = {};
    const kael = doc.layers[1];
    kael.keyframes = [{ id: 'frame0', timeMs: 0, transform: { ...kael.transform, x: 20, y: 5, z: 1, scale: 2, rotationDeg: 35 } },
      { id: 'later', timeMs: 1000, transform: { ...kael.transform, x: 21, y: 5, z: 1, scale: 2, rotationDeg: 35 } }];
    const fit = fitSubjects(doc.layers, shot, '9:16', boxes); expect(fit.valid).toBe(true); if (!fit.valid) return;
    const fitted = { ...shot, layoutOverrides: { '9:16': { layerTransforms: fit.layerTransforms } } };
    expect(subjectSafety(doc.layers, fitted, '9:16', boxes, 0).map(item => item.status)).toEqual(['safe', 'safe']);
    const composed = composeLayers(doc.layers, fitted, '9:16')[1];
    expect(interpolateTransform(composed, 1000).x - interpolateTransform(composed, 0).x).toBeCloseTo(1);
    expect(kael.keyframes[0].transform.x).toBe(20);
  });
});
