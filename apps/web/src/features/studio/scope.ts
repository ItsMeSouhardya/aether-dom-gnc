export const safeRouteId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export function studioScope(query: Record<string, string | string[] | undefined>): { projectId: string; branchId: string; error?: string } {
  if (!Object.keys(query).length) return { projectId: 'proj_neon_shogun', branchId: 'branch_main' };
  if (Object.keys(query).some(key => key !== 'projectId' && key !== 'branchId') || !safeRouteId(query.projectId) || !safeRouteId(query.branchId)) {
    return { projectId: 'proj_neon_shogun', branchId: 'branch_main', error: 'The studio project or branch address is invalid. Open the studio home to return to the main branch.' };
  }
  return { projectId: query.projectId, branchId: query.branchId };
}
export const studioHref = (projectId: string, branchId: string) => `/studio?${new URLSearchParams({ projectId, branchId })}`;
