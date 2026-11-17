import { describe, expect, it } from 'vitest';
import { readWelcomeDocument, readWelcomeAsset, welcomeAssets } from '../src/lib/welcome-assets';
import { welcomeHref, savedStudioHref } from '../src/lib/welcome-navigation';

describe('canonical welcome delivery from the web working directory', () => {
  it('loads the full source document and exactly seven local runtime resources', async () => {
    const document = await readWelcomeDocument();
    expect(document.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await document.text()).toContain('<!doctype html>');
    expect(Object.keys(welcomeAssets)).toHaveLength(7);
    for (const [name, type] of Object.entries(welcomeAssets)) {
      const response = await readWelcomeAsset(name.split('/'));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(type);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
    }
  });
  it.each([[], ['..', 'index.html'], ['assets', '..', 'mark.svg'], ['assets/mark.svg'], ['%2e%2e'], ['styles.css?x'], ['assets', 'fonts', 'license.txt'], ['__proto__'], ['constructor'], ['assets', 'mark.svg', '']])('rejects paths outside the fixed runtime allowlist: %j', async (...parts) => {
    expect((await readWelcomeAsset(parts)).status).toBe(404);
  });
  it('keeps source module and image/font references in the dedicated namespace', async () => {
    const html = await (await readWelcomeDocument()).text();
    const js = await (await readWelcomeAsset(['app.js'])).text();
    const css = await (await readWelcomeAsset(['styles.css'])).text();
    expect(html).toContain('/welcome-assets/app.js');
    expect(html).toContain('/welcome-assets/styles.css');
    expect(js).toContain("from './cdom-section.js'");
    expect(js).toContain('/welcome-assets/assets/afterlight-world.png');
    expect(css).toContain('/welcome-assets/assets/fonts/manrope.woff2');
  });
});

describe('saved source return navigation', () => {
  it('encodes only a complete valid saved API scope', () => {
    expect(welcomeHref('project_1', 'branch_2')).toBe('/welcome?projectId=project_1&branchId=branch_2');
    expect(savedStudioHref('project_1', 'branch_2')).toBe('/studio?projectId=project_1&branchId=branch_2');
    for (const value of [undefined, '', '../evil', 'a\n', '<script>', 'a'.repeat(129)]) {
      expect(welcomeHref(value, 'branch')).toBe('/welcome');
      expect(savedStudioHref('project', value)).toBe('/studio');
    }
  });
});
