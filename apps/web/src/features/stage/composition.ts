import type { CdomDocument } from '@aether-dom/schema';
import { interpolateTransform, projectLayer, type StageCamera, type Transform, type ViewBox } from './geometry';

type Layer = CdomDocument['layers'][number];
type Shot = CdomDocument['shots'][number];
export type Aspect = Shot['camera']['aspectRatio'];
export type SourceBounds = Record<string, ViewBox>;
export const SAFE_AREA = { left: .05, right: .95, top: .1, bottom: .9 } as const;
const viewport = (aspect: Aspect) => ({ width: { '16:9': 1600, '9:16': 506.25, '1:1': 900 }[aspect], height: 900 });

export function compositionCamera(shot: Shot, aspect: Aspect): StageCamera {
  return { ...shot.camera, position: { ...shot.camera.position }, aspectRatio: aspect };
}

/** Rebase authored animation deltas on the alternate composition, without editing canon. */
export function composeLayers(layers: readonly Layer[], shot: Shot, aspect: Aspect): Layer[] {
  const overrides = aspect === '9:16' ? shot.layoutOverrides['9:16']?.layerTransforms : undefined;
  return layers.map(layer => {
    const override = overrides && Object.hasOwn(overrides, layer.id) && layer.shotId === shot.id && shot.layerIds.includes(layer.id) ? overrides[layer.id] : undefined;
    if (!override) return layer;
    const rebase = (transform: Transform): Transform => ({
      x: override.x + (transform.x - layer.transform.x),
      y: override.y + (transform.y - layer.transform.y),
      z: override.z + (transform.z - layer.transform.z),
      scale: override.scale * (transform.scale / layer.transform.scale),
      rotationDeg: override.rotationDeg + (transform.rotationDeg - layer.transform.rotationDeg),
    });
    return { ...layer, transform: { ...override }, ...(layer.keyframes ? { keyframes: layer.keyframes.map(frame => ({ ...frame, transform: rebase(frame.transform) })) } : {}) };
  });
}

function subjects(layers: readonly Layer[], shot: Shot) {
  return layers.filter(layer => layer.shotId === shot.id && shot.layerIds.includes(layer.id) && layer.kind === 'character_sprite');
}
function bounds(transform: Transform, shot: Shot, aspect: Aspect, source: ViewBox) {
  const frame = viewport(aspect), p = projectLayer(transform, compositionCamera(shot, aspect), frame, source);
  if (!p) return null;
  const angle = p.rotation * Math.PI / 180;
  const width = Math.abs(p.width * Math.cos(angle)) + Math.abs(p.height * Math.sin(angle));
  const height = Math.abs(p.width * Math.sin(angle)) + Math.abs(p.height * Math.cos(angle));
  const result = { left: (p.x - width / 2) / frame.width, right: (p.x + width / 2) / frame.width,
    top: (p.y - height / 2) / frame.height, bottom: (p.y + height / 2) / frame.height, width, height, pixelsPerWorld: p.pixelsPerWorld, x: p.x };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

export function subjectSafety(layers: readonly Layer[], shot: Shot, aspect: Aspect, sources: SourceBounds, timeMs = 0) {
  return subjects(composeLayers(layers, shot, aspect), shot).map(layer => {
    const box = layer.visible !== false && (layer.opacity ?? 1) > 0 && sources[layer.assetId] ? bounds(interpolateTransform(layer, timeMs), shot, aspect, sources[layer.assetId]) : null;
    const safe = box && box.left >= SAFE_AREA.left - 1e-9 && box.right <= SAFE_AREA.right + 1e-9 && box.top >= SAFE_AREA.top - 1e-9 && box.bottom <= SAFE_AREA.bottom + 1e-9;
    return { id: layer.id, status: !box ? 'unavailable' as const : safe ? 'safe' as const : 'outside' as const };
  });
}

export function fitSubjects(layers: readonly Layer[], shot: Shot, aspect: Aspect, sources: SourceBounds):
  { valid: true; layerTransforms: Record<string, Transform> } | { valid: false; message: string } {
  const active = subjects(composeLayers(layers, shot, aspect), shot).filter(layer => layer.visible !== false && (layer.opacity ?? 1) > 0);
  if (!active.length || active.length > 64) return { valid: false, message: 'Fit needs one to64 visible character sprites.' };
  const items = active.map(layer => {
    const pose = interpolateTransform(layer, 0);
    return { layer, pose, box: sources[layer.assetId] ? bounds(pose, shot, aspect, sources[layer.assetId]) : null };
  });
  if (items.some(item => !item.box)) return { valid: false, message: 'Load every subject SVG and keep subjects in front of the camera before fitting.' };
  items.sort((a, b) => a.box!.x - b.box!.x);
  const frame = viewport(aspect), safeWidth = frame.width * (SAFE_AREA.right - SAFE_AREA.left), safeHeight = frame.height * (SAFE_AREA.bottom - SAFE_AREA.top);
  const gap = active.length > 1 ? safeWidth * .03 / (active.length - 1) : 0;
  const factor = Math.min(1, (safeWidth - gap * (active.length - 1)) / items.reduce((sum, item) => sum + item.box!.width, 0), safeHeight / Math.max(...items.map(item => item.box!.height)));
  if (!Number.isFinite(factor) || factor <= 0) return { valid: false, message: 'These subjects cannot fit inside the current camera safe area.' };
  const used = items.reduce((sum, item) => sum + item.box!.width * factor, 0) + gap * (items.length - 1);
  let cursor = (frame.width - used) / 2;
  const layerTransforms: Record<string, Transform> = Object.create(null);
  for (const { layer, pose, box } of items) {
    const width = box!.width * factor;
    // Fit the evaluated pose, then invert its animation delta into the saved
    // override base. A frame authored at zero must not escape the fitted area.
    const transform = { ...layer.transform,
      x: shot.camera.position.x + (cursor + width / 2 - frame.width / 2) / box!.pixelsPerWorld - (pose.x - layer.transform.x),
      y: shot.camera.position.y - (pose.y - layer.transform.y), scale: layer.transform.scale * factor };
    if (!Object.values(transform).every(Number.isFinite) || transform.scale <= 0) return { valid: false, message: 'The fitted transform exceeds finite bounds.' };
    layerTransforms[layer.id] = transform; cursor += width + gap;
  }
  return { valid: true, layerTransforms };
}
