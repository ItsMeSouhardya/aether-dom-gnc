import path from 'node:path';
import net from 'node:net';
import { promises as fs, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { slug, safePath, readStable } from '../checkpoints/safety.mjs';

export function workspacePaths(root, id) {
  slug(id);
  const directory = path.resolve(root, 'data/presentation/workspaces', id);
  return { id, root: directory, database: path.join(directory, 'workspace.sqlite3'), manifest: path.join(directory, 'workspace.json') };
}

export function runtimeEnvironment(base, ws, apiPort, instance = randomUUID()) {
  return { ...base, AETHER_DATABASE_PATH: ws.database, AETHER_ASSET_ROOT: ws.root,
    AETHER_API_ORIGIN: `http://127.0.0.1:${apiPort}`, AETHER_PRESENTATION_WORKSPACE: ws.id,
    AETHER_PRESENTATION_INSTANCE: instance, PYTHONDONTWRITEBYTECODE: '1', NEXT_TELEMETRY_DISABLED: '1' };
}

export async function configuration(root) {
  const env = { ...process.env };
  const local = path.join(root, '.env.api.local');
  if (existsSync(local)) {
    const { parseEnv } = await import('node:util');
    Object.assign(env, parseEnv((await readStable(local)).bytes.toString('utf8')));
  }
  const python = path.resolve(root, env.AETHER_PYTHON || `.venv/${process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'}`);
  await safePath(python);
  const next = path.join(root, 'apps/web/node_modules/next/dist/bin/next');
  if (!existsSync(next)) throw new Error('Installed Next missing; install prepared dependencies before presentation.');
  return { root, python, next, env };
}

export function child(command, args, options = {}) {
  const process = spawn(command, args, { shell: false, windowsHide: true, ...options });
  process.spawnFailure = null;
  process.on('error', error => { process.spawnFailure = error; });
  return process;
}

export async function stopOwned(children) {
  await Promise.all(children.map(async process => {
    if (process.exitCode !== null || process.signalCode !== null) return;
    const closed = new Promise(resolve => process.once('close', resolve));
    process.kill('SIGTERM');
    let timer;
    await Promise.race([closed, new Promise(resolve => { timer = setTimeout(resolve, 2500); })]);
    clearTimeout(timer);
    if (process.exitCode === null && process.signalCode === null) {
      process.kill('SIGKILL');
      await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 2500))]);
    }
  }));
}

export async function run(command, args, { timeout = 120000, ...options } = {}) {
  const owned = child(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
  let stdout = '', stderr = '';
  owned.stdout?.on('data', data => { stdout += data; if (stdout.length > 16 * 1024 * 1024) owned.kill(); });
  owned.stderr?.on('data', data => { stderr = (stderr + data).slice(-128 * 1024); });
  let timer;
  try {
    const outcome = await Promise.race([
      new Promise((resolve, reject) => { owned.once('error', reject); owned.once('close', code => resolve(code)); }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Owned preparation process timed out')), timeout); }),
    ]);
    if (outcome !== 0) throw new Error(`Preparation process exited ${outcome}: ${stderr || stdout}`);
    return stdout;
  } finally { clearTimeout(timer); await stopOwned([owned]); }
}

export function port(value, fallback) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < 1024 || number > 65535) throw new Error('Port must be an integer from 1024 to 65535');
  return number;
}

export async function assertPortFree(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', error => reject(new Error(`Loopback port ${port} occupied/unavailable: ${error.code}`)));
    server.listen({ host: '127.0.0.1', port, exclusive: true }, resolve);
  });
  await new Promise(resolve => server.close(resolve));
}

export async function waitReady({ children, probe, timeout = 45000, interval = 150 }) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (children.some(process => process.spawnFailure || process.exitCode !== null || process.signalCode)) throw new Error('Owned service exited before readiness');
    try { if (await probe()) return; } catch { /* Finite polling while owned services bind. */ }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Owned service readiness timed out');
}

export async function pythonOperation(config, ws, operation, extra = []) {
  return JSON.parse(await run(config.python, ['-m', 'app.presentation_workspace', operation, '--root', ws.root, ...extra], {
    cwd: path.join(config.root, 'apps/api'), env: runtimeEnvironment(config.env, ws, 8300),
  }));
}

export async function preflight(config) {
  await run(config.python, ['-c', 'import fastapi, sqlalchemy, uvicorn, sqlite3; print("ready")'], { cwd: config.root, env: config.env, timeout: 15000 });
}

export async function launch(config, ws, { webPort = 3300, apiPort = 8300, timeout = 45000 } = {}) {
  if (webPort === apiPort) throw new Error('Web/API ports must differ');
  await preflight(config);
  await Promise.all([assertPortFree(webPort), assertPortFree(apiPort)]);
  const instance = randomUUID(), env = runtimeEnvironment(config.env, ws, apiPort, instance);
  const children = [];
  const cancel = () => { void stopOwned(children); };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    children.push(child(config.python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(apiPort)], { cwd: path.join(config.root, 'apps/api'), env, stdio: 'inherit' }));
    children.push(child(process.execPath, [config.next, 'start', '--hostname', '127.0.0.1', '--port', String(webPort)], { cwd: path.join(config.root, 'apps/web'), env, stdio: 'inherit' }));
    const origin = `http://127.0.0.1:${webPort}`;
    await waitReady({ children, timeout, probe: async () => {
      const request = async url => fetch(url, { signal: AbortSignal.timeout(1500), cache: 'no-store' });
      const api = await (await request(`http://127.0.0.1:${apiPort}/api/v1/health`)).json();
      const web = await (await request(`${origin}/api/presentation-runtime`)).json();
      const welcome = await request(`${origin}/welcome`);
      return api.presentationInstance === instance && api.presentationWorkspace === ws.id &&
        web.instance === instance && web.workspace === ws.id && welcome.ok;
    } });
    // Recheck liveness after health to refuse a competing listener winning a bind race.
    if (children.some(process => process.exitCode !== null || process.signalCode)) throw new Error('Owned service exited at readiness');
    return { children, origin, instance };
  } catch (error) { await stopOwned(children); throw error; }
  finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
