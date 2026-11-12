import type { SvgAsset } from '@aether-dom/schema';
export type AssetState = { svg?: SvgAsset; error?: string };
export const assetKey = (asset: { id: string; uri: string }) => `${asset.id}:${asset.uri}`;
