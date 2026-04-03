import { existsSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const runtimeProcess = globalThis.process;
const workspaceRoot = runtimeProcess?.cwd() ?? '.';
const lighthouseDir = join(workspaceRoot, '.lighthouseci');
const reportsDir = join(lighthouseDir, 'reports');

if (existsSync(lighthouseDir)) {
  for (const file of readdirSync(lighthouseDir)) {
    if (/^lhr-.*\.json$/.test(file)) {
      unlinkSync(join(lighthouseDir, file));
    }
  }
}

if (existsSync(reportsDir)) {
  rmSync(reportsDir, { recursive: true, force: true });
}

const command = runtimeProcess?.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(command, ['lhci', 'autorun', '--config=./lighthouserc.cjs'], {
  stdio: 'inherit',
  env: runtimeProcess?.env,
});

child.on('exit', (code) => {
  if (code === 0) {
    return;
  }

  runtimeProcess?.exit(code ?? 1);
});
