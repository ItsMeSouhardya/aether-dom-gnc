import { validateSvgAsset, type CdomDocument, type SvgAsset } from '@aether-dom/schema';
import { projectBase } from './project-api';

export async function loadSvgAsset(document: Pick<CdomDocument, 'project'> | { project: { id: string; activeBranchId: string; revision: number } }, asset: { id: string; uri: string }, signal?: AbortSignal): Promise<SvgAsset> {
  const response = await fetch(`${projectBase(document.project.id, document.project.activeBranchId)}/assets/${encodeURIComponent(asset.id)}?revision=${document.project.revision}`, { cache: 'no-store', signal });
  const value: unknown = await response.json();
  if (!response.ok) {
    const detail = value && typeof value === 'object' && 'detail' in value ? value.detail : null;
    throw new Error(detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string' ? detail.message : 'SVG source unavailable.');
  }
  const parsed = validateSvgAsset(value);
  if (!parsed.valid || parsed.asset.assetId !== asset.id || parsed.asset.uri !== asset.uri) throw new Error('The SVG response does not match this saved asset.');
  return parsed.asset;
}
