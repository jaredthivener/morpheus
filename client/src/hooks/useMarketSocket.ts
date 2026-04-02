import { useEffect, useEffectEvent } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import type { Tick } from '../types/market';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws';

interface TickMessage {
  type: 'ticks';
  data: Tick[];
}

interface UseMarketSocketOptions {
  symbols?: string[];
  onTicks?: (ticks: Tick[]) => void;
}

export const useMarketSocket = (options?: UseMarketSocketOptions): void => {
  const setPrice = usePortfolioStore((state) => state.setPrice);
  const symbols = options?.symbols ?? [];
  const onTicks = options?.onTicks;
  const subscriptionSymbols = Array.from(
    new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0),
    ),
  );
  const subscriptionKey = subscriptionSymbols.join(',');

  const onMessage = useEffectEvent((payload: TickMessage) => {
    for (const tick of payload.data) {
      setPrice(tick.symbol, tick.price);
    }

    onTicks?.(payload.data);
  });

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    const normalizedSymbols = subscriptionKey.length > 0 ? subscriptionKey.split(',') : [];
    const subscriptionPayload = JSON.stringify({
      type: 'subscribe',
      symbols: normalizedSymbols,
    });

    socket.onopen = () => {
      socket.send(subscriptionPayload);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TickMessage;
        if (payload.type === 'ticks') {
          onMessage(payload);
        }
      } catch {
        // Ignore malformed websocket payloads.
      }
    };

    return () => {
      socket.close();
    };
  }, [onMessage, subscriptionKey]);
};
