import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { freshDirectory, workspaceManifest } from './workspaces.mjs';
import { readStable, writeNew, hash, safePath, scanTree } from '../checkpoints/safety.mjs';

export async function capture(config, ws, { origin, channel, out }) {
  const url = new URL(origin);
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password || channel !== 'msedge') throw new Error('Capture requires owned loopback origin and installed --channel msedge');
  const request = async route => {
    const response = await fetch(`${url.origin}${route}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Capture request refused: ${route} (${response.status})`);
    return response.json();
  };
  const identity = await request('/api/presentation-runtime');
  const health = await request('/api/v1/health');
  if (identity.workspace !== ws.id || !identity.instance || health.presentationInstance !== identity.instance || health.presentationWorkspace !== ws.id) throw new Error('Capture origin is not the selected owned presentation runtime');
  const prepared = await workspaceManifest(ws);
  // CLI capture is a trusted local tool like the worker/backup commands. Read
  // the identified loopback API directly; never mint or bypass a browser login.
  const apiOrigin = new URL(identity.apiOrigin);
  if (apiOrigin.hostname !== '127.0.0.1' || apiOrigin.protocol !== 'http:' || apiOrigin.pathname !== '/' || apiOrigin.search || apiOrigin.hash || apiOrigin.username || apiOrigin.password) throw new Error('Capture requires an identified loopback API');
  const apiRequest = async route => {
    const response = await fetch(`${apiOrigin.origin}${route}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Capture API request refused (${response.status})`);
    return response.json();
  };
  const apiHealth = await apiRequest('/api/v1/health');
  if (apiHealth.presentationInstance !== identity.instance || apiHealth.presentationWorkspace !== ws.id) throw new Error('Capture API identity differs from the selected runtime');
  const base = `/api/v1/projects/${encodeURIComponent(prepared.projectId)}/branches/${encodeURIComponent(prepared.branchId)}`;
  const saved = await apiRequest(`${base}/document`);
  const revision = saved.document.project.revision;
  const manifest = await apiRequest(`${base}/player-manifest?revision=${revision}&use=public_distribution`);
  if (manifest.document.project.revision !== revision || manifest.exportUse !== 'public_distribution') throw new Error('Capture must use exact permitted saved revision');
  const destination = path.resolve(config.root, out);
  await safePath(destination, { missing: true });
  try { await fs.lstat(destination); throw new Error('Capture destination already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const staging = `${destination}.incomplete-${randomUUID()}`;
  await freshDirectory(staging);
  const json = Buffer.from(JSON.stringify(manifest, null, 2));
  await writeNew(path.join(staging, 'presentation.cdom.json'), json);
  const require = createRequire(path.join(config.root, 'package.json'));
  const { chromium } = require('@playwright/test');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const recordings = {};
  try {
    for (const [name, aspect, width, height] of [['landscape', '16:9', 1280, 720], ['portrait', '9:16', 720, 1280]]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
      try {
        await context.route('**/api/v1/**', route => route.abort()); // Playback/recording must work offline.
        const page = await context.newPage();
        await page.goto(`${url.origin}/player`);
        await page.getByLabel('Open local player JSON').setInputFiles({ name: 'presentation.cdom.json', mimeType: 'application/json', buffer: json });
        await page.getByLabel('Player aspect ratio').selectOption(aspect);
        await page.getByRole('region', { name: 'WebM preview export' }).getByRole('combobox').selectOption('public_distribution');
        await page.getByLabel('WebM clip duration').fill('2');
        await page.getByRole('button', { name: 'Record WebM', exact: true }).click();
        const link = page.getByRole('link', { name: /Download WebM/ });
        await link.waitFor({ state: 'visible', timeout: 45000 });
        const href = await link.getAttribute('href');
        const downloading = page.waitForEvent('download'); await link.click();
        await (await downloading).saveAs(path.join(staging, `${name}.webm`));
        const decoded = await page.evaluate(async href => {
          const video = document.createElement('video'); video.src = href; video.muted = true;
          document.body.append(video);
          const bound = promise => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Decode timed out')), 15000))]);
          try {
            await bound(new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; }));
            const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            const frame = async time => {
              await bound(new Promise(resolve => { video.onseeked = resolve; video.currentTime = time; }));
              // seeked can precede presentation of the newly decoded frame in
              // headless Edge. Wait for its compositor before sampling pixels.
              await bound(new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
              context.drawImage(video, 0, 0, 128, 128);
              return Array.from(context.getImageData(0, 0, 128, 128).data);
            };
            const first = await frame(.1);
            let changed = 0;
            for (const time of [.4, .7, 1, 1.3, 1.7]) {
              const second = await frame(time);
              changed = Math.max(changed, first.filter((value, index) => Math.abs(value - second[index]) > 8).length);
            }
            const audio = new AudioContext();
            try {
              const decoded = await audio.decodeAudioData(await (await fetch(href)).arrayBuffer());
              const amplitude = decoded.getChannelData(0).reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
              return { width: video.videoWidth, height: video.videoHeight, changedPixels: changed, audioDuration: decoded.duration, amplitude };
            } finally { await audio.close(); }
          } finally { video.remove(); }
        }, href);
        if (decoded.width !== width || decoded.height !== height || decoded.changedPixels < 5 || decoded.amplitude <= .0001 || Math.abs(decoded.audioDuration - 2) > .15) throw new Error(`Recorded ${name} decode/motion/audio verification failed: ${JSON.stringify(decoded)}`);
        const companion = await page.getByRole('link', { name: 'Source + evidence JSON' }).getAttribute('href');
        const companionBytes = await page.evaluate(async href => await (await fetch(href)).text(), companion);
        if (JSON.stringify(JSON.parse(companionBytes)) !== JSON.stringify(manifest)) throw new Error('Video companion differs from exact captured source');
        recordings[name] = decoded;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  const attributions = [...new Set(manifest.document.assets.map(asset => asset.provenance?.attribution).filter(Boolean))];
  await writeNew(path.join(staging, 'ATTRIBUTION.txt'), attributions.join('\n') + '\nOriginal fixture source evidence is embedded in presentation.cdom.json. No commercial grant or legal clearance is asserted.\n');
  await writeNew(path.join(staging, 'README.md'), `# Original presentation fallback\n\nSaved public-distribution revision ${revision}. Open presentation.cdom.json in the local player. Both WebMs were recorded offline with installed Edge, decoded for dimensions, changing frames and nonzero audio. Keep JSON and attribution with videos. Interactive hotspots are in JSON, not WebM.\n`);
  const files = {};
  for (const name of await scanTree(staging)) { const entry = await readStable(path.join(staging, name)); files[name] = { sha256: entry.sha256, size: entry.size }; }
  await writeNew(path.join(staging, 'manifest.json'), JSON.stringify({ version: 1, workspace: ws.id, revision, exportUse: 'public_distribution', sourceSha256: hash(json), files, recordings }, null, 2));
  await fs.rename(staging, destination);
  return { path: destination, revision, recordings };
}
