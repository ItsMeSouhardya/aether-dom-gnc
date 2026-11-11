// Frozen reference viewer. Main-page changes must not modify this archive.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const variant = process.argv[2];
if (!['afterlight-v1', 'signal'].includes(variant)) throw new Error('Choose afterlight-v1 or signal');
const root = resolve(dirname(fileURLToPath(import.meta.url)), variant);
const port = Number(process.env.PORT || (variant === 'afterlight-v1' ? 4181 : 4182));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, pathname.replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Frozen ${variant} reference: http://localhost:${port}`));
