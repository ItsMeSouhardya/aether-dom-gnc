import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const commands = {
  dev: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
  serve: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
  test: ['-m', 'pytest', '-q'],
  lint: ['-m', 'ruff', 'check', '.'],
  typecheck: ['-m', 'mypy'],
};
const args = commands[process.argv[2]];
if (!args || !existsSync(python)) {
  console.error(!args ? 'Expected dev, serve, test, lint or typecheck.' : 'Missing root .venv. Follow the Python setup in README.md.');
  process.exitCode = 1;
} else {
  const child = spawn(python, args, { cwd: resolve(root, 'apps/api'), stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}
