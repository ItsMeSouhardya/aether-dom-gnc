import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// The Next server starts from apps/web. Production tracing retains this same
// repository-relative source layout; no editable or generated HTML copy is used.
const landingRoot = resolve(process.cwd(), '../../landing-page');
export const welcomeAssets = {
  'styles.css': 'text/css; charset=utf-8',
  'app.js': 'text/javascript; charset=utf-8',
  'cdom-section.js': 'text/javascript; charset=utf-8',
  'assets/mark.svg': 'image/svg+xml',
  'assets/fonts/manrope.woff2': 'font/woff2',
  'assets/afterlight-world.png': 'image/png',
  'assets/folio-world.png': 'image/png',
} as const;

async function sourceResponse(name: string, type: string): Promise<Response> {
  const [root, file] = await Promise.all([realpath(landingRoot), realpath(resolve(landingRoot, name))]);
  if (!file.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(await readFile(file)), { headers: {
    'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}

export function readWelcomeDocument(): Promise<Response> {
  return sourceResponse('index.html', 'text/html; charset=utf-8');
}

export function readWelcomeAsset(parts: string[]): Promise<Response> {
  // Reject separators inside individual decoded route segments as well as all
  // unknown names. Only keys in this literal map ever reach filesystem access.
  const name = parts.join('/');
  if (parts.some(part => !part || /[\\/]/.test(part)) || !Object.hasOwn(welcomeAssets, name)) return Promise.resolve(new Response('Not found', { status: 404 }));
  const key = name as keyof typeof welcomeAssets;
  return sourceResponse(key, welcomeAssets[key]);
}
