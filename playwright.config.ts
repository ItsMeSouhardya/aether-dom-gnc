import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync } from 'node:fs';

const databasePath = resolve('data', `e2e-${randomUUID()}.sqlite3`);
const assetRoot = `${databasePath}.assets`;
mkdirSync(resolve(assetRoot, 'assets'), { recursive: true });
cpSync(resolve('assets/fixtures'), resolve(assetRoot, 'assets/fixtures'), { recursive: true });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'node tools/api.mjs serve', url: 'http://127.0.0.1:8100/api/v1/health', reuseExistingServer: false, timeout: 60000, env: { AETHER_API_PORT: '8100', AETHER_DATABASE_PATH: databasePath, AETHER_ASSET_ROOT: assetRoot } },
    { command: `pnpm --filter web exec next ${process.env.AETHER_E2E_DEV === '1' ? 'dev' : 'start'} --hostname 127.0.0.1 --port 3100`, url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 60000, env: { AETHER_API_ORIGIN: 'http://127.0.0.1:8100' } },
  ],
});
