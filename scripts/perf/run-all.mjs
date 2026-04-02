import { spawn } from 'node:child_process';

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with code ${String(code)}`));
    });
  });

const waitFor = async (url, maxAttempts = 60, delayMs = 500) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Continue polling.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timeout waiting for ${url}`);
};

const start = (command, args, options = {}) => {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
};

const killChild = (child) => {
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
};

let serverProcess;
let previewProcess;

try {
  await run('npm', ['run', 'build']);

  serverProcess = start('node', ['dist/index.js'], {
    cwd: 'server',
    env: {
      ...process.env,
      PORT: '3000',
      PERF_MODE: '1',
    },
  });

  previewProcess = start('node', [
    '../node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '0.0.0.0',
    '--port',
    '4173',
  ], {
    cwd: 'client',
  });

  await waitFor('http://localhost:3000/api/v1/health');
  await waitFor('http://localhost:4173');

  await run('npm', ['run', 'perf:api']);
  await run('npm', ['run', 'perf:market']);
  await run('npm', ['run', 'perf:ws']);
  await run('npm', ['run', 'perf:bundle']);
  await run('npm', ['run', 'perf:web']);
  await run('npm', ['run', 'perf:web:report']);
  await run('npm', ['run', 'perf:inp']);

  process.stdout.write('All performance checks passed.\n');
} finally {
  killChild(serverProcess);
  killChild(previewProcess);
}
