import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
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

import { TradePanel } from '../../components/trading/TradePanel';
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
    const limitPriceField = screen.getByLabelText('Limit Price');

    expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'true');
    expect(limitPriceField).toBeDisabled();
    expect(limitPriceField).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Limit' }));

    expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'false');
    expect(limitPriceField).toBeEnabled();
    expect(limitPriceField).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Market' }));

    expect(limitPriceSlot).toHaveAttribute('aria-hidden', 'true');
    expect(limitPriceField).toBeDisabled();
    expect(limitPriceField).not.toBeVisible();
  });
});
