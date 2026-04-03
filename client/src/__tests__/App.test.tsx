import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ETF_STARTER_WATCHLIST_KEY = vi.hoisted(
  () => 'VOO,VTI,SCHD,XLV,XLP,XLU,MSFT,JNJ,WMT,COST',
);
const GROWTH_EXPLORER_WATCHLIST_KEY = vi.hoisted(
  () => 'QQQ,SOXX,SMH,IWM,NVDA,AMZN,META,TSLA,AMD,GOOGL',
);

const mockedQuoteDataByWatchlist = vi.hoisted(() => ({
  [ETF_STARTER_WATCHLIST_KEY]: [
    {
      symbol: 'VOO',
      price: 510.42,
      changePercent: 0.84,
      volume: 1_240_000,
      source: 'live' as const,
      asOf: Date.now(),
    },
  ],
  [GROWTH_EXPLORER_WATCHLIST_KEY]: [
    {
      symbol: 'QQQ',
      price: 487.18,
      changePercent: 1.12,
      volume: 2_840_000,
      source: 'live' as const,
      asOf: Date.now(),
    },
  ],
}));

const mockedSetPrice = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: [string, string] }) => ({
    data: mockedQuoteDataByWatchlist[queryKey[1] as keyof typeof mockedQuoteDataByWatchlist] ?? [],
  }),
}));

vi.mock('../hooks/useMarketSocket', () => ({
  useMarketSocket: vi.fn(),
}));

vi.mock('../store/portfolioStore', () => ({
  usePortfolioStore: (
    selector: (state: {
      setPrice: typeof mockedSetPrice;
      cash: number;
      totalValue: () => number;
      unrealizedPnL: () => number;
      holdings: Record<string, never>;
      prices: Record<string, never>;
    }) => unknown,
  ) =>
    selector({
      setPrice: mockedSetPrice,
      cash: 82_500,
      totalValue: () => 105_420,
      unrealizedPnL: () => 5_420,
      holdings: {},
      prices: {},
    }),
}));

