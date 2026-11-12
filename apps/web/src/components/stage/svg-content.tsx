'use client';

import { createElement, type PointerEvent, type ReactElement } from 'react';
import { checkedSvgTree, scopedSvgId, type SvgNode } from '../../features/stage/svg-tree';

export { serializeSvg as svgMarkup } from '../../features/stage/svg-tree';

export type SvgContentProps = { node: SvgNode; scopeId: string; selectedId?: string | null; onSelect?: (id: string) => void };

const reactNames: Record<string, string> = {
  'fill-opacity': 'fillOpacity', 'fill-rule': 'fillRule', 'stroke-width': 'strokeWidth', 'stroke-opacity': 'strokeOpacity',
  'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'stroke-miterlimit': 'strokeMiterlimit', 'stroke-dasharray': 'strokeDasharray', 'stroke-dashoffset': 'strokeDashoffset',
  'font-family': 'fontFamily', 'font-size': 'fontSize', 'font-weight': 'fontWeight', 'text-anchor': 'textAnchor', 'dominant-baseline': 'dominantBaseline', 'letter-spacing': 'letterSpacing', 'clip-rule': 'clipRule', 'vector-effect': 'vectorEffect',
};

export function SvgContent({ node, scopeId, selectedId, onSelect }: SvgContentProps) {
  const safeRoot = checkedSvgTree(node);
  function render(current: SvgNode): ReactElement {
    const attributes = Object.fromEntries(Object.entries(current.attributes).map(([name, value]) => [reactNames[name] ?? name, value]));
    return createElement(current.tag, {
      ...attributes,
      key: current.id,
      id: scopedSvgId(scopeId, current.id),
      'data-element-id': current.id,
      'data-selected': current.id === selectedId ? 'true' : undefined,
      ...(onSelect ? { onPointerDown: (event: PointerEvent<SVGElement>) => { event.stopPropagation(); onSelect(current.id); } } : {}),
      ...(current.tag === 'svg' ? { width: '100%', height: '100%', overflow: 'visible' } : {}),
    }, current.text || null, ...current.children.map(render));
  }
  return render(safeRoot);
}

