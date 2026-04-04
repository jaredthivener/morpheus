import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useQuery } from '@tanstack/react-query';
import { Button, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { fetchMarketData } from './api/client';
import { DashboardPanel } from './components/common/DashboardPanel';
import { AccountOverview } from './components/layout/AccountOverview';
import { AppShell } from './components/layout/AppShell';
import { MarketTable } from './components/market/MarketTable';
import { InvestorProfilePanel } from './components/onboarding/InvestorProfilePanel';
import { useMarketSocket } from './hooks/useMarketSocket';
import { useDeferredReveal } from './hooks/useDeferredReveal';
import type { Quote } from './types/market';
import { usePortfolioStore } from './store/portfolioStore';
import { appendPriceHistory, applyTicksToQuotes } from './utils/marketSession';
import type { ColorMode } from './utils/colorMode';
import {
  getInitialInvestorProfileId,
  getInvestorProfile,
  INVESTOR_PROFILES,
  persistInvestorProfileId,
  type InvestorProfileId,
} from './utils/investorProfile';

const LazySuggestionsPanel = lazy(async () => {
  const module = await import('./components/suggestions/SuggestionsPanel');
  return { default: module.SuggestionsPanel };
});

const LazyTradePanel = lazy(async () => {
  const module = await import('./components/trading/TradePanel');
  return { default: module.TradePanel };
});

const LazyPortfolioSummary = lazy(async () => {
  const module = await import('./components/portfolio/PortfolioSummary');
  return { default: module.PortfolioSummary };
});

const LazyBacktestPanel = lazy(async () => {
  const module = await import('./components/portfolio/BacktestPanel');
  return { default: module.BacktestPanel };
});

const SECONDARY_PANEL_DELAY_MS = 1400;
const SECONDARY_PANEL_IDLE_TIMEOUT_MS = 3000;
const SECONDARY_PANEL_QUIET_WINDOW_MS = 1800;
export const OVERVIEW_FOCUS_HANDOFF_DELAY_MS = 90;
// Let the selector acknowledge first, then move the heavier market surface update off the same click.
const PROFILE_SURFACE_HANDOFF_DELAY_MS = 120;

const isInteractionPerfMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('dtn-perf') === 'interaction';
};

const getInitialAppProfileId = (): InvestorProfileId => {
  if (isInteractionPerfMode()) {
    return 'etf-starter';
  }

  return getInitialInvestorProfileId();
};

const DeferredPanelPlaceholder = ({
  title,
  subtitle,
  minHeight,
}: {
  title: string;
  subtitle: string;
  minHeight: number;
}) => {
  return (
    <DashboardPanel title={title} subtitle={subtitle} minHeight={minHeight}>
      <Stack spacing={1.1}>
        <Skeleton variant="rounded" height={18} width="38%" animation={false} />
        <Skeleton variant="rounded" height={96} animation={false} />
        <Skeleton variant="rounded" height={96} animation={false} />
      </Stack>
    </DashboardPanel>
  );
};

const getDeferredPanelErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'A deferred dashboard section failed to load.';
};

const DeferredPanelErrorFallback = ({
  error,
  title,
  minHeight,
}: FallbackProps & {
  title: string;
  minHeight: number;
}) => {
  return (
    <DashboardPanel
      title={title}
      subtitle="This panel could not be loaded. The rest of the dashboard remains available."
      minHeight={minHeight}
    >
      <Stack spacing={1.2} role="alert">
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
          {getDeferredPanelErrorMessage(error)}
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            window.location.reload();
          }}
          sx={{ alignSelf: 'flex-start' }}
        >
          Reload Dashboard
        </Button>
      </Stack>
    </DashboardPanel>
  );
};

const DeferredPanel = ({
  isReady,
  title,
  subtitle,
  minHeight,
  children,
}: {
  isReady: boolean;
  title: string;
  subtitle: string;
  minHeight: number;
  children: ReactNode;
}) => {
  const placeholder = (
    <DeferredPanelPlaceholder title={title} subtitle={subtitle} minHeight={minHeight} />
  );

  if (!isReady) {
    return placeholder;
  }

  return (
    <ErrorBoundary
      fallbackRender={(fallbackProps) => (
        <DeferredPanelErrorFallback
          {...fallbackProps}
          title={title}
          minHeight={minHeight}
        />
      )}
    >
      <Suspense fallback={placeholder}>{children}</Suspense>
    </ErrorBoundary>
  );
};

