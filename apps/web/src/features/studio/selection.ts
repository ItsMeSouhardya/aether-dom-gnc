import type { CdomDocument } from '@aether-dom/schema';
import { getSceneShots, getShotLayers } from './view-model';

export type StudioSelection = { sceneId: string | null; shotId: string | null; layerId: string | null };
export type SelectionAction =
  | { type: 'select-scene' | 'select-shot' | 'select-layer'; id: string }
  | { type: 'clear-layer' };

export function initialSelection(document: CdomDocument): StudioSelection {
  const scene = document.scenes.find(scene => getSceneShots(document, scene.id).length > 0) ?? document.scenes[0];
  return { sceneId: scene?.id ?? null, shotId: getSceneShots(document, scene?.id ?? null)[0]?.id ?? null, layerId: null };
}

export function reduceSelection(document: CdomDocument, current: StudioSelection, action: SelectionAction): StudioSelection {
  switch (action.type) {
    case 'select-scene': {
      const scene = document.scenes.find(scene => scene.id === action.id);
      if (!scene || scene.id === current.sceneId) return current;
      return { sceneId: scene.id, shotId: getSceneShots(document, scene.id)[0]?.id ?? null, layerId: null };
    }
    case 'select-shot': {
      const scene = document.scenes.find(scene => getSceneShots(document, scene.id).some(shot => shot.id === action.id));
      if (!scene || current.shotId === action.id) return current;
      return { sceneId: scene.id, shotId: action.id, layerId: null };
    }
    case 'select-layer':
      return getShotLayers(document, current.shotId).some(layer => layer.id === action.id)
        ? { ...current, layerId: action.id } : current;
    case 'clear-layer':
      return { ...current, layerId: null };
  }
}
