import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Local-only landing server; archives and planning documents are outside its root.
const production = process.argv.includes('--production');
const root = resolve(fileURLToPath(new URL(production ? '../dist/' : '../landing-page/', import.meta.url)));
const runtimeFiles = new Set(['styles.css', 'app.js', 'cdom-section.js', 'assets/mark.svg', 'assets/fonts/manrope.woff2', 'assets/afterlight-world.png', 'assets/folio-world.png']);
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    const relative = path.startsWith('/welcome-assets/') ? path.slice('/welcome-assets/'.length) : path.replace(/^\/+/, '') || 'index.html';
    if (path.startsWith('/welcome-assets/') && !runtimeFiles.has(relative)) { res.writeHead(404).end('Not found'); return; }
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end('Not found'); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`AETHER-DOM landing page: http://127.0.0.1:${server.address().port}\nAfterlight v2${production ? ' · static build preview' : ''}`));
