export type Transform = { x: number; y: number; z: number; scale: number; rotationDeg: number };
export type StageCamera = { position: { x: number; y: number; z: number }; fovDeg: number; aspectRatio: '16:9' | '9:16' | '1:1' };
export type Viewport = { width: number; height: number };
export type ViewBox = { x: number; y: number; width: number; height: number };
export type Keyframe = { id: string; timeMs: number; transform: Transform };
export type AnimatedLayer = { transform: Transform; keyframes?: readonly Keyframe[] };
export const STAGE_NEAR = 0.001;
export const SVG_UNITS_PER_WORLD = 100;

const fields = ['x', 'y', 'z', 'scale', 'rotationDeg'] as const;

export function interpolateTransform(layer: AnimatedLayer, timeMs: number): Transform {
  const frames = [...(layer.keyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs);
  const time = Number.isNaN(timeMs) ? 0 : Math.max(0, timeMs);
  let previous = { timeMs: 0, transform: layer.transform };
  for (const frame of frames) {
    if (frame.timeMs <= time) { previous = frame; continue; }
    const progress = (time - previous.timeMs) / (frame.timeMs - previous.timeMs);
    const result = { ...previous.transform };
    // Weighted addition avoids overflowing the subtraction of opposite finite extremes.
    for (const field of fields) result[field] = previous.transform[field] * (1 - progress) + frame.transform[field] * progress;
    return result;
  }
  return { ...previous.transform };
}

function projectionScale(z: number, camera: StageCamera, viewport: Viewport): number | null {
  const values = [z, camera.position.x, camera.position.y, camera.position.z, camera.fovDeg, viewport.width, viewport.height];
  if (!values.every(Number.isFinite) || viewport.width <= 0 || viewport.height <= 0 || camera.fovDeg <= 0 || camera.fovDeg >= 180) return null;
  const distance = camera.position.z - z;
  if (!Number.isFinite(distance) || distance <= STAGE_NEAR) return null;
  const scale = viewport.height / (2 * distance * Math.tan(camera.fovDeg * Math.PI / 360));
  return Number.isFinite(scale) && scale > 0 ? scale : null;
}

export function projectLayer(transform: Transform, camera: StageCamera, viewport: Viewport, viewBox: ViewBox) {
  if (![...fields.map(field => transform[field]), viewBox.x, viewBox.y, viewBox.width, viewBox.height].every(Number.isFinite) || viewBox.width <= 0 || viewBox.height <= 0 || transform.scale <= 0) return null;
  const pixelsPerWorld = projectionScale(transform.z, camera, viewport);
  if (pixelsPerWorld === null) return null;
  const result = {
    x: viewport.width / 2 + (transform.x - camera.position.x) * pixelsPerWorld,
    y: viewport.height / 2 - (transform.y - camera.position.y) * pixelsPerWorld,
    width: viewBox.width / SVG_UNITS_PER_WORLD * transform.scale * pixelsPerWorld,
    height: viewBox.height / SVG_UNITS_PER_WORLD * transform.scale * pixelsPerWorld,
    rotation: -transform.rotationDeg,
    pixelsPerWorld,
  };
  return Object.values(result).every(Number.isFinite) && result.width > 0 && result.height > 0 ? result : null;
}

export function unprojectDelta(dx: number, dy: number, z: number, camera: StageCamera, viewport: Viewport): { x: number; y: number } | null {
  const pixelsPerWorld = projectionScale(z, camera, viewport);
  if (pixelsPerWorld === null || !Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  const result = { x: dx / pixelsPerWorld, y: -dy / pixelsPerWorld };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

function beyond(value: number, direction: 1 | -1): number | null {
  const step = Math.max(1, Math.abs(value) * Number.EPSILON * 2);
  const candidate = value + direction * step;
  return Number.isFinite(candidate) && (direction === 1 ? candidate > value : candidate < value) ? candidate : null;
}

export function nextLayerDepth(layers: readonly { id: string; transform: { z: number } }[], layerId: string, direction: 'forward' | 'backward'): number | null {
  if (layers.some(layer => !Number.isFinite(layer.transform.z))) return null;
  const ordered = layers.map((layer, index) => ({ ...layer, index })).sort((a, b) => a.transform.z - b.transform.z || a.index - b.index);
  const index = ordered.findIndex(layer => layer.id === layerId);
  if (index === -1) return null;
  const step = direction === 'forward' ? 1 : -1;
  const adjacent = ordered[index + step];
  if (!adjacent) return null;
  const z = adjacent.transform.z;
  let further = index + step * 2;
  while (ordered[further]?.transform.z === z) further += step;
  const boundary = ordered[further]?.transform.z;
  if (boundary !== undefined) {
    const midpoint = z / 2 + boundary / 2;
    return Number.isFinite(midpoint) && (step === 1 ? midpoint > z && midpoint < boundary : midpoint < z && midpoint > boundary) ? midpoint : null;
  }
  return beyond(z, step);
}