interface AppProps {
  colorMode: ColorMode;
  onToggleColorMode: () => void;
}

export const App = ({ colorMode, onToggleColorMode }: AppProps) => {
  const [activeProfileId, setActiveProfileId] = useState<InvestorProfileId>(() =>
    getInitialAppProfileId(),
  );
  const isPerfMode = isInteractionPerfMode();
  const activeProfile = getInvestorProfile(activeProfileId);
  const pendingProfileHandoffTimerRef = useRef<number | null>(null);
  const watchlist = activeProfile.watchlist.map((entry) => entry.symbol);
  const watchlistKey = watchlist.join(',');
  const defaultWatchlistSymbol = watchlist[0] ?? '';
  const symbolTypes = Object.fromEntries(
    activeProfile.watchlist.map((entry) => [entry.symbol, entry.assetType]),
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultWatchlistSymbol);
  const [overviewSymbol, setOverviewSymbol] = useState<string>(defaultWatchlistSymbol);
  const isSelectedSymbolInWatchlist = watchlist.includes(selectedSymbol);
  const [liveQuotes, setLiveQuotes] = useState<Quote[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Record<string, number[]>>({});
  const pendingOverviewHandoffTimerRef = useRef<number | null>(null);
  const deferredSelectedSymbol = useDeferredValue(selectedSymbol);
  const showDeferredPanels = useDeferredReveal({
    delayMs: SECONDARY_PANEL_DELAY_MS,
    idleTimeoutMs: SECONDARY_PANEL_IDLE_TIMEOUT_MS,
    quietWindowMs: SECONDARY_PANEL_QUIET_WINDOW_MS,
  });

  useMarketSocket({
    symbols: watchlist,
    onTicks: (ticks) => {
      startTransition(() => {
        setLiveQuotes((currentQuotes) => applyTicksToQuotes(currentQuotes, ticks));
        setSessionHistory((currentHistory) =>
          appendPriceHistory(
            currentHistory,
            ticks.map((tick) => ({ symbol: tick.symbol, price: tick.price })),
          ),
        );
      });
    },
  });

  const setPrice = usePortfolioStore((state) => state.setPrice);
  const cash = usePortfolioStore((state) => state.cash);
  const totalValue = usePortfolioStore((state) => state.totalValue());
  const unrealizedPnL = usePortfolioStore((state) => state.unrealizedPnL());
  const positionsCount = usePortfolioStore((state) => Object.keys(state.holdings).length);

  const marketQuery = useQuery({
    queryKey: ['market', watchlistKey],
    queryFn: () => fetchMarketData(watchlist),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (isPerfMode) {
      return;
    }

    persistInvestorProfileId(activeProfileId);
  }, [activeProfileId, isPerfMode]);

  useEffect(() => {
    return () => {
      if (pendingProfileHandoffTimerRef.current !== null) {
        window.clearTimeout(pendingProfileHandoffTimerRef.current);
      }

      if (pendingOverviewHandoffTimerRef.current !== null) {
        window.clearTimeout(pendingOverviewHandoffTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSelectedSymbolInWatchlist) {
      setSelectedSymbol(defaultWatchlistSymbol);
    }
  }, [defaultWatchlistSymbol, isSelectedSymbolInWatchlist]);

  useEffect(() => {
    if (!marketQuery.data?.length) {
      return;
    }

    setLiveQuotes(marketQuery.data);

    for (const quote of marketQuery.data) {
      setPrice(quote.symbol, quote.price);
    }

    startTransition(() => {
      setSessionHistory((currentHistory) =>
        appendPriceHistory(
          currentHistory,
          marketQuery.data.map((quote) => ({ symbol: quote.symbol, price: quote.price })),
        ),
      );
    });
  }, [marketQuery.data, setPrice]);

  const quotes = liveQuotes.length > 0 ? liveQuotes : marketQuery.data ?? [];
  const deferredTradeQuotes = useDeferredValue(quotes);
  const selectedQuote = quotes.find((quote) => quote.symbol === selectedSymbol) ?? quotes[0];
  const selectedQuoteSymbol = selectedQuote?.symbol ?? '';
  const overviewQuote = quotes.find((quote) => quote.symbol === overviewSymbol) ?? selectedQuote;

  useEffect(() => {
    // Keep the row selection paint ahead of the larger overview refresh on slower runners.
    if (selectedQuoteSymbol.length === 0 || selectedQuoteSymbol === overviewSymbol) {
      return;
    }

    if (pendingOverviewHandoffTimerRef.current !== null) {
      window.clearTimeout(pendingOverviewHandoffTimerRef.current);
    }

    pendingOverviewHandoffTimerRef.current = window.setTimeout(() => {
      pendingOverviewHandoffTimerRef.current = null;

      startTransition(() => {
        setOverviewSymbol(selectedQuoteSymbol);
      });
    }, OVERVIEW_FOCUS_HANDOFF_DELAY_MS);

    return () => {
      if (pendingOverviewHandoffTimerRef.current !== null) {
        window.clearTimeout(pendingOverviewHandoffTimerRef.current);
        pendingOverviewHandoffTimerRef.current = null;
      }
    };
  }, [overviewSymbol, selectedQuoteSymbol]);

  const handleSelectProfile = useCallback((profileId: InvestorProfileId) => {
    if (profileId === activeProfileId) {
      return;
    }

    const nextProfile = getInvestorProfile(profileId);
    const nextWatchlist = new Set(nextProfile.watchlist.map((entry) => entry.symbol));
    const nextDefaultSymbol = nextProfile.watchlist[0]?.symbol ?? '';

    if (pendingProfileHandoffTimerRef.current !== null) {
      window.clearTimeout(pendingProfileHandoffTimerRef.current);
    }

    pendingProfileHandoffTimerRef.current = window.setTimeout(() => {
      pendingProfileHandoffTimerRef.current = null;

      startTransition(() => {
        setActiveProfileId(profileId);
        setLiveQuotes((currentQuotes) =>
          currentQuotes.filter((quote) => nextWatchlist.has(quote.symbol)),
        );
        setSessionHistory((currentHistory) =>
          Object.fromEntries(
            Object.entries(currentHistory).filter(([symbol]) => nextWatchlist.has(symbol)),
          ),
        );
        setSelectedSymbol((currentSymbol) =>
          nextWatchlist.has(currentSymbol) ? currentSymbol : nextDefaultSymbol,
        );
      });
    }, PROFILE_SURFACE_HANDOFF_DELAY_MS);
  }, [activeProfileId]);

  return (
    <AppShell colorMode={colorMode} onToggleColorMode={onToggleColorMode}>
      <AccountOverview
        cash={cash}
        totalValue={totalValue}
        unrealizedPnL={unrealizedPnL}
        positionsCount={positionsCount}
        trackedSymbols={quotes.length}
        selectedQuote={overviewQuote}
      />
      <Grid container spacing={2} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 8 }}>
          <MarketTable
            quotes={quotes}
            selectedSymbol={selectedQuote?.symbol ?? selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            priceHistory={sessionHistory}
            watchlistLabel={activeProfile.label}
            watchlistDescription={activeProfile.summary}
            symbolTypes={symbolTypes}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <InvestorProfilePanel
            profiles={INVESTOR_PROFILES}
            selectedProfileId={activeProfile.id}
            onSelectProfile={handleSelectProfile}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <DeferredPanel
            isReady={showDeferredPanels}
            title="AI Guidance for Everyday Investors"
            subtitle="Secondary guidance loads after the core market surface settles."
            minHeight={352}
          >
            <LazySuggestionsPanel />
          </DeferredPanel>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <DeferredPanel
            isReady={showDeferredPanels}
            title="Paper Order Ticket"
            subtitle="Execution tooling loads after the primary watchlist becomes interactive."
            minHeight={496}
          >
            <LazyTradePanel
              quotes={deferredTradeQuotes}
              selectedSymbol={deferredSelectedSymbol}
              onSelectSymbol={setSelectedSymbol}
            />
          </DeferredPanel>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <DeferredPanel
            isReady={showDeferredPanels}
            title="Portfolio Exposure"
            subtitle="Position analytics load once the critical dashboard surface is idle."
            minHeight={316}
          >
            <LazyPortfolioSummary />
          </DeferredPanel>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <DeferredPanel
            isReady={showDeferredPanels}
            title="Historical Comparison"
            subtitle="Backtest analysis loads after the core research tools are interactive."
            minHeight={420}
          >
            <LazyBacktestPanel />
          </DeferredPanel>
        </Grid>
      </Grid>
    </AppShell>
  );
};
