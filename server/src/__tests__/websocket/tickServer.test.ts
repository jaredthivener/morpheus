import { createServer, type Server } from 'node:http';
import WebSocket from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketDataService } from '../../services/marketDataService.js';
import { attachTickServer } from '../../websocket/tickServer.js';

const waitForMessages = async (
  socket: WebSocket | undefined,
  count: number,
): Promise<Array<{ type: string; data: Array<{ symbol: string; price: number }> }>> => {
  return new Promise((resolve, reject) => {
    const messages: Array<{ type: string; data: Array<{ symbol: string; price: number }> }> = [];
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${String(count)} websocket messages.`));
    }, 1_800);

    const handleMessage = (raw: WebSocket.RawData) => {
      messages.push(
        JSON.parse(raw.toString()) as { type: string; data: Array<{ symbol: string; price: number }> },
      );

      if (messages.length >= count) {
        clearTimeout(timeout);
        socket?.off('message', handleMessage);
        resolve(messages);
      }
    };

    socket?.on('message', handleMessage);
    socket?.once('error', (error) => {
      clearTimeout(timeout);
      socket?.off('message', handleMessage);
      reject(error);
    });
  });
};

describe('tickServer', () => {
  let server: Server | undefined;
  let socket: WebSocket | undefined;

  afterEach(async () => {
    if (socket && socket.readyState !== socket.CLOSED) {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 1_000);
        socket?.once('close', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
        socket?.close();
      });
    }

    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(undefined);
        });
      });
    }

    socket = undefined;
    server = undefined;
  });

  it('sends an initial tick immediately after a client connects', async () => {
    server = createServer();

    const marketDataService = {
      refreshQuotes: vi.fn().mockResolvedValue([]),
      nextTicks: vi.fn(() => [
        {
          symbol: 'AAPL',
          price: 187.42,
          asOf: Date.now(),
          timestamp: Date.now(),
        },
      ]),
    } as unknown as MarketDataService;

    attachTickServer(server, marketDataService);

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not resolve ephemeral websocket test port.');
    }

    socket = new WebSocket(`ws://127.0.0.1:${String(address.port)}/ws`);

    const payload = await new Promise<{ type: string; data: Array<{ symbol: string }> }>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timed out waiting for the initial websocket tick.'));
        }, 300);

        socket?.once('message', (raw) => {
          clearTimeout(timeout);
          resolve(JSON.parse(raw.toString()) as { type: string; data: Array<{ symbol: string }> });
        });

        socket?.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      },
    );

    expect(payload.type).toBe('ticks');
    expect(payload.data[0]?.symbol).toBe('AAPL');
    expect((marketDataService.nextTicks as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('refreshes subscribed symbols and pushes updated ticks on the one-second loop', async () => {
    server = createServer();

    let latestPrice = 187.42;
    const refreshQuotes = vi.fn().mockImplementation(async (symbols: string[]) => {
      latestPrice = 188.11;

      return symbols.map((symbol) => ({
        symbol,
        price: latestPrice,
        changePercent: 0.88,
        volume: 12_500,
        source: 'live',
        asOf: 2_000,
      }));
    });
    const nextTicks = vi.fn((symbols: string[]) =>
      symbols.map((symbol) => ({
        symbol,
        price: latestPrice,
        changePercent: 0.88,
        volume: 12_500,
        source: latestPrice > 187.5 ? 'live' : 'synthetic',
        asOf: latestPrice > 187.5 ? 2_000 : 1_000,
        timestamp: latestPrice > 187.5 ? 2_000 : 1_000,
      })),
    );

    const marketDataService = {
      refreshQuotes,
      nextTicks,
    } as unknown as MarketDataService;

    attachTickServer(server, marketDataService);

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not resolve ephemeral websocket test port.');
    }

    socket = new WebSocket(`ws://127.0.0.1:${String(address.port)}/ws`);
    const payloadsPromise = waitForMessages(socket, 2);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for websocket open.'));
      }, 500);

      socket?.once('open', () => {
        clearTimeout(timeout);
        socket?.send(JSON.stringify({ type: 'subscribe', symbols: ['AAPL'] }));
        resolve();
      });

      socket?.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const payloads = await payloadsPromise;
    const initialPayload = payloads[0];
    const refreshedPayload = payloads[1];

    expect(initialPayload?.data[0]?.price).toBe(187.42);
    expect(refreshedPayload?.data[0]?.symbol).toBe('AAPL');
    expect(refreshedPayload?.data[0]?.price).toBe(188.11);
    expect(refreshQuotes).toHaveBeenCalledWith(['AAPL']);
    expect(nextTicks).toHaveBeenCalledWith(['AAPL']);
  });
});