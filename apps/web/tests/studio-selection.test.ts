import { describe, expect, it } from 'vitest';
import type { CdomDocument } from '@aether-dom/schema';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';
import { initialSelection, reduceSelection } from '../src/features/studio/selection';
import { createStudioStore } from '../src/features/studio/store';
import { getSceneShots, getShotLayers, layerName, stageLayers, stagePlacement } from '../src/features/studio/view-model';

const fixture = () => structuredClone(sample) as CdomDocument;

describe('studio UI selection', () => {
  it('opens the first populated scene without selecting a layer', () => {
    expect(initialSelection(fixture())).toEqual({ sceneId: 'scene_rooftop', shotId: 'shot_rooftop', layerId: null });
  });
  it('clears the shot and layer when entering an empty scene', () => {
    const document = fixture();
    const selected = { ...initialSelection(document), layerId: 'layer_kael' };
    expect(reduceSelection(document, selected, { type: 'select-scene', id: 'scene_prologue' }))
      .toEqual({ sceneId: 'scene_prologue', shotId: null, layerId: null });
  });
  it('selects a valid layer while keeping authored transforms unchanged', () => {
    const document = fixture();
    const before = JSON.stringify(document);
    const selection = reduceSelection(document, initialSelection(document), { type: 'select-layer', id: 'layer_kael' });
    expect(selection.layerId).toBe('layer_kael');
    expect(document.layers[1].transform).toEqual({ x: -0.65, y: -0.1, z: 0, scale: 1, rotationDeg: 0 });
    expect(JSON.stringify(document)).toBe(before);
  });
  it('clears a previous layer when switching shots', () => {
    const document = fixture();
    document.shots.push({ ...structuredClone(document.shots[0]), id: 'shot_second', layerIds: [] });
    document.scenes[1].shotIds.push('shot_second');
    const selected = { ...initialSelection(document), layerId: 'layer_kael' };
    expect(reduceSelection(document, selected, { type: 'select-shot', id: 'shot_second' }))
      .toEqual({ sceneId: 'scene_rooftop', shotId: 'shot_second', layerId: null });
    const next = reduceSelection(document, { sceneId: 'scene_rooftop', shotId: 'shot_second', layerId: null }, { type: 'select-layer', id: 'layer_kael' });
    expect(next.layerId).toBeNull();
  });
  it('ignores unknown scene, shot and layer IDs', () => {
    const document = fixture();
    const selection = initialSelection(document);
    for (const type of ['select-scene', 'select-shot', 'select-layer'] as const) {
      expect(reduceSelection(document, selection, { type, id: 'missing' })).toBe(selection);
    }
  });
  it('clears the inspector without changing the selected shot', () => {
    const document = fixture();
    expect(reduceSelection(document, { ...initialSelection(document), layerId: 'layer_kael' }, { type: 'clear-layer' }))
      .toEqual({ sceneId: 'scene_rooftop', shotId: 'shot_rooftop', layerId: null });
  });
  it('supports an empty document and scenes without shots', () => {
    const document = fixture();
    document.scenes = []; document.shots = [];
    expect(initialSelection(document)).toEqual({ sceneId: null, shotId: null, layerId: null });
    document.scenes = [{ id: 'empty', title: 'Empty scene', eventIds: [], shotIds: [] }];
    expect(initialSelection(document)).toEqual({ sceneId: 'empty', shotId: null, layerId: null });
  });
  it('does not resolve dangling or cross-scene membership', () => {
    const document = fixture();
    document.scenes[0].shotIds = ['missing', 'shot_rooftop'];
    expect(getSceneShots(document, 'scene_prologue')).toEqual([]);
    document.shots[0].layerIds.push('missing');
    document.layers[1].shotId = 'foreign';
    expect(getShotLayers(document, 'shot_rooftop').map(layer => layer.id)).toEqual(['layer_rooftops', 'layer_vance', 'layer_sign']);
  });
  it('keeps separate mounted studio stores isolated', () => {
    const document = fixture();
    const before = JSON.stringify(document);
    const first = createStudioStore(document);
    const second = createStudioStore(document);
    first.getState().dispatch({ type: 'select-layer', id: 'layer_kael' });
    expect(first.getState().selection.layerId).toBe('layer_kael');
    expect(second.getState().selection.layerId).toBeNull();
    expect(JSON.stringify(document)).toBe(before);
    expect(Object.keys(first.getState()).sort()).toEqual(['dispatch', 'selection']);
  });
});

describe('read-only stage projection', () => {
  it('derives names from character references and stable layer IDs', () => {
    const document = fixture();
    expect(layerName(document, document.layers[1])).toBe('Kael');
    expect(layerName(document, document.layers[0])).toBe('Rooftops');
  });
  it('sorts layer depth without rearranging the document', () => {
    const document = fixture();
    expect(stageLayers(document, 'shot_rooftop').map(layer => layer.id))
      .toEqual(['layer_rooftops', 'layer_sign', 'layer_kael', 'layer_vance']);
    expect(document.shots[0].layerIds).toEqual(['layer_rooftops', 'layer_kael', 'layer_vance', 'layer_sign']);
  });
  it('keeps extreme blockout positions visible without rewriting canon', () => {
    const layer = fixture().layers[1];
    layer.transform.x = 10000; layer.transform.y = -10000; layer.transform.scale = 1000;
    const before = structuredClone(layer.transform);
    const placement = stagePlacement(layer);
    expect(placement.left).toBeLessThanOrEqual(100);
    expect(placement.top).toBeLessThanOrEqual(100);
    expect(placement.width).toBeLessThanOrEqual(96);
    expect(placement.height).toBeLessThanOrEqual(90);
    expect(layer.transform).toEqual(before);
  });
});
