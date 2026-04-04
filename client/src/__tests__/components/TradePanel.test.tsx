import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { buyMock, fetchOrderBookMock, sellMock, submitLimitOrderMock } = vi.hoisted(() => ({
  buyMock: vi.fn(() => true),
  fetchOrderBookMock: vi.fn(),
  sellMock: vi.fn(() => true),
  submitLimitOrderMock: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  fetchOrderBook: fetchOrderBookMock,
  submitLimitOrder: submitLimitOrderMock,
}));

vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: (selector: (state: {
    buy: typeof buyMock;
    sell: typeof sellMock;
    cash: number;
    holdings: Record<string, { shares: number; avgCost: number }>;
  }) => unknown) =>
    selector({
      buy: buyMock,
      sell: sellMock,
      cash: 50_000,
      holdings: {
        VOO: {
          shares: 12,
          avgCost: 502.15,
        },
      },
    }),
}));

import {
  ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS,
  TradePanel,
} from '../../components/trading/TradePanel';
import { buildAppTheme } from '../../theme';

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <ThemeProvider theme={buildAppTheme('dark')}>
      <QueryClientProvider client={queryClient}>
        <TradePanel
          quotes={[
            {
              symbol: 'VOO',
              price: 510.42,
              changePercent: 0.84,
              volume: 1_240_000,
              source: 'live',
              asOf: Date.now(),
            },
          ]}
          selectedSymbol="VOO"
          onSelectSymbol={vi.fn()}
        />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('TradePanel', () => {
  beforeEach(() => {
    buyMock.mockClear();
    fetchOrderBookMock.mockReset();
    sellMock.mockClear();
    submitLimitOrderMock.mockReset();

    fetchOrderBookMock.mockResolvedValue({
      symbol: 'VOO',
      bids: [{ price: 510.1, size: 200 }],
      asks: [{ price: 510.5, size: 180 }],
      spread: 0.4,
      timestamp: Date.now(),
    });
  });

  it('keeps the limit price field mounted while toggling its visibility for limit orders', async () => {
    renderPanel();

    const limitPriceSlot = await screen.findByTestId('trade-limit-price-slot');

    vi.useFakeTimers();

    try {
      const limitPriceField = screen.getByLabelText('Limit Price');
      const orderTypeGroup = screen.getByRole('group', { name: 'Order type' });

      expect(limitPriceSlot).toBeVisible();
      expect(limitPriceField).toHaveAttribute('readonly');
      expect(limitPriceField).toBeVisible();
      expect(orderTypeGroup).toHaveStyle({ contain: 'layout paint' });

      const limitButton = screen.getByRole('button', { name: 'Limit' });

      fireEvent.click(limitButton);

      expect(limitButton).toHaveAttribute('aria-pressed', 'true');
      expect(limitPriceField).toHaveAttribute('readonly');

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      expect(limitPriceField).not.toHaveAttribute('readonly');
      expect(limitPriceField).toBeVisible();

      const marketButton = screen.getByRole('button', { name: 'Market' });

      fireEvent.click(marketButton);

      expect(marketButton).toHaveAttribute('aria-pressed', 'true');
      expect(limitPriceField).not.toHaveAttribute('readonly');

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      expect(limitPriceField).toHaveAttribute('readonly');
      expect(limitPriceField).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips the heavy limit-field swap when the order type is toggled back immediately', async () => {
    renderPanel();

    const limitPriceSlot = await screen.findByTestId('trade-limit-price-slot');

    vi.useFakeTimers();

    try {
      const limitPriceField = screen.getByLabelText('Limit Price');

      fireEvent.click(screen.getByRole('button', { name: 'Limit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Market' }));

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      expect(screen.getByRole('button', { name: 'Market' })).toHaveAttribute('aria-pressed', 'true');
      expect(limitPriceSlot).toBeVisible();
      expect(limitPriceField).toHaveAttribute('readonly');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the custom order-type buttons focusable while isolating their paint work', async () => {
    renderPanel();

    await screen.findByTestId('trade-limit-price-slot');

    const orderTypeGroup = screen.getByRole('group', { name: 'Order type' });
    const marketButton = screen.getByRole('button', { name: 'Market' });
    const limitButton = screen.getByRole('button', { name: 'Limit' });

    expect(orderTypeGroup).toHaveStyle({ contain: 'layout paint' });
    expect(marketButton).toHaveStyle({ contain: 'paint' });
    expect(limitButton).toHaveStyle({ contain: 'paint' });

    limitButton.focus();

    expect(limitButton).toHaveFocus();

    fireEvent.click(limitButton);

    expect(limitButton).toHaveAttribute('aria-pressed', 'true');
    expect(limitButton).toHaveFocus();

    marketButton.focus();

    expect(marketButton).toHaveFocus();
  });

  it('shows dismissible market-order feedback and clears it when ticket inputs change', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /buy 1 share/i }));

    expect(buyMock).toHaveBeenCalledWith('VOO', 1, 510.42);
    const closeButton = await screen.findByRole('button', { name: /close/i });

    fireEvent.click(closeButton);

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /buy 1 share/i }));

    expect(await screen.findByRole('button', { name: /close/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '5 sh' }));

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('submits a filled limit order and applies the execution price to the portfolio', async () => {
    submitLimitOrderMock.mockResolvedValueOnce({
      filled: true,
      executedPrice: 509.75,
      reason: 'filled',
    });

    renderPanel();

    vi.useFakeTimers();

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Limit' }));

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      vi.useRealTimers();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /buy 1 share/i }));
      });

      expect(submitLimitOrderMock).toHaveBeenCalledWith({
        symbol: 'VOO',
        side: 'buy',
        shares: 1,
        limitPrice: 510.42,
      });
      expect(buyMock).toHaveBeenCalledWith('VOO', 1, 509.75);
      expect(await screen.findByRole('button', { name: /close/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows pending limit feedback without filling the portfolio', async () => {
    submitLimitOrderMock.mockResolvedValueOnce({
      filled: false,
      executedPrice: null,
      reason: 'Awaiting fill',
    });

    renderPanel();

    vi.useFakeTimers();

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Limit' }));

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      vi.useRealTimers();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /buy 1 share/i }));
      });

      expect(submitLimitOrderMock).toHaveBeenCalledTimes(1);
      expect(buyMock).not.toHaveBeenCalled();
      expect(await screen.findByText(/limit pending: awaiting fill/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an error when the limit-order request fails', async () => {
    submitLimitOrderMock.mockRejectedValueOnce(new Error('venue unavailable'));

    renderPanel();

    vi.useFakeTimers();

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Limit' }));

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      vi.useRealTimers();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /buy 1 share/i }));
      });

      expect(submitLimitOrderMock).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/limit order failed: error: venue unavailable/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
