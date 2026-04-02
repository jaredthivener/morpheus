import { startTransition, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Grid } from '@mui/material';
import { fetchMarketData } from './api/client';
import { AccountOverview } from './components/layout/AccountOverview';
import { AppShell } from './components/layout/AppShell';
import { MarketTable } from './components/market/MarketTable';
import { InvestorProfilePanel } from './components/onboarding/InvestorProfilePanel';
import { BacktestPanel } from './components/portfolio/BacktestPanel';
import { PortfolioSummary } from './components/portfolio/PortfolioSummary';
import { SuggestionsPanel } from './components/suggestions/SuggestionsPanel';
import { TradePanel } from './components/trading/TradePanel';
import { useMarketSocket } from './hooks/useMarketSocket';
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
          <SuggestionsPanel />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <TradePanel
            quotes={quotes}
            selectedSymbol={selectedQuote?.symbol ?? selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <PortfolioSummary />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <BacktestPanel />
        </Grid>
      </Grid>
    </AppShell>
  );
};