vi.mock('../components/layout/AppShell', () => ({
  AppShell: ({ children }: PropsWithChildren) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock('../components/layout/AccountOverview', () => ({
  AccountOverview: () => <div>account overview</div>,
}));

vi.mock('../components/market/MarketTable', () => ({
  MarketTable: ({
    quotes,
    selectedSymbol,
    watchlistLabel,
  }: {
    quotes: Array<{ symbol: string }>;
    selectedSymbol: string;
    watchlistLabel: string;
  }) => (
    <div>
      <div>{`market table ${watchlistLabel}`}</div>
      <div>{`market rows ${quotes.map((quote) => quote.symbol).join(',')}`}</div>
      <div>{`market selected ${selectedSymbol}`}</div>
    </div>
  ),
}));

vi.mock('../components/onboarding/InvestorProfilePanel', async () => {
  const React = await import('react');

  return {
    InvestorProfilePanel: ({
      selectedProfileId,
      onSelectProfile,
    }: {
      selectedProfileId: string;
      onSelectProfile: (profileId: 'growth-explorer') => void;
    }) => {
      const [displayedProfileId, setDisplayedProfileId] = React.useState(selectedProfileId);

      React.useEffect(() => {
        setDisplayedProfileId(selectedProfileId);
      }, [selectedProfileId]);

      return (
        <div>
          <div>{`investor profile ${displayedProfileId}`}</div>
          <button
            type="button"
            onClick={() => {
              setDisplayedProfileId('growth-explorer');
              onSelectProfile('growth-explorer');
            }}
          >
            switch profile
          </button>
        </div>
      );
    },
  };
});

vi.mock('../components/suggestions/SuggestionsPanel', () => ({
  SuggestionsPanel: () => <div>suggestions panel loaded</div>,
}));

vi.mock('../components/trading/TradePanel', () => ({
  TradePanel: ({ selectedSymbol }: { selectedSymbol: string }) => (
    <div>{`trade panel loaded ${selectedSymbol}`}</div>
  ),
}));

vi.mock('../components/portfolio/PortfolioSummary', () => ({
  PortfolioSummary: () => <div>portfolio summary loaded</div>,
}));

vi.mock('../components/portfolio/BacktestPanel', () => ({
  BacktestPanel: () => <div>backtest panel loaded</div>,
}));

import { App } from '../App';

type IdleCallback = Parameters<NonNullable<typeof window.requestIdleCallback>>[0];

describe('App', () => {
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;

  beforeEach(() => {
    mockedSetPrice.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: originalRequestIdleCallback,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: originalCancelIdleCallback,
    });
  });

  it('renders deferred placeholders first and reveals the lazy panels when the browser becomes idle', async () => {
    let idleCallback: IdleCallback | undefined;

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: ((callback: IdleCallback) => {
        idleCallback = callback;
        return 1;
      }) as typeof window.requestIdleCallback,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn() as typeof window.cancelIdleCallback,
    });

    render(<App colorMode="dark" onToggleColorMode={vi.fn()} />);

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByText('account overview')).toBeInTheDocument();
    expect(screen.getByText('market table ETF Starter')).toBeInTheDocument();
    expect(screen.getByText('market rows VOO')).toBeInTheDocument();
    expect(screen.getByText('market selected VOO')).toBeInTheDocument();
    expect(screen.getByText('investor profile etf-starter')).toBeInTheDocument();
    expect(screen.getByText('AI Guidance for Everyday Investors')).toBeInTheDocument();
    expect(screen.getByText('Paper Order Ticket')).toBeInTheDocument();
    expect(screen.queryByText('suggestions panel loaded')).not.toBeInTheDocument();
    expect(screen.queryByText('trade panel loaded VOO')).not.toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1450);
      });
    });

    expect(idleCallback).toBeUndefined();

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 400);
      });
    });

    expect(idleCallback).toBeDefined();

    await act(async () => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 40 } as IdleDeadline);
    });

    expect(await screen.findByText('suggestions panel loaded')).toBeInTheDocument();
    expect(await screen.findByText('trade panel loaded VOO')).toBeInTheDocument();
    expect(await screen.findByText('portfolio summary loaded')).toBeInTheDocument();
    expect(await screen.findByText('backtest panel loaded')).toBeInTheDocument();
    expect(mockedSetPrice).toHaveBeenCalledWith('VOO', 510.42);
  });

  it('updates the selected profile immediately while the market surface catches up on the deferred render', async () => {
    render(<App colorMode="dark" onToggleColorMode={vi.fn()} />);

    expect(screen.getByText('investor profile etf-starter')).toBeInTheDocument();
    expect(screen.getByText('market table ETF Starter')).toBeInTheDocument();
    expect(screen.getByText('market rows VOO')).toBeInTheDocument();
    expect(screen.getByText('market selected VOO')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'switch profile' }));

    expect(screen.getByText('investor profile growth-explorer')).toBeInTheDocument();
    expect(screen.getByText('market table ETF Starter')).toBeInTheDocument();
    expect(screen.getByText('market rows VOO')).toBeInTheDocument();
    expect(screen.getByText('market selected VOO')).toBeInTheDocument();

    expect(await screen.findByText('market table Growth Explorer')).toBeInTheDocument();
    expect(screen.getByText('market rows QQQ')).toBeInTheDocument();
    expect(screen.getByText('market selected QQQ')).toBeInTheDocument();
    expect(screen.queryByText('market rows VOO')).not.toBeInTheDocument();
  });

  it('keeps the revealed lower panels responsive when switching profiles after idle reveal', async () => {
    let idleCallback: IdleCallback | undefined;

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: ((callback: IdleCallback) => {
        idleCallback = callback;
        return 1;
      }) as typeof window.requestIdleCallback,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn() as typeof window.cancelIdleCallback,
    });

    render(<App colorMode="dark" onToggleColorMode={vi.fn()} />);

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1850);
      });
    });

    await act(async () => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 40 } as IdleDeadline);
    });

    expect(await screen.findByText('trade panel loaded VOO')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'switch profile' }));

    expect(screen.getByText('investor profile growth-explorer')).toBeInTheDocument();
    expect(screen.getByText('trade panel loaded VOO')).toBeInTheDocument();

    expect(await screen.findByText('market table Growth Explorer')).toBeInTheDocument();
    expect(await screen.findByText('trade panel loaded QQQ')).toBeInTheDocument();
    expect(screen.getByText('market rows QQQ')).toBeInTheDocument();
    expect(screen.getByText('market selected QQQ')).toBeInTheDocument();
  });
});