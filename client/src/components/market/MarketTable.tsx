import {
  alpha,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import { SessionSparkline } from '../common/SessionSparkline';
import { useDeferredReveal } from '../../hooks/useDeferredReveal';
import type { AssetType, Quote } from '../../types/market';
import type { SessionHistory } from '../../utils/marketSession';
import { formatQuoteFreshness } from '../../utils/marketSession';

const volumeFormatter = new Intl.NumberFormat('en-US');
export const MARKET_SELECTION_HANDOFF_DELAY_MS = 90;
const MARKET_SYMBOL_SHELL_CLASS_NAME = 'market-table-symbol-shell';

interface MarketTableProps {
  quotes: Quote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  priceHistory: SessionHistory;
  watchlistLabel?: string;
  watchlistDescription?: string;
  symbolTypes?: Partial<Record<string, AssetType>>;
}

const SparklinePlaceholder = () => {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        width: 104,
        height: 34,
        borderRadius: 999,
        px: 0.5,
        backgroundColor: alpha(
          theme.palette.text.primary,
          theme.palette.mode === 'dark' ? 0.08 : 0.05,
        ),
      })}
    />
  );
};

const sourceColor = (source: Quote['source']): 'success' | 'warning' | 'default' => {
  if (source === 'live') {
    return 'success';
  }
  if (source === 'cached') {
    return 'warning';
  }
  return 'default';
};

interface MarketTableRowProps {
  quote: Quote;
  isSelected: boolean;
  isDashboardSynced: boolean;
  assetType: AssetType;
  values: number[];
  showSparkline: boolean;
  onSelectSymbol: (symbol: string) => void;
}

