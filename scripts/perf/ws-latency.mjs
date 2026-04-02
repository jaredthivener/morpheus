import WebSocket from 'ws';
import { readFileSync } from 'node:fs';

const WS_URL = process.env.PERF_WS_URL ?? 'ws://localhost:3000/ws';
const budgetConfig = JSON.parse(
  readFileSync(new URL('./performance-budgets.json', import.meta.url), 'utf8'),
);
const wsBudget = budgetConfig.server.websocket;

const percentile = (values, pct) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * (pct / 100)) - 1);
  return sorted[idx] ?? 0;
};

const extractLatency = (raw) => {
  try {
    const payload = JSON.parse(raw.toString());
    if (payload.type !== 'ticks' || !Array.isArray(payload.data)) {
      return null;
    }

    const firstTick = payload.data[0];
    if (!firstTick || typeof firstTick.timestamp !== 'number') {
      return null;
    }

    return Date.now() - firstTick.timestamp;
  } catch {
    return null;
  }
};

const connectSocket = async () => {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('WebSocket connection timed out.'));
    }, 5_000);

    socket.once('open', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

const connectSocketAndMeasureFirstTick = async () => {
  return new Promise((resolve, reject) => {
    const reconnectStartedAt = performance.now();
    const socket = new WebSocket(WS_URL);
    let didOpen = false;

    const timeout = setTimeout(() => {
      cleanup();
      socket.close();
      reject(new Error('WebSocket reconnect measurement timed out.'));
    }, 5_000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('open', onOpen);
      socket.off('message', onMessage);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const onOpen = () => {
      didOpen = true;
    };

    const onMessage = (raw) => {
      if (!didOpen) {
        return;
      }

      const latency = extractLatency(raw);
      if (latency === null) {
        return;
      }

      cleanup();
      resolve({
        socket,
        reconnectFirstTickMs: performance.now() - reconnectStartedAt,
      });
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('WebSocket closed before the reconnect tick arrived.'));
    };

    socket.on('open', onOpen);
    socket.on('message', onMessage);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
};

const closeSocket = async (socket) => {
  if (socket.readyState === socket.CLOSED) {
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 1_000);
    socket.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.close();
  });
};

const collectSamples = async (socket, targetSamples) => {
  return new Promise((resolve, reject) => {
    const samples = [];
  const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('WebSocket latency check timed out.'));
    }, 40_000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('message', onMessage);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const onMessage = (raw) => {
      const latency = extractLatency(raw);
      if (latency === null) {
        return;
      }

      samples.push(latency);
      if (samples.length >= targetSamples) {
        cleanup();
        resolve(samples);
      }
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('WebSocket closed before enough latency samples were collected.'));
    };

    socket.on('message', onMessage);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
};

const firstSocket = await connectSocket();
const samples = await collectSamples(firstSocket, wsBudget.sampleCount);
await closeSocket(firstSocket);

const jitterSamples = samples.slice(1).map((value, index) => Math.abs(value - samples[index]));
const observedP95 = percentile(samples, 95);
const observedP99 = percentile(samples, 99);
const observedJitterP95 = percentile(jitterSamples, 95);

const { socket: reconnectSocket, reconnectFirstTickMs } = await connectSocketAndMeasureFirstTick();
await closeSocket(reconnectSocket);

process.stdout.write(
  `WS tick latency p95: ${observedP95.toFixed(2)} ms (limit ${wsBudget.p95Ms} ms)\n`,
);
process.stdout.write(
  `WS tick latency p99: ${observedP99.toFixed(2)} ms (limit ${wsBudget.p99Ms} ms)\n`,
);
process.stdout.write(
  `WS latency jitter p95: ${observedJitterP95.toFixed(2)} ms (limit ${wsBudget.jitterP95Ms} ms)\n`,
);
process.stdout.write(
  `WS reconnect-to-first-tick: ${reconnectFirstTickMs.toFixed(2)} ms (limit ${wsBudget.reconnectFirstTickMs} ms)\n`,
);

if (
  observedP95 > wsBudget.p95Ms ||
  observedP99 > wsBudget.p99Ms ||
  observedJitterP95 > wsBudget.jitterP95Ms ||
  reconnectFirstTickMs > wsBudget.reconnectFirstTickMs
) {
  throw new Error('WebSocket latency budget failed.');
}
