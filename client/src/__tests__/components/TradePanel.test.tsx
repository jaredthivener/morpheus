import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchOrderBookMock, submitLimitOrderMock } = vi.hoisted(() => ({
  fetchOrderBookMock: vi.fn(),
  submitLimitOrderMock: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  fetchOrderBook: fetchOrderBookMock,
  submitLimitOrder: submitLimitOrderMock,
}));

vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: (selector: (state: {
    buy: ReturnType<typeof vi.fn>;
    sell: ReturnType<typeof vi.fn>;
    cash: number;
    holdings: Record<string, { shares: number; avgCost: number }>;
  }) => unknown) =>
    selector({
      buy: vi.fn(() => true),
      sell: vi.fn(() => true),
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
    fetchOrderBookMock.mockReset();
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

      expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'true');
      expect(limitPriceField).toBeDisabled();
      expect(limitPriceField).not.toBeVisible();

      const limitButton = screen.getByRole('button', { name: 'Limit' });

      fireEvent.click(limitButton);

      expect(limitButton).toHaveAttribute('aria-pressed', 'true');
      expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'true');

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'false');
      expect(limitPriceField).toBeEnabled();
      expect(limitPriceField).toBeVisible();

      const marketButton = screen.getByRole('button', { name: 'Market' });

      fireEvent.click(marketButton);

      expect(marketButton).toHaveAttribute('aria-pressed', 'true');
      expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'false');

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'true');
      expect(limitPriceField).toBeDisabled();
      expect(limitPriceField).not.toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips the heavy limit-field swap when the order type is toggled back immediately', async () => {
    renderPanel();

    const limitPriceSlot = await screen.findByTestId('trade-limit-price-slot');

    vi.useFakeTimers();

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Limit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Market' }));

      act(() => {
        vi.advanceTimersByTime(ORDER_TYPE_SURFACE_HANDOFF_DELAY_MS);
      });

      expect(screen.getByRole('button', { name: 'Market' })).toHaveAttribute('aria-pressed', 'true');
      expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByLabelText('Limit Price')).not.toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });
});
