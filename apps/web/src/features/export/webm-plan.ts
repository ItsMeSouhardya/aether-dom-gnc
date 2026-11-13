import { validatePlayerManifest, type PlayerManifest, type SvgNode } from '@aether-dom/schema';
import { composeLayers, compositionCamera, type Aspect } from '../stage/composition';
import { projectLayer } from '../stage/geometry';
import { stageRenderPlan } from '../stage/render-plan';
import { serializeSvg } from '../stage/svg-tree';

export type WebMOptions = { shotId: string; aspect: Aspect; durationMs: number; includeAudio: boolean; signal?: AbortSignal; onProgress?: (progress: number) => void };
export const WEBM_MAX_BYTES = 64 * 1024 * 1024;
export function chooseWebMCodec(supports: (type: string) => boolean): string | null {
  return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => {
    try { return supports(type); } catch { return false; }
  }) ?? null;
}

function checkFonts(node: SvgNode, inherited = '') {
  const family = node.attributes['font-family'] ?? inherited;
  // SVG images cannot inherit the page's downloaded Manrope font. Do not
  // silently substitute text metrics or fetch a font while exporting.
  if (node.tag === 'text' && !/^(sans-serif|serif|monospace|system-ui|cursive|fantasy)$/.test(family)) throw new Error('This shot contains text using an inherited or custom font. Use an explicit generic SVG font or convert the text to paths, then export the saved JSON again.');
  node.children.forEach(child => checkFonts(child, family));
}

export function planWebM(manifest: PlayerManifest, options: WebMOptions) {
  const checked = validatePlayerManifest(manifest);
  if (!checked.valid) throw new Error('The saved player manifest is invalid. Open a validated player JSON file again.');
  const shot = manifest.document.shots.find(item => item.id === options.shotId);
  if (!shot) throw new Error('Choose a saved shot to record.');
  if (!['16:9', '9:16', '1:1'].includes(options.aspect)) throw new Error('The recording aspect ratio is unsupported.');
  if (!Number.isFinite(options.durationMs) || options.durationMs < 1 || options.durationMs > Math.min(shot.durationMs, 30000)) throw new Error('Clip duration must be between 1ms and the shorter of the shot duration or 30 seconds.');
  if (typeof options.includeAudio !== 'boolean') throw new Error('Choose whether to include audio.');
  const [width, height] = options.aspect === '16:9' ? [1280, 720] : options.aspect === '9:16' ? [720, 1280] : [720, 720];
  const document = { ...manifest.document, layers: composeLayers(manifest.document.layers, shot, options.aspect) };
  const sources = new Map(manifest.assets.flatMap(asset => asset.kind === 'svg' ? [[asset.assetId, asset.svg] as const] : []));
  const layers = shot.layerIds.map(id => document.layers.find(layer => layer.id === id && layer.shotId === shot.id)!).map(layer => ({ ...layer, svg: sources.get(layer.assetId) ?? null }));
  const markup = new Map<string, string>();
  for (const layer of layers) {
    if (!layer.svg) throw new Error('Every recorded layer needs an embedded SVG source. Export the saved JSON again.');
    if (layer.visible !== false && (layer.opacity ?? 1) > 0) checkFonts(layer.svg.root);
    // Rasterize the complete projected frame at its final dimensions so native
    // non-scaling strokes keep their viewport semantics, including rotation.
    markup.set(layer.id, serializeSvg(layer.svg).replace(/width="[^"]*" height="[^"]*"/, 'width="100%" height="100%" overflow="visible"'));
  }
  return { width, height, fps: 24, durationMs: options.durationMs, document, shot, layers, markup, camera: compositionCamera(shot, options.aspect) };
}
export type WebMPlan = ReturnType<typeof planWebM>;

export function webMFrame(plan: WebMPlan, timeMs: number): string {
  if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs > plan.durationMs) throw new Error('The recording frame time is outside the clip.');
  const content = stageRenderPlan(plan.layers, timeMs, true).map(layer => {
    const box = layer.svg!.viewBox, p = projectLayer(layer.transform, plan.camera, plan, box);
    if (!p) return '';
    return `<g transform="translate(${p.x} ${p.y}) rotate(${p.rotation})" opacity="${layer.opacity ?? 1}"><svg x="${-p.width / 2}" y="${-p.height / 2}" width="${p.width}" height="${p.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${plan.markup.get(layer.id)}</svg></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}" font-size="16" font-weight="400"><rect width="100%" height="100%" fill="#101310"/>${content}</svg>`;
}