const MarketTableRow = memo(({
  quote,
  isSelected,
  isDashboardSynced,
  assetType,
  values,
  showSparkline,
  onSelectSymbol,
}: MarketTableRowProps) => {
  const isSelectionPending = isSelected && !isDashboardSynced;
  const isSelectionCommitted = isDashboardSynced;
  const trendTone =
    quote.price === 0 ? 'neutral' : quote.changePercent >= 0 ? 'positive' : 'negative';
  const symbolContextLabel =
    quote.price === 0
      ? 'Awaiting quote'
      : isSelectionCommitted
        ? assetType === 'etf'
          ? 'Focused for comparison'
          : 'Focused in ticket'
        : isSelectionPending
          ? 'Syncing selection'
        : assetType === 'etf'
        ? 'Broader exposure idea'
        : 'Single-stock research';

  const selectQuote = () => {
    if (quote.price <= 0 || isSelected) {
      return;
    }

    onSelectSymbol(quote.symbol);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectQuote();
    }
  };

  return (
    <TableRow
      tabIndex={quote.price > 0 ? 0 : -1}
      aria-selected={isSelected}
      onClick={selectQuote}
      onKeyDown={handleRowKeyDown}
      sx={(theme) => ({
        cursor: quote.price > 0 ? 'pointer' : 'default',
        '& td': {
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        },
        // Keep hover and selection paint on the symbol shell so the row click does not repaint every metric cell.
        [`& td:first-of-type .${MARKET_SYMBOL_SHELL_CLASS_NAME}`]: {
          backgroundColor: isSelectionCommitted
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.07)
            : 'transparent',
        },
        [`&:hover td:first-of-type .${MARKET_SYMBOL_SHELL_CLASS_NAME}`]: quote.price > 0
          ? {
              backgroundColor: isSelectionCommitted
                ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1)
                : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.025),
            }
          : undefined,
        [`&:focus-visible td:first-of-type .${MARKET_SYMBOL_SHELL_CLASS_NAME}`]: {
          boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.75 : 0.45)}`,
        },
      })}
    >
        <TableCell>
          <Box
            className={MARKET_SYMBOL_SHELL_CLASS_NAME}
            data-testid={`market-symbol-shell-${quote.symbol}`}
            data-selection-visual-state={
              isSelectionCommitted ? 'synced' : isSelectionPending ? 'pending' : 'idle'
            }
            sx={{ borderRadius: 2, px: 1, py: 0.75, contain: 'paint', transition: 'none' }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={(theme) => ({
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor:
                    quote.price === 0
                      ? theme.palette.text.disabled
                      : isSelected
                        ? theme.palette.primary.main
                        : quote.changePercent >= 0
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                })}
              />
              <div>
                <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '0.02em' }}>
                    {quote.symbol}
                  </Typography>
                  <Chip label={assetType.toUpperCase()} size="small" variant="outlined" />
                </Stack>
                <Typography
                  variant="caption"
                  aria-live={isSelectionPending ? 'polite' : undefined}
                  sx={{
                    color: isSelectionCommitted ? 'primary.main' : 'text.secondary',
                    fontWeight: isSelectionCommitted ? 700 : 500,
                  }}
                >
                  {symbolContextLabel}
                </Typography>
              </div>
            </Stack>
          </Box>
        </TableCell>
        <TableCell sx={{ color: 'text.primary', fontWeight: 700 }} align="right">
          <Box component="span" sx={{ display: 'inline-block', contain: 'paint' }}>
            {quote.price === 0 ? '--' : `$${quote.price.toFixed(2)}`}
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ width: 160 }}>
          {quote.price === 0 ? (
            '--'
          ) : (
            <Stack
              alignItems="flex-end"
              spacing={0.5}
              data-testid={`market-session-panel-${quote.symbol}`}
              sx={{ contain: 'paint' }}
            >
              {showSparkline ? (
                <SessionSparkline values={values} tone={trendTone} />
              ) : (
                <SparklinePlaceholder />
              )}
              <Typography
                variant="caption"
                sx={{ color: quote.changePercent >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
              >
                {`${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`}
              </Typography>
            </Stack>
          )}
        </TableCell>
        <TableCell
          sx={{ color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}
          align="right"
        >
          <Box component="span" sx={{ display: 'inline-block', contain: 'paint' }}>
            {quote.price === 0 ? '--' : volumeFormatter.format(quote.volume)}
          </Box>
        </TableCell>
        <TableCell align="right">
          {quote.price === 0 ? (
            '--'
          ) : (
            <Stack
              alignItems="flex-end"
              spacing={0.5}
              data-testid={`market-feed-panel-${quote.symbol}`}
              sx={{ contain: 'paint' }}
            >
              <Chip
                label={quote.source.toUpperCase()}
                size="small"
                color={sourceColor(quote.source)}
                variant="outlined"
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatQuoteFreshness(quote.asOf)}
              </Typography>
            </Stack>
          )}
        </TableCell>
    </TableRow>
  );
});

export const MarketTable = memo(({
  quotes,
  selectedSymbol,
  onSelectSymbol,
  priceHistory,
  watchlistLabel,
  watchlistDescription,
  symbolTypes = {},
}: MarketTableProps) => {
  const [pendingSelectionSymbol, setPendingSelectionSymbol] = useState<string | null>(null);
  const pendingSelectionHandoffTimerRef = useRef<number | null>(null);
  const previousSelectedSymbolRef = useRef(selectedSymbol);
  const showSparklines = useDeferredReveal({
    delayMs: 900,
    idleTimeoutMs: 1200,
    quietWindowMs: 1400,
  });

  useLayoutEffect(() => {
    if (previousSelectedSymbolRef.current === selectedSymbol) {
      return;
    }

    previousSelectedSymbolRef.current = selectedSymbol;

    if (pendingSelectionSymbol === null) {
      return;
    }

    if (pendingSelectionHandoffTimerRef.current !== null) {
      window.clearTimeout(pendingSelectionHandoffTimerRef.current);
      pendingSelectionHandoffTimerRef.current = null;
    }

    setPendingSelectionSymbol(null);
  }, [pendingSelectionSymbol, selectedSymbol]);

  useEffect(() => {
    return () => {
      if (pendingSelectionHandoffTimerRef.current !== null) {
        window.clearTimeout(pendingSelectionHandoffTimerRef.current);
      }
    };
  }, []);

  const handleSelectSymbol = useCallback((symbol: string) => {
    setPendingSelectionSymbol(symbol);

    if (pendingSelectionHandoffTimerRef.current !== null) {
      window.clearTimeout(pendingSelectionHandoffTimerRef.current);
      pendingSelectionHandoffTimerRef.current = null;
    }

    pendingSelectionHandoffTimerRef.current = window.setTimeout(() => {
      pendingSelectionHandoffTimerRef.current = null;

      onSelectSymbol(symbol);
    }, MARKET_SELECTION_HANDOFF_DELAY_MS);
  }, [onSelectSymbol]);

  const displayedSelectedSymbol = pendingSelectionSymbol ?? selectedSymbol;

  const visibleRows = quotes.length > 0 ? quotes : Array.from({ length: 10 }, (_, idx) => ({
      symbol: `--${idx + 1}`,
      price: 0,
      changePercent: 0,
      volume: 0,
      source: 'synthetic' as const,
      asOf: Date.now(),
    }));

  return (
    <DashboardPanel
      title="Watchlist"
      subtitle={watchlistDescription ?? 'Quotes, session move, and feed freshness in one place.'}
      action={
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          {watchlistLabel ? <Chip label={watchlistLabel} variant="outlined" color="primary" size="small" /> : null}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Select a row to sync the ticket.
          </Typography>
        </Stack>
      }
      minHeight={520}
    >
      <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 0, overflow: 'hidden' })}>
        <Table size="small">
          <TableHead>
            <TableRow sx={(theme) => ({ backgroundColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.02) })}>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Symbol
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }} align="right">
                Price
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }} align="right">
                Session
              </TableCell>
              <TableCell
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  display: { xs: 'none', md: 'table-cell' },
                }}
                align="right"
              >
                Volume
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }} align="right">
                Feed
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((quote) => {
              const values = priceHistory[quote.symbol] ?? (quote.price > 0 ? [quote.price] : []);
              const assetType = symbolTypes[quote.symbol] ?? 'stock';

              return (
                <MarketTableRow
                  key={quote.symbol}
                  quote={quote}
                  isSelected={quote.symbol === displayedSelectedSymbol && quote.price > 0}
                  isDashboardSynced={quote.symbol === selectedSymbol && quote.price > 0}
                  assetType={assetType}
                  values={values}
                  showSparkline={showSparklines}
                  onSelectSymbol={handleSelectSymbol}
                />
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </DashboardPanel>
  );
});

MarketTable.displayName = 'MarketTable';
