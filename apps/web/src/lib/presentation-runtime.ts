import 'server-only';

export function presentationRuntime() {
  const workspace = process.env.AETHER_PRESENTATION_WORKSPACE;
  const instance = process.env.AETHER_PRESENTATION_INSTANCE;
  return workspace && /^[a-z0-9][a-z0-9-]{0,79}$/.test(workspace) && instance
    ? { workspace, instance, apiOrigin: /^http:\/\/127\.0\.0\.1:[0-9]{4,5}$/.test(process.env.AETHER_API_ORIGIN ?? '') ? process.env.AETHER_API_ORIGIN : null } : null;
}
