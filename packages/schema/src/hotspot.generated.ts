/* Generated from hotspot.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export interface LoreHotspot {
  id: string;
  label: string;
  targetKind: 'character' | 'event';
  targetId: string;
  positions: {
    '16:9': {
      x: number;
      y: number;
    };
    '9:16': {
      x: number;
      y: number;
    };
  };
}
