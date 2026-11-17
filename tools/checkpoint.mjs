import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCheckpoint, verifyCheckpoint, previewCheckpoint } from './checkpoints/index.mjs';

export { createCheckpoint, verifyCheckpoint, previewCheckpoint } from './checkpoints/index.mjs';

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  const commands = { create: ['label', 'checks'], verify: ['checkpoint'], preview: ['checkpoint', 'destination'] };
  if (!Object.hasOwn(commands, command) || rest.length !== commands[command].length * 2) throw new Error('Usage: checkpoint.mjs create --label <slug> --checks <report> | verify --checkpoint <dir> | preview --checkpoint <dir> --destination <new-dir>');
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i].slice(2);
    if (!rest[i].startsWith('--') || !commands[command].includes(key) || Object.hasOwn(options, key) || !rest[i + 1] || rest[i + 1].startsWith('--')) throw new Error('Unknown, duplicate or missing checkpoint option');
    options[key] = rest[i + 1];
  }
  if (command === 'create') return createCheckpoint({ repoRoot: process.cwd(), label: options.label, checksPath: options.checks });
  if (command === 'verify') return verifyCheckpoint(options.checkpoint);
  return previewCheckpoint({ checkpointPath: options.checkpoint, destination: options.destination, activeRoot: process.cwd() });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(error => {
    process.stderr.write(`Checkpoint refused: ${error.message}\n`);
    process.exitCode = 1;
  });
}
