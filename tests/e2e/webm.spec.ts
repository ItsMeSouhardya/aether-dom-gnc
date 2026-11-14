import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
const base = '/api/v1/projects/proj_neon_shogun/branches/branch_main';
async function openShortFile(page: Page, request: APIRequestContext) {
  const response = await request.get(`${base}/player-manifest?revision=0`); expect(response.ok()).toBe(true);
  const manifest = await response.json(); manifest.document.shots[0].durationMs = 2000;
  await page.goto('/player'); await expect(page.getByRole('region', { name: 'Saved composition player' })).toBeVisible();
  await page.getByLabel('Open local player JSON').setInputFiles({ name: 'short.cdom.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(manifest)) });
  await expect(page.getByText(/Local file · short.cdom.json/)).toBeVisible();
}

test('records a real portrait WebM with embedded audio and playable video bytes', async ({ page, request }, testInfo) => {
  const before = await (await request.get(`${base}/document`)).json();
  await openShortFile(page, request); await page.getByLabel('Player aspect ratio').selectOption('9:16');
  await page.getByLabel('WebM clip duration').fill('1');
  await page.getByRole('button', { name: 'Record WebM', exact: true }).click();
  const link = page.getByRole('link', { name: /Download WebM/ }); await expect(link).toBeVisible({ timeout: 20000 });
  const source = page.getByRole('link', { name: 'Source + evidence JSON' }); await expect(source).toBeVisible();
  expect(await source.getAttribute('download')).toBe('source-and-evidence.cdom.json');
  await page.screenshot({ path: `.impeccable/review/task10-player-${testInfo.project.name}.png`, fullPage: true });
  const url = await link.getAttribute('href');
  const metadata = await page.evaluate(async url => {
    const video = document.createElement('video'); video.src = url!; video.muted = true; document.body.append(video);
    try {
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('WebM metadata failed')); });
      await video.play(); await new Promise<void>(resolve => { video.ontimeupdate = () => { if (video.currentTime > .1) resolve(); }; });
      const stream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
      const result = { width: video.videoWidth, height: video.videoHeight, time: video.currentTime, audioTracks: stream.getAudioTracks().length };
      stream.getTracks().forEach(track => track.stop());
      const context = new AudioContext();
      try {
        const decoded = await context.decodeAudioData(await (await fetch(url!)).arrayBuffer());
        return { ...result, audioDuration: decoded.duration, amplitude: decoded.getChannelData(0).reduce((peak, value) => Math.max(peak, Math.abs(value)), 0) };
      } finally { await context.close(); }
    } finally { video.pause(); video.remove(); }
  }, url);
  expect(metadata.width).toBe(720); expect(metadata.height).toBe(1280); expect(metadata.time).toBeGreaterThan(.1); expect(metadata.audioTracks).toBe(1);
  expect(metadata.audioDuration).toBeCloseTo(1, 2); expect(metadata.amplitude).toBeGreaterThan(.0001);
  const downloadEvent = page.waitForEvent('download'); await link.click(); const download = await downloadEvent;
  const path = testInfo.outputPath('portrait-preview.webm'); await download.saveAs(path);
  const bytes = await (await import('node:fs/promises')).readFile(path);
  expect([...bytes.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]); expect(bytes.byteLength).toBeGreaterThan(5000);
  await page.screenshot({ path: testInfo.outputPath('webm-ready.png'), fullPage: true });
  expect((await (await request.get(`${base}/document`)).json()).document).toEqual(before.document);
});

test('cancels WebM without a partial download and reports unsupported codecs', async ({ page, request }) => {
  await openShortFile(page, request); await page.getByRole('button', { name: 'Record WebM', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel recording', exact: true }).click();
  await expect(page.getByRole('region', { name: 'WebM preview export' })).toContainText('Recording canceled');
  await expect(page.getByRole('link', { name: /Download WebM/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record WebM', exact: true })).toBeEnabled();
  await page.addInitScript(() => { if (typeof MediaRecorder !== 'undefined') Object.defineProperty(MediaRecorder, 'isTypeSupported', { value: () => false }); });
  await page.reload(); await expect(page.getByRole('button', { name: 'Record WebM', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'WebM preview export' })).toContainText('portable JSON remains available');
});
