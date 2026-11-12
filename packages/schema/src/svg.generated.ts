/* Generated from svg.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export interface SvgAsset {
  assetId: string;
  uri: string;
  sourceUri: string;
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  root: Node;
}
export interface Node {
  tag: 'svg' | 'g' | 'path' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polyline' | 'polygon' | 'text';
  id: string;
  attributes: {
    [k: string]: string;
  };
  text: string;
  /**
   * @maxItems 512
   */
  children: Node[];
}
