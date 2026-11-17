import { request, type FullConfig } from '@playwright/test';

export default async function setup(config: FullConfig) {
  const origin = config.projects[0].use.baseURL!;
  const api = await request.newContext({ baseURL: origin, extraHTTPHeaders: { Origin: origin } });
  try {
    const status = await (await api.get('/api/auth/session')).json();
    const result = await api.post(`/api/auth/${status.configured ? 'login' : 'register'}`, { data: { name: 'Test creator', email: 'creator@example.test', password: 'test-only local password' } });
    if (!result.ok()) throw new Error(`Isolated test account setup failed: ${result.status()}`);
    await api.storageState({ path: process.env.AETHER_E2E_AUTH_STATE! });
  } finally { await api.dispose(); }
}
