import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { MarketDataService } from '../services/marketDataService.js';

const DEFAULT_SYMBOLS = [
  'VOO',
  'VTI',
  'SCHD',
  'XLV',
  'XLP',
  'XLU',
  'QQQ',
  'XLK',
  'SOXX',
  'SMH',
  'IWM',
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'JPM',
  'XOM',
  'WMT',
  'JNJ',
  'COST',
  'AMD',
];

export const attachTickServer = (server: Server, marketDataService: MarketDataService): void => {
  const wss = new WebSocketServer({ noServer: true });
  const subscriptions = new Map<WebSocket, string[]>();

  const sanitizeSymbols = (symbols: unknown): string[] => {
    if (!Array.isArray(symbols)) {
      return [...DEFAULT_SYMBOLS];
    }

    const normalizedSymbols = Array.from(
      new Set(
        symbols
          .filter((symbol): symbol is string => typeof symbol === 'string')
          .map((symbol) => symbol.trim().toUpperCase())
          .filter((symbol) => symbol.length > 0),
      ),
    );

    return normalizedSymbols.length > 0 ? normalizedSymbols : [...DEFAULT_SYMBOLS];
  };

  const symbolsForClient = (client: WebSocket): string[] => {
    return subscriptions.get(client) ?? DEFAULT_SYMBOLS;
  };

  const sendTicks = (client: WebSocket, symbols = symbolsForClient(client)): void => {
    const ticks = marketDataService.nextTicks(symbols);
    client.send(JSON.stringify({ type: 'ticks', data: ticks }));
  };

  const activeClients = (): WebSocket[] => {
    return [...wss.clients].filter((client) => client.readyState === WebSocket.OPEN);
  };

  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  server.on('close', () => {
    void wss.close();
  });

  let refreshing = false;
  const interval = setInterval(async () => {
    if (refreshing) {
      return;
    }

    const clients = activeClients();
    if (clients.length === 0) {
      return;
    }

    const subscribedSymbols = Array.from(
      new Set(clients.flatMap((client) => symbolsForClient(client))),
    );

    refreshing = true;
    try {
      await marketDataService.refreshQuotes(subscribedSymbols);

      for (const client of clients) {
        sendTicks(client);
      }
    } finally {
      refreshing = false;
    }
  }, 1000);

  wss.on('connection', (ws) => {
    subscriptions.set(ws, [...DEFAULT_SYMBOLS]);

    ws.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as { type?: string; symbols?: unknown };
        if (payload.type !== 'subscribe') {
          return;
        }

        subscriptions.set(ws, sanitizeSymbols(payload.symbols));
      } catch {
        // Ignore malformed websocket payloads from clients.
      }
    });

    ws.on('close', () => {
      subscriptions.delete(ws);
    });

    if (ws.readyState === WebSocket.OPEN) {
      sendTicks(ws);
    }
  });

  wss.on('close', () => {
    clearInterval(interval);
    subscriptions.clear();
  });
};
