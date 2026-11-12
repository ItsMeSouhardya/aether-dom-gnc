import { readFileSync } from 'node:fs';
import type { PlayerManifest } from '@aether-dom/schema';
import sample from '../../../packages/schema/fixtures/sample.cdom.json';

export function playerFixture(): PlayerManifest {
  const document = structuredClone(sample) as PlayerManifest['document'];
  return { manifestVersion: '1.0.0', document, assets: document.assets.map(asset => asset.kind === 'audio'
    ? { assetId: asset.id, kind: 'audio' as const, mimeType: 'audio/wav' as const, dataBase64: readFileSync(new URL(`../../../${asset.uri}`, import.meta.url)).toString('base64') }
    : { assetId: asset.id, kind: 'svg' as const, svg: { assetId: asset.id, uri: asset.uri, sourceUri: asset.uri, viewBox: { x: 0, y: 0, width: 130, height: 200 }, root: { tag: 'svg' as const, id: 'root', attributes: {}, text: '', children: [{ tag: 'rect' as const, id: 'shape', attributes: { width: '130', height: '200', fill: '#d7dfc7' }, text: '', children: [] }] } } }) };
}
