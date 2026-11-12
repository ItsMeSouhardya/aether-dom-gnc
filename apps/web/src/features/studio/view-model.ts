import type { CdomDocument } from '@aether-dom/schema';

export type Layer = CdomDocument['layers'][number];
export type Shot = CdomDocument['shots'][number];
export type Scene = CdomDocument['scenes'][number];

export function getSceneShots(document: CdomDocument, sceneId: string | null): Shot[] {
  const scene = document.scenes.find(scene => scene.id === sceneId);
  return scene?.shotIds.flatMap(id => {
    const shot = document.shots.find(shot => shot.id === id && shot.sceneId === sceneId);
    return shot ? [shot] : [];
  }) ?? [];
}

export function getShotLayers(document: CdomDocument, shotId: string | null): Layer[] {
  const shot = document.shots.find(shot => shot.id === shotId);
  return shot?.layerIds.flatMap(id => {
    const layer = document.layers.find(layer => layer.id === id && layer.shotId === shotId);
    return layer ? [layer] : [];
  }) ?? [];
}

export function layerName(document: CdomDocument, layer: Layer): string {
  return layer.name ?? document.characters.find(character => character.id === layer.characterId)?.name
    ?? layer.id.replace(/^layer_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function stageLayers(document: CdomDocument, shotId: string | null): Layer[] {
  return getShotLayers(document, shotId).toSorted((a, b) => a.transform.z - b.transform.z);
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Presentation-only blockout; clamping never changes authored transforms. */
export function stagePlacement(layer: Layer) {
  const character = layer.kind === 'character_sprite' || layer.kind === 'rig';
  const backdrop = !character && layer.transform.z <= -1;
  const width = clamp((character ? 20 : backdrop ? 92 : 35) * layer.transform.scale, 12, 96);
  const height = clamp((character ? 58 : backdrop ? 78 : 50) * layer.transform.scale, 18, 90);
  return {
    left: clamp(50 + layer.transform.x * 36, width / 2 + 2, 98 - width / 2),
    top: clamp(50 - layer.transform.y * 35, height / 2 + 2, 98 - height / 2),
    width, height, rotation: layer.transform.rotationDeg % 360,
  };
}

export function kindLabel(kind: Layer['kind']): string {
  return { svg_plane: 'SVG plane', character_sprite: 'Character sprite', raster_plane: 'Raster plane', rig: 'Rig' }[kind];
}
