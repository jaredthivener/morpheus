import { useEffect, useEffectEvent, useRef } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import type { Tick } from '../types/market';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws';
export const MARKET_SOCKET_QUIET_WINDOW_MS = 600;
const PASSIVE_POINTERDOWN_LISTENER_OPTIONS = { passive: true, capture: false };

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
  const lastInteractionAtRef = useRef(0);
  const flushTimerRef = useRef<number | null>(null);
  const pendingTicksRef = useRef<Map<string, Tick>>(new Map());
  const subscriptionSymbols = Array.from(
    new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0),
    ),
  );
  const subscriptionKey = subscriptionSymbols.join(',');

  const flushPendingTicks = useEffectEvent(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const ticks = [...pendingTicksRef.current.values()];
    if (ticks.length === 0) {
      return;
    }

    pendingTicksRef.current.clear();

    for (const tick of ticks) {
      setPrice(tick.symbol, tick.price);
    }

    onTicks?.(ticks);
  });

  const schedulePendingTickFlush = useEffectEvent(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const remainingQuietWindowMs =
      MARKET_SOCKET_QUIET_WINDOW_MS - (Date.now() - lastInteractionAtRef.current);

    if (remainingQuietWindowMs > 0) {
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flushPendingTicks();
      }, remainingQuietWindowMs);
      return;
    }

    flushPendingTicks();
  });

  const onMessage = useEffectEvent((payload: TickMessage) => {
    for (const tick of payload.data) {
      pendingTicksRef.current.set(tick.symbol, tick);
    }

    schedulePendingTickFlush();
  });

  useEffect(() => {
    const pendingTicks = pendingTicksRef.current;

    const markInteraction = () => {
      lastInteractionAtRef.current = Date.now();

      if (pendingTicks.size > 0) {
        schedulePendingTickFlush();
      }
    };

    window.addEventListener(
      'pointerdown',
      markInteraction,
      PASSIVE_POINTERDOWN_LISTENER_OPTIONS,
    );
    window.addEventListener('keydown', markInteraction);

    return () => {
      window.removeEventListener(
        'pointerdown',
        markInteraction,
        PASSIVE_POINTERDOWN_LISTENER_OPTIONS,
      );
      window.removeEventListener('keydown', markInteraction);

      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      pendingTicks.clear();
    };
  }, [schedulePendingTickFlush]);

  useEffect(() => {
    const pendingTicks = pendingTicksRef.current;
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
      pendingTicks.clear();
      socket.close();
    };
  }, [onMessage, subscriptionKey]);
};
