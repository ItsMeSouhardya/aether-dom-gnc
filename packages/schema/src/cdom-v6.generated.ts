/* Generated from cdom.v0.6.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export interface CdomDocumentV6 {
  schemaVersion: '0.6.0';
  project: {
    id: string;
    title: string;
    description: string;
    revision: number;
    activeBranchId: string;
  };
  branches: {
    id: string;
    name: string;
    parentId: string | null;
    baseRevision: number;
    headRevision: number;
  }[];
  characters: {
    id: string;
    name: string;
    traits: {
      [k: string]: number;
    };
    dialect: {
      style: string;
      forbiddenTerms: string[];
    };
    constraints: {
      id: string;
      type: string;
      limb: string;
      effectiveFromEventId: string;
      resolvedByEventId: string | null;
    }[];
  }[];
  events: {
    id: string;
    sceneId: string;
    order: number;
    kind: string;
    description: string;
  }[];
  scenes: {
    id: string;
    title: string;
    eventIds: string[];
    shotIds: string[];
  }[];
  shots: {
    id: string;
    sceneId: string;
    durationMs: number;
    camera: {
      aspectRatio: '16:9' | '9:16' | '1:1';
      position: {
        x: number;
        y: number;
        z: number;
      };
      fovDeg: number;
    };
    layerIds: string[];
    audioTrackIds: string[];
    layoutOverrides: {
      [k: string]: {
        layerTransforms: {
          [k: string]: {
            x: number;
            y: number;
            z: number;
            scale: number;
            rotationDeg: number;
          };
        };
      };
    };
    audio?: {
      tension: number;
    };
    /**
     * @maxItems 8
     */
    hotspots?: {
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
    }[];
  }[];
  assets: {
    id: string;
    kind: 'svg' | 'raster' | 'audio' | 'video' | 'json';
    uri: string;
    rights: 'project_original' | 'licensed' | 'ai_generated' | 'unknown';
    name?: string;
    sourceUri?: string;
    provenance?: AssetProvenance;
  }[];
  layers: {
    id: string;
    shotId: string;
    kind: 'svg_plane' | 'character_sprite' | 'raster_plane' | 'rig';
    assetId: string;
    characterId: string | null;
    pose: string | null;
    transform: {
      x: number;
      y: number;
      z: number;
      scale: number;
      rotationDeg: number;
    };
    name?: string;
    visible?: boolean;
    opacity?: number;
    /**
     * @maxItems 128
     */
    keyframes?: {
      id: string;
      timeMs: number;
      transform: {
        x: number;
        y: number;
        z: number;
        scale: number;
        rotationDeg: number;
      };
    }[];
    rig?: Rig;
  }[];
  audioTracks: {
    id: string;
    shotId: string;
    kind: 'music' | 'foley' | 'dialogue';
    assetId: string;
    gainDb: number;
    boundLayerId: string | null;
  }[];
  bindings: {
    id: string;
    source: {
      entityId: string;
      path: string;
    };
    target: {
      entityId: string;
      path: string;
    };
    mapping:
      | {
          kind: 'identity';
        }
      | {
          kind: 'linear';
          inputMin: number;
          inputMax: number;
          outputMin: number;
          outputMax: number;
        };
  }[];
  provenance: {
    createdBy: string;
    generatedAssets: boolean;
    notes: string;
  };
}
export interface AssetProvenance {
  ledgerVersion: '1.0.0';
  original: {
    uri: string;
    sha256: string;
  };
  current: {
    uri: string;
    sha256: string;
    payloadSha256: string;
  };
  creator: string;
  source: string;
  license: string;
  attribution: string;
  permissions: {
    private_preview: 'allowed' | 'denied' | 'unknown';
    public_distribution: 'allowed' | 'denied' | 'unknown';
    commercial_pack: 'allowed' | 'denied' | 'unknown';
  };
  lineage: null | {
    provider: string;
    model: string;
    parentSha256: string | null;
  };
  /**
   * @minItems 2
   * @maxItems 2
   */
  consents: {
    kind: 'voice' | 'likeness';
    applicability: 'not_applicable' | 'unknown' | 'required';
    subject: string;
    status: 'allowed' | 'denied' | 'unknown';
    /**
     * @maxItems 3
     */
    uses: ('private_preview' | 'public_distribution' | 'commercial_pack')[];
    /**
     * @maxItems 8
     */
    evidenceHashes: string[];
  }[];
  /**
   * @maxItems 8
   */
  evidence: {
    uri: string;
    sha256: string;
    label: string;
  }[];
}
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
