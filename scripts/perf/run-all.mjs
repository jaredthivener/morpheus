import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const serverPort = process.env.PERF_SERVER_PORT ?? '3000';
const previewPort = process.env.PERF_PREVIEW_PORT ?? '4173';
const perfApiBaseUrl = process.env.PERF_API_BASE_URL ?? `http://localhost:${serverPort}`;
const perfWsUrl = process.env.PERF_WS_URL ?? `ws://localhost:${serverPort}/ws`;
const perfPreviewBaseUrl = `http://localhost:${previewPort}`;
const perfAppUrl = process.env.PERF_APP_URL ?? `${perfPreviewBaseUrl}/?dtn-perf=interaction`;
const perfBuildEnv = {
  ...process.env,
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? perfApiBaseUrl,
};
const perfCommandEnv = {
  ...process.env,
  PERF_API_BASE_URL: perfApiBaseUrl,
  PERF_WS_URL: perfWsUrl,
  PERF_APP_URL: perfAppUrl,
};

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

const ensurePortAvailable = (port, label) =>
  new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once('error', (error) => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE') {
        reject(
          new Error(
            `${label} port ${port} is already in use. Stop the conflicting process or set a different performance port override.`,
          ),
        );
        return;
      }

      reject(error);
    });

    probe.listen(Number(port), '0.0.0.0', () => {
      probe.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

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
  await ensurePortAvailable(serverPort, 'API performance');
  await ensurePortAvailable(previewPort, 'Preview performance');

  await run('npm', ['run', 'build'], { env: perfBuildEnv });

  serverProcess = start('node', ['dist/index.js'], {
    cwd: 'server',
    env: {
      ...process.env,
      PORT: serverPort,
      PERF_MODE: '1',
    },
  });

  previewProcess = start('node', [
    '../node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '0.0.0.0',
    '--port',
    previewPort,
    '--strictPort',
  ], {
    cwd: 'client',
  });

  await waitFor(`${perfApiBaseUrl}/api/v1/health`);
  await waitFor(perfPreviewBaseUrl);

  await run('npm', ['run', 'perf:api'], { env: perfCommandEnv });
  await run('npm', ['run', 'perf:market'], { env: perfCommandEnv });
  await run('npm', ['run', 'perf:ws'], { env: perfCommandEnv });
  await run('npm', ['run', 'perf:bundle'], { env: perfCommandEnv });
  await run('npm', ['run', 'perf:web'], { env: perfCommandEnv });
  await run('npm', ['run', 'perf:web:report'], { env: perfCommandEnv });
  await run('npm', ['run', 'perf:inp'], { env: perfCommandEnv });

  process.stdout.write('All performance checks passed.\n');
} finally {
  killChild(serverProcess);
  killChild(previewProcess);
}
