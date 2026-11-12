import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../svg.schema.json';
import type { SvgAsset, Node as SvgNode } from './svg.generated';
import type { ValidationIssue } from './index';
import { hasNonScalarText } from './portable';

export type { SvgAsset, Node as SvgNode } from './svg.generated';
export type SvgData = Pick<SvgAsset, 'viewBox' | 'root'>;
const validate = new Ajv2020({ allErrors: true, strict: true }).compile<SvgAsset>(schema);
const presentation = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'clip-rule', 'vector-effect', 'transform'];
const geometry: Record<SvgNode['tag'], string[]> = {
  svg: ['width', 'height', 'preserveAspectRatio'], g: [], path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'], ellipse: ['cx', 'cy', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'], polygon: ['points'], text: ['x', 'y', 'dx', 'dy', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing'],
};
const numberPattern = /[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/g;
const numeric = (text: string): boolean => {
  const values = text.match(numberPattern);
  return !!values?.length && !text.replace(numberPattern, '').replace(/[\s,]/g, '')
    && values.every(value => Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 1e6);
};
const enums: Record<string, string[]> = {
  'stroke-linecap':['butt','round','square'], 'stroke-linejoin':['miter','round','bevel'],
  'fill-rule':['nonzero','evenodd'], 'clip-rule':['nonzero','evenodd'], 'vector-effect':['none','non-scaling-stroke'],
  'text-anchor':['start','middle','end'], 'dominant-baseline':['auto','middle','central','hanging','alphabetic','text-before-edge','text-after-edge'],
  'font-weight':['normal','bold','100','200','300','400','500','600','700','800','900'],
};
function safeAttribute(key: string, value: string): boolean {
  if (/url\s*\(|javascript:|data:|[<>]/i.test(value)
    || [...value].some(char => char.charCodeAt(0) < 32 && !['\t','\n','\r'].includes(char))) return false;
  if (key === 'fill' || key === 'stroke') return /^(?:#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|[A-Za-z]{1,32})$/.test(value);
  if (enums[key]) return enums[key].includes(value);
  if (key === 'font-family') return /^[A-Za-z][A-Za-z0-9 ,'-]{0,127}$/.test(value);
  if (key === 'preserveAspectRatio') return /^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(value);
  if (key === 'd') return /^[\s,MLHVCSQTAZmlhvcsqtaz0-9eE.+-]+$/.test(value) && numeric(value.replace(/[MLHVCSQTAZmlhvcsqtaz]/g,' '));
  if (key === 'transform') {
    let count = 0;
    const arity: Record<string, number[]> = {matrix:[6],translate:[1,2],scale:[1,2],rotate:[1,3],skewX:[1],skewY:[1]};
    const remaining = value.replace(/([A-Za-z]+)\s*\(([^()]*)\)/g, (whole, name: string, args: string) => {
      if (!Object.hasOwn(arity,name) || !arity[name].includes(args.match(numberPattern)?.length ?? 0) || !numeric(args)) return whole;
      count++; return '';
    });
    return count > 0 && count <= 32 && !remaining.replace(/[\s,]/g,'');
  }
  if (!numeric(value)) return false;
  const values = value.match(numberPattern)!;
  if (key === 'points') return values.length >= 4 && values.length % 2 === 0;
  if (values.length !== 1) return false;
  const number = Number(values[0]);
  if (['opacity','fill-opacity','stroke-opacity'].includes(key)) return number >= 0 && number <= 1;
  return !['width','height','rx','ry','r','stroke-width','font-size','stroke-miterlimit'].includes(key) || number >= 0;
}

export function validateSvgAsset(value: unknown): { valid: true; asset: SvgAsset } | { valid: false; issues: ValidationIssue[] } {
  const fail = (message: string) => ({valid: false as const, issues: [{path:'/',message}]});
  // Bound untrusted recursion before AJV/portable-text traverse recursive nodes.
  if (typeof value !== 'object' || value === null || !('root' in value)) return fail('Invalid SVG structure');
  const pending: {node:unknown;depth:number}[] = [{node:value.root,depth:1}];
  let size = 0;
  while (pending.length) {
    const {node,depth} = pending.pop()!;
    if (++size > 512 || depth > 16 || typeof node !== 'object' || node === null || !('children' in node) || !Array.isArray(node.children)) return fail('Invalid SVG tree bounds');
    if (node.children.length > 512) return fail('Invalid SVG tree bounds');
    pending.push(...node.children.map(node => ({node,depth:depth+1})));
  }
  if (!validate(value)) return fail('Invalid SVG asset structure');
  if (hasNonScalarText(value)) return fail('Text must contain Unicode scalar values');
  if (!Object.values(value.viewBox).every(number => Number.isFinite(number) && Math.abs(number) <= 1e6)) return fail('Invalid SVG viewBox');
  const ids = new Set<string>();
  let count = 0, textSize = 0;
  const stack = [{node:value.root,depth:1}];
  if (value.root.tag !== 'svg') return fail('SVG root required');
  while (stack.length) {
    const {node,depth} = stack.pop()!;
    const textBytes = new TextEncoder().encode(node.text).length;
    textSize += textBytes;
    if (++count > 512 || depth > 16 || textSize > 262144 || textBytes > 16384 || ids.has(node.id) || !/^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/.test(node.id)) return fail('SVG tree exceeds bounds or has duplicate IDs');
    ids.add(node.id);
    for (const [key, attribute] of Object.entries(node.attributes)) {
      const length = new TextEncoder().encode(attribute).length;
      textSize += length;
      if (![...presentation,...geometry[node.tag]].includes(key) || !safeAttribute(key,attribute) || length > (['d','points'].includes(key) ? 32768 : 1024) || textSize > 262144) return fail('Unsafe SVG attribute');
    }
    if (node.tag !== 'svg' && node.tag !== 'g' && node.children.length) return fail('Invalid SVG children');
    if (node.tag !== 'text' && node.text.trim()) return fail('Invalid SVG text');
    stack.push(...node.children.map(node => ({node,depth:depth+1})));
  }
  return {valid:true,asset:value};
}
