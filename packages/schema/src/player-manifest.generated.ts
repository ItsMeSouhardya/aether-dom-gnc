/* Generated from player-manifest.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type PlayerManifestWire = {
  manifestVersion: '1.0.0' | '1.1.0';
  exportUse?: 'private_preview' | 'public_distribution' | 'commercial_pack';
  /**
   * @maxItems 512
   */
  evidence?: {
    uri: string;
    sha256: string;
    text: string;
  }[];
  /**
   * Validated separately against its unchanged canonical document version.
   */
  document: {
    [k: string]: unknown;
  };
  /**
   * @maxItems 64
   */
  assets: (
    | {
        assetId: string;
        kind: 'svg';
        svg: SvgAsset;
      }
    | {
        assetId: string;
        kind: 'audio';
        mimeType: 'audio/wav';
        dataBase64: string;
      }
  )[];
};

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
