import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const localEnvironment = resolve(root, '.env.api.local');
if (existsSync(localEnvironment)) process.loadEnvFile(localEnvironment);
const python = process.env.AETHER_PYTHON ? resolve(root, process.env.AETHER_PYTHON)
  : resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const port = process.env.AETHER_API_PORT || '8000';
const commands = {
  dev: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', port, '--reload'],
  serve: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', port],
  migrate: ['-m', 'app.migrate'],
  test: ['-m', 'pytest', '-q'],
  lint: ['-m', 'ruff', 'check', '.'],
  typecheck: ['-m', 'mypy'],
};
const args = commands[process.argv[2]];
if (!args || !existsSync(python)) {
  console.error(!args ? 'Expected dev, serve, migrate, test, lint or typecheck.' : 'Python executable not found. Follow README.md or configure AETHER_PYTHON in .env.api.local.');
  process.exitCode = 1;
} else {
  const child = spawn(python, args, { cwd: resolve(root, 'apps/api'), stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}
