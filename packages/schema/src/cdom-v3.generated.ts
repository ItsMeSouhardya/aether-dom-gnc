/* Generated from cdom.v0.3.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export interface CdomDocumentV3 {
  schemaVersion: '0.3.0';
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
  }[];
  assets: {
    id: string;
    kind: 'svg' | 'raster' | 'audio' | 'video' | 'json';
    uri: string;
    rights: 'project_original' | 'licensed' | 'ai_generated' | 'unknown';
    name?: string;
    sourceUri?: string;
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
