import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '.venv/**', 'design_archive/**', 'design_specifications/vendor/**', 'landing-page/**', 'tools/**', '**/cdom.generated.ts', 'playwright-report/**', 'test-results/**'] },
  ...tseslint.config({ files: ['packages/**/*.ts', 'tests/**/*.ts', 'playwright.config.ts'], extends: [js.configs.recommended, ...tseslint.configs.recommended] }),
  ...nextVitals.map(config => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,mjs}'] })),
  ...nextTypescript.map(config => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,mjs}'] })),
  { files: ['apps/web/**/*.{ts,tsx,js,mjs}'], settings: { next: { rootDir: 'apps/web/' } } },
];
