import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configuration, workspacePaths, preflight, launch, child, stopOwned, runtimeEnvironment, port } from './presentation/runtime.mjs';
import { build, verifyBuild } from './presentation/build.mjs';
import { setup, workspaceManifest, verifyWorkspace, backupWorkspace, restoreWorkspace } from './presentation/workspaces.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = { build: [], setup: ['workspace', 'with-reviewed-job'], start: ['workspace', 'web-port', 'api-port'], worker: ['workspace', 'once'], capture: ['workspace', 'origin', 'channel', 'out'], backup: ['workspace', 'label'], restore: ['backup', 'workspace'], verify: ['workspace'] };
const required = { build: [], setup: ['workspace'], start: ['workspace'], worker: ['workspace'], capture: ['workspace', 'origin', 'channel', 'out'], backup: ['workspace', 'label'], restore: ['backup', 'workspace'], verify: ['workspace'] };

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args, options = {};
  if (!Object.hasOwn(allowed, command)) throw new Error('Expected build, setup, start, worker, capture, backup, restore or verify');
  for (let index = 0; index < rest.length; index++) {
    const key = rest[index].slice(2);
    if (!rest[index].startsWith('--') || !allowed[command].includes(key) || Object.hasOwn(options, key)) throw new Error('Unknown/duplicate presentation option');
    if (['once', 'with-reviewed-job'].includes(key)) options[key] = true;
    else { const value = rest[++index]; if (!value || value.startsWith('--')) throw new Error('Missing option value'); options[key] = value; }
  }
  if (required[command].some(key => !options[key])) throw new Error(`Required: ${required[command].map(key => `--${key}`).join(' ')}`);
  const config = await configuration(root);
  if (command === 'build') { const result = await build(config); return { buildId: result.buildId, digest: result.digest, sourceFiles: Object.keys(result.sources).length }; }
  if (command === 'setup') return setup(config, options.workspace, options['with-reviewed-job']);
  if (command === 'backup') return backupWorkspace(config, options.workspace, options.label);
  if (command === 'restore') return restoreWorkspace(config, options.backup, options.workspace);
  if (command === 'verify') return verifyWorkspace(config, options.workspace);
  const ws = workspacePaths(root, options.workspace);
  await workspaceManifest(ws);
  if (command === 'capture') return (await import('./presentation/capture.mjs')).capture(config, ws, options);
  if (command === 'worker') {
    await preflight(config);
    await verifyWorkspace(config, ws.id);
    console.log(`Explicit worker: entire disposable workspace ${ws.id} queue; no branch restriction. Deterministic mock, zero provider cost.`);
    const owned = child(config.python, ['-m', 'app.job_worker', ...(options.once ? ['--once'] : [])], { cwd: path.join(root, 'apps/api'), env: runtimeEnvironment(config.env, ws, 8300), stdio: 'inherit' });
    return hold([owned], true);
  }
  await verifyBuild(root);
  await verifyWorkspace(config, ws.id);
  const launched = await launch(config, ws, { webPort: port(options['web-port'], 3300), apiPort: port(options['api-port'], 8300) });
  console.log(`Presentation ${ws.id}: ${launched.origin}/welcome\nWorker is stopped. Run: node tools/presentation.mjs worker --workspace ${ws.id} --once\nCtrl+C stops only these owned API/web children.`);
  return hold(launched.children, false);
}

async function hold(children, normalExit) {
  const listeners = [];
  try {
    const result = await new Promise((resolve, reject) => {
      for (const signal of ['SIGINT', 'SIGTERM']) { const handler = () => resolve('stopped'); listeners.push([signal, handler]); process.once(signal, handler); }
      for (const owned of children) {
        if (owned.exitCode !== null || owned.signalCode) {
          if (owned.exitCode === 0 && normalExit) resolve('complete'); else reject(new Error('Owned service exited before supervision'));
          continue;
        }
        owned.once('error', reject);
        owned.once('exit', code => code === 0 && normalExit ? resolve('complete') : reject(new Error(`Owned service exited ${code}`)));
      }
    });
    return { status: result };
  } finally {
    for (const [signal, handler] of listeners) process.removeListener(signal, handler);
    await stopOwned(children);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(`Presentation refused: ${error.message}\nIncomplete new outputs are retained for inspection; previous workspaces/backups/fallbacks are preserved.`); process.exitCode = 1; });
}
