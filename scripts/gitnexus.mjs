import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, '.gitnexus-tools', 'node_modules', 'gitnexus', 'dist', 'cli', 'index.js');
const args = process.argv.slice(2);

if (!existsSync(cliPath)) {
  console.error('GitNexus CLI is not installed yet.');
  console.error('Run `npm install --prefix .gitnexus-tools` from the repository root, then try again.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliPath, ...args], {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
