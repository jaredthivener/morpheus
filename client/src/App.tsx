import {
  lazy,
  startTransition,
  Suspense,
  useDeferredValue,
  useEffect,
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

const SECONDARY_PANEL_IDLE_TIMEOUT_MS = 3000;

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
  const [selectedProfileId, setSelectedProfileId] = useState(() => getInitialInvestorProfileId());
  const selectedProfile = getInvestorProfile(selectedProfileId);
  const watchlist = selectedProfile.watchlist.map((entry) => entry.symbol);
  const watchlistKey = watchlist.join(',');
  const defaultWatchlistSymbol = watchlist[0] ?? '';
  const symbolTypes = Object.fromEntries(
    selectedProfile.watchlist.map((entry) => [entry.symbol, entry.assetType]),
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultWatchlistSymbol);
  const isSelectedSymbolInWatchlist = watchlist.includes(selectedSymbol);
  const [liveQuotes, setLiveQuotes] = useState<Quote[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Record<string, number[]>>({});
  const deferredSelectedSymbol = useDeferredValue(selectedSymbol);
  const showDeferredPanels = useDeferredReveal({
    idleTimeoutMs: SECONDARY_PANEL_IDLE_TIMEOUT_MS,
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
    persistInvestorProfileId(selectedProfileId);
  }, [selectedProfileId]);

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
  const selectedQuote = quotes.find((quote) => quote.symbol === selectedSymbol) ?? quotes[0];

  return (
    <AppShell colorMode={colorMode} onToggleColorMode={onToggleColorMode}>
      <AccountOverview
        cash={cash}
        totalValue={totalValue}
        unrealizedPnL={unrealizedPnL}
        positionsCount={positionsCount}
        trackedSymbols={quotes.length}
        selectedQuote={selectedQuote}
      />
      <Grid container spacing={2} alignItems="flex-start">
        <Grid size={{ xs: 12, lg: 8 }}>
          <MarketTable
            quotes={quotes}
            selectedSymbol={selectedQuote?.symbol ?? selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            priceHistory={sessionHistory}
            watchlistLabel={selectedProfile.label}
            watchlistDescription={selectedProfile.summary}
            symbolTypes={symbolTypes}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <InvestorProfilePanel
            profiles={INVESTOR_PROFILES}
            selectedProfileId={selectedProfile.id}
            onSelectProfile={setSelectedProfileId}
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
              quotes={quotes}
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
