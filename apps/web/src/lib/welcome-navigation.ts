function savedScope(projectId?: string, branchId?: string): string {
  const valid = (value: string | undefined): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9]/.test(value) && !/[^A-Za-z0-9_-]/.test(value);
  return valid(projectId) && valid(branchId) ? `?${new URLSearchParams({ projectId, branchId })}` : '';
}

export const welcomeHref = (projectId?: string, branchId?: string) => `/welcome${savedScope(projectId, branchId)}`;
export const savedStudioHref = (projectId?: string, branchId?: string) => `/studio${savedScope(projectId, branchId)}`;
