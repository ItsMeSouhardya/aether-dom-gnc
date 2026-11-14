import { interpolateTransform, type AnimatedLayer } from './geometry';
import type { SvgAsset } from './svg-tree';
import { applyRigToSvg, type Rig } from '@aether-dom/schema';

export type RenderLayer = AnimatedLayer & { id: string; visible?: boolean; opacity?: number; svg: SvgAsset | null; rig?: Rig };
export type RigPreview = { layerId: string; boneId: string; rotationDeg: number };

export function stageRenderPlan(layers: readonly RenderLayer[], timeMs: number, animate: boolean, hiddenLayerId?: string | null, preview?: RigPreview | null) {
  return layers.map((layer, index) => {
    let svg = layer.svg, rigError = false;
    if (svg && layer.rig) {
      const rig = preview?.layerId === layer.id ? { ...layer.rig, bones: layer.rig.bones.map(bone => bone.id === preview.boneId ? { ...bone, rotationDeg: preview.rotationDeg, keyframes: [] } : bone) } : layer.rig;
      try { svg = applyRigToSvg(svg, rig, timeMs, animate); } catch { svg = null; rigError = true; }
    }
    return { ...layer, svg, rigError, transform: animate ? interpolateTransform(layer, timeMs) : layer.transform, index };
  })
    .filter(layer => layer.id !== hiddenLayerId && layer.visible !== false && (layer.opacity ?? 1) > 0 && Object.values(layer.transform).every(Number.isFinite))
    .sort((a, b) => a.transform.z - b.transform.z || a.index - b.index);
}
