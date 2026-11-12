import type { SvgAsset, SvgNode } from '@aether-dom/schema';

export type { SvgAsset, SvgNode } from '@aether-dom/schema';

const tags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text']);
const attributes = new Set([
  'x', 'y', 'dx', 'dy', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'd', 'points',
  'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'vector-effect', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'opacity', 'transform', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'preserveAspectRatio',
]);

export function checkedSvgTree(root: SvgNode): SvgNode {
  let count = 0;
  const ids = new Set<string>();
  function visit(node: SvgNode, depth: number): SvgNode {
    if (++count > 512 || depth > 16 || !tags.has(node.tag) || (depth > 1 && node.tag === 'svg') || typeof node.id !== 'string' || !node.id || ids.has(node.id) || typeof node.text !== 'string' || !Array.isArray(node.children)) throw new Error('Invalid SVG tree');
    ids.add(node.id);
    const safeAttributes: Record<string, string> = {};
    for (const [name, value] of Object.entries(node.attributes)) {
      if (!attributes.has(name) || typeof value !== 'string' || value.length > 65536 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]|\burl\s*\(|(?:javascript|data|https?)\s*:/i.test(value)) throw new Error('Unsafe SVG attribute');
      safeAttributes[name] = value;
    }
    return { tag: node.tag, id: node.id, text: node.text, attributes: safeAttributes, children: node.children.map(child => visit(child, depth + 1)) };
  }
  return visit(root, 1);
}

export function scopedSvgId(scopeId: string, sourceId: string): string {
  const encode = (value: string) => Array.from(value, char => char.codePointAt(0)!.toString(16)).join('-');
  return `svg-${encode(scopeId)}--${encode(sourceId)}`;
}

export function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}

export function serializeSvg(asset: SvgAsset): string {
  const { viewBox } = asset;
  if (!Object.values(viewBox).every(Number.isFinite) || viewBox.width <= 0 || viewBox.height <= 0) throw new Error('Invalid SVG viewBox');
  const root = checkedSvgTree(asset.root);
  if (root.tag !== 'svg') throw new Error('Invalid SVG root');
  const rasterScale = Math.min(1, 2048 / Math.max(viewBox.width, viewBox.height));
  const rasterWidth = Math.max(1, viewBox.width * rasterScale);
  const rasterHeight = Math.max(1, viewBox.height * rasterScale);
  function serialize(node: SvgNode, isRoot = false): string {
    const attrs = Object.entries(node.attributes).filter(([name]) => !isRoot || (name !== 'width' && name !== 'height')).map(([name, value]) => ` ${name}="${xmlEscape(value)}"`).join('');
    const bounds = isRoot ? ` xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" width="${rasterWidth}" height="${rasterHeight}"` : '';
    return `<${node.tag} id="${xmlEscape(node.id)}"${bounds}${attrs}>${xmlEscape(node.text)}${node.children.map(child => serialize(child)).join('')}</${node.tag}>`;
  }
  return serialize(root, true);
}
