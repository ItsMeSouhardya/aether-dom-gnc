/* Generated from rig.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export interface Rig {
  id: string;
  name: string;
  /**
   * @minItems 1
   * @maxItems 32
   */
  bones: {
    id: string;
    name: string;
    parentId: string | null;
    rest: {
      x: number;
      y: number;
      rotationDeg: number;
    };
    rotationDeg: number;
    limb: string | null;
    action: string | null;
    /**
     * @maxItems 128
     */
    keyframes?: {
      id: string;
      timeMs: number;
      rotationDeg: number;
    }[];
  }[];
  /**
   * @minItems 1
   * @maxItems 32
   */
  attachments: {
    id: string;
    name: string;
    boneId: string;
    elementId: string;
  }[];
}
