import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockedSetPrice = vi.hoisted(() => vi.fn());

vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: (
    selector: (state: { setPrice: typeof mockedSetPrice }) => unknown,
  ) => selector({ setPrice: mockedSetPrice }),
}));

import {
  MARKET_SOCKET_QUIET_WINDOW_MS,
  useMarketSocket,
} from '../../hooks/useMarketSocket';

interface MockSocketInstance {
  url: string;
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
}

class MockWebSocket {
  static instances: MockSocketInstance[] = [];

  url: string;
  readyState = 1;
  send = vi.fn();
  close = vi.fn();
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

const TickHarness = ({
  symbols = ['VOO'],
  onTicks,
}: {
  symbols?: string[];
  onTicks?: (symbol: string[]) => void;
}) => {
  useMarketSocket({
    symbols,
    onTicks: (ticks) => onTicks?.(ticks.map((tick) => tick.symbol)),
  });

  return null;
};

const emitTicks = (socket: MockSocketInstance, price: number) => {
  socket.onmessage?.({
    data: JSON.stringify({
      type: 'ticks',
      data: [
        {
          symbol: 'VOO',
          price,
          changePercent: 0.42,
          volume: 1_200_000,
          source: 'live',
          asOf: 1_712_000_000_000,
          timestamp: 1_712_000_000_000,
        },
      ],
    }),
  } as MessageEvent);
};

describe('useMarketSocket', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    mockedSetPrice.mockClear();
    MockWebSocket.instances = [];

    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
  });

  afterEach(() => {
    vi.useRealTimers();

    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      writable: true,
      value: originalWebSocket,
    });
  });

  it('subscribes and applies ticks immediately when the user is idle', () => {
    const onTicks = vi.fn();

    render(<TickHarness onTicks={onTicks} />);

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    act(() => {
      socket?.onopen?.(new Event('open'));
    });

    expect(socket?.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', symbols: ['VOO'] }),
    );

    act(() => {
      emitTicks(socket as MockSocketInstance, 510.42);
    });

    expect(mockedSetPrice).toHaveBeenCalledWith('VOO', 510.42);
    expect(onTicks).toHaveBeenCalledWith(['VOO']);
  });

  it('buffers ticks until the post-interaction quiet window elapses', () => {
    vi.useFakeTimers();
    const onTicks = vi.fn();

    render(<TickHarness onTicks={onTicks} />);

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();

    act(() => {
      window.dispatchEvent(new MouseEvent('pointerdown'));
      emitTicks(socket as MockSocketInstance, 511.25);
    });

    expect(mockedSetPrice).not.toHaveBeenCalled();
    expect(onTicks).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(MARKET_SOCKET_QUIET_WINDOW_MS - 1);
    });

    expect(mockedSetPrice).not.toHaveBeenCalled();
    expect(onTicks).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mockedSetPrice).toHaveBeenCalledWith('VOO', 511.25);
    expect(onTicks).toHaveBeenCalledWith(['VOO']);
  });

  it('drops buffered ticks when the subscription symbols change before the quiet window flushes', () => {
    vi.useFakeTimers();
    const onTicks = vi.fn();

    const { rerender } = render(<TickHarness symbols={['VOO']} onTicks={onTicks} />);

    const firstSocket = MockWebSocket.instances[0];
    expect(firstSocket).toBeDefined();

    act(() => {
      window.dispatchEvent(new MouseEvent('pointerdown'));
      emitTicks(firstSocket as MockSocketInstance, 512.11);
    });

    rerender(<TickHarness symbols={['QQQ']} onTicks={onTicks} />);

    const secondSocket = MockWebSocket.instances[1];
    expect(secondSocket).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(MARKET_SOCKET_QUIET_WINDOW_MS);
    });

    expect(firstSocket?.close).toHaveBeenCalled();
    expect(mockedSetPrice).not.toHaveBeenCalledWith('VOO', 512.11);
    expect(onTicks).not.toHaveBeenCalledWith(['VOO']);
  });
});