'use client';

import { useEffect, useState } from 'react';
import type { CdomDocument, SvgAsset } from '@aether-dom/schema';
import { loadSvgAsset } from '@/lib/svg-asset-api';

export type AssetState = { svg?: SvgAsset; error?: string };
export const assetKey = (asset: { id: string; uri: string }) => `${asset.id}:${asset.uri}`;
export function useSvgAssets(document: CdomDocument) {
  const [assets, setAssets] = useState<Record<string, AssetState>>({});
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    for (const asset of document.assets.filter(asset => asset.kind === 'svg')) {
      const key = assetKey(asset);
      void loadSvgAsset(document, asset, controller.signal).then(svg => {
        if (active) setAssets(previous => ({ ...previous, [key]: { svg } }));
      }).catch((error: unknown) => {
        if (active) setAssets(previous => ({ ...previous, [key]: { error: error instanceof Error ? error.message : 'SVG source unavailable.' } }));
      });
    }
    return () => { active = false; controller.abort(); };
  }, [document]);
  return assets;
}
