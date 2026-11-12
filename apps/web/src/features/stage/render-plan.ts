import { interpolateTransform, type AnimatedLayer } from './geometry';
import type { SvgAsset } from './svg-tree';

export type RenderLayer = AnimatedLayer & { id: string; visible?: boolean; opacity?: number; svg: SvgAsset | null };

export function stageRenderPlan(layers: readonly RenderLayer[], timeMs: number, animate: boolean, hiddenLayerId?: string | null) {
  return layers.map((layer, index) => ({ ...layer, transform: animate ? interpolateTransform(layer, timeMs) : layer.transform, index }))
    .filter(layer => layer.id !== hiddenLayerId && layer.visible !== false && (layer.opacity ?? 1) > 0 && Object.values(layer.transform).every(Number.isFinite))
    .sort((a, b) => a.transform.z - b.transform.z || a.index - b.index);
}
