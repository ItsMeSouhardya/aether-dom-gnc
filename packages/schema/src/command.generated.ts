/* Generated from command.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export type CdomCommand =
  | (Envelope & {
      op: 'setLayerPose';
      targetId: string;
      args: {
        pose: string | null;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'recordConstraintRecovery';
      targetId: string;
      args: {
        eventId: string;
        sceneId: string;
        order: number;
        description: string;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setLayerTransform';
      targetId: string;
      args: Transform;
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'undo' | 'redo';
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setShotCamera';
      targetId: string;
      args: {
        camera: {
          aspectRatio: '16:9' | '9:16' | '1:1';
          position: {
            x: number;
            y: number;
            z: number;
          };
          fovDeg: number;
        };
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setLayerAppearance';
      targetId: string;
      args: {
        visible?: boolean;
        opacity?: number;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'importSvgLayer';
      targetId: string;
      args: {
        assetId: string;
        layerId: string;
        name: string;
        rights: 'project_original' | 'licensed' | 'unknown';
        svg: string;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'editSvgElement';
      targetId: string;
      args: {
        elementId: string;
        attributes: {
          [k: string]: string;
        };
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setLayerKeyframe';
      targetId: string;
      args: {
        keyframeId: string;
        timeMs: number;
        transform: {
          x: number;
          y: number;
          z: number;
          scale: number;
          rotationDeg: number;
        };
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'deleteLayerKeyframe';
      targetId: string;
      args: {
        keyframeId: string;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setShotTension';
      targetId: string;
      args: {
        tension: number;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'approveProposal';
      targetId: string;
      args: Record<string, never>;
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setShotLayoutOverride';
      targetId: string;
      args: {
        aspectRatio: '9:16';
        layerTransforms: {
          [k: string]: {
            x: number;
            y: number;
            z: number;
            scale: number;
            rotationDeg: number;
          };
        } | null;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setAssetEvidence';
      targetId: string;
      args: AssetEvidenceArgs;
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'importRigLayer';
      targetId: string;
      args: {
        assetId: string;
        layerId: string;
        name: string;
        rights: 'project_original' | 'licensed' | 'unknown';
        svg: string;
        characterId: string;
        rig: Rig;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setRigBonePose';
      targetId: string;
      args: {
        rotationDeg: number;
        action: string | null;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setRigBoneKeyframe';
      targetId: string;
      args: {
        keyframeId: string;
        timeMs: number;
        rotationDeg: number;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'deleteRigBoneKeyframe';
      targetId: string;
      args: {
        keyframeId: string;
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'setLoreHotspot';
      targetId: string;
      args: {
        hotspot: {
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
        };
      };
      [k: string]: unknown;
    })
  | (Envelope & {
      op: 'deleteLoreHotspot';
      targetId: string;
      args: {
        hotspotId: string;
      };
      [k: string]: unknown;
    });

export interface Envelope {
  commandId: string;
  projectId: string;
  branchId: string;
  expectedRevision: number;
  actor: {
    kind: 'human';
    id: string;
  };
  reason: string;
  [k: string]: unknown;
}
export interface Transform {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  rotationDeg?: number;
}
export interface AssetEvidenceArgs {
  rights: 'project_original' | 'licensed' | 'ai_generated' | 'unknown';
  expectedAssetUri: string;
  expectedSourceUri: string;
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
  consents: [
    {
      kind: 'voice' | 'likeness';
      applicability: 'not_applicable' | 'unknown' | 'required';
      subject: string;
      status: 'allowed' | 'denied' | 'unknown';
      /**
       * @maxItems 3
       */
      uses:
        | []
        | ['private_preview' | 'public_distribution' | 'commercial_pack']
        | [
            'private_preview' | 'public_distribution' | 'commercial_pack',
            'private_preview' | 'public_distribution' | 'commercial_pack'
          ]
        | [
            'private_preview' | 'public_distribution' | 'commercial_pack',
            'private_preview' | 'public_distribution' | 'commercial_pack',
            'private_preview' | 'public_distribution' | 'commercial_pack'
          ];
      /**
       * @maxItems 8
       */
      evidenceHashes:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string];
    },
    {
      kind: 'voice' | 'likeness';
      applicability: 'not_applicable' | 'unknown' | 'required';
      subject: string;
      status: 'allowed' | 'denied' | 'unknown';
      /**
       * @maxItems 3
       */
      uses:
        | []
        | ['private_preview' | 'public_distribution' | 'commercial_pack']
        | [
            'private_preview' | 'public_distribution' | 'commercial_pack',
            'private_preview' | 'public_distribution' | 'commercial_pack'
          ]
        | [
            'private_preview' | 'public_distribution' | 'commercial_pack',
            'private_preview' | 'public_distribution' | 'commercial_pack',
            'private_preview' | 'public_distribution' | 'commercial_pack'
          ];
      /**
       * @maxItems 8
       */
      evidenceHashes:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string];
    }
  ];
  /**
   * @maxItems 8
   */
  evidence:
    | []
    | [
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ]
    | [
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        },
        {
          label: string;
          text: string;
        }
      ];
}
export interface Rig {
  id: string;
  name: string;
  /**
   * @minItems 1
   * @maxItems 32
   */
  bones: [
    {
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
    },
    ...{
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
    }[]
  ];
  /**
   * @minItems 1
   * @maxItems 32
   */
  attachments: [
    {
      id: string;
      name: string;
      boneId: string;
      elementId: string;
    },
    ...{
      id: string;
      name: string;
      boneId: string;
      elementId: string;
    }[]
  ];
}
