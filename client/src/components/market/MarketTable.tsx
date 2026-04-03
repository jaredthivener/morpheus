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
import { memo, type KeyboardEvent } from 'react';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import { SessionSparkline } from '../common/SessionSparkline';
import { useDeferredReveal } from '../../hooks/useDeferredReveal';
import type { AssetType, Quote } from '../../types/market';
import type { SessionHistory } from '../../utils/marketSession';
import { formatQuoteFreshness } from '../../utils/marketSession';

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
  assetType: AssetType;
  values: number[];
  showSparkline: boolean;
  onSelectSymbol: (symbol: string) => void;
}

const MarketTableRow = memo(({
  quote,
  isSelected,
  assetType,
  values,
  showSparkline,
  onSelectSymbol,
}: MarketTableRowProps) => {
  const trendTone =
    quote.price === 0 ? 'neutral' : quote.changePercent >= 0 ? 'positive' : 'negative';

  const selectQuote = () => {
    if (quote.price <= 0) {
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
      hover={quote.price > 0}
      tabIndex={quote.price > 0 ? 0 : -1}
      aria-selected={isSelected}
      onClick={selectQuote}
      onKeyDown={handleRowKeyDown}
      sx={(theme) => ({
        cursor: quote.price > 0 ? 'pointer' : 'default',
        transition: 'background-color 160ms ease',
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.07)
          : 'transparent',
        '& td': {
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        },
        '&:hover': quote.price > 0
          ? {
              backgroundColor: isSelected
                ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1)
                : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.025),
            }
          : undefined,
      })}
    >
        <TableCell>
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
                boxShadow: isSelected
                  ? `0 0 0 6px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.14)}`
                  : 'none',
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
                sx={{ color: isSelected ? 'primary.main' : 'text.secondary', fontWeight: isSelected ? 700 : 500 }}
              >
                {quote.price === 0
                  ? 'Awaiting quote'
                  : assetType === 'etf'
                    ? isSelected
                      ? 'Focused for comparison'
                      : 'Broader exposure idea'
                    : isSelected
                      ? 'Focused in ticket'
                      : 'Single-stock research'}
              </Typography>
            </div>
          </Stack>
        </TableCell>
        <TableCell sx={{ color: 'text.primary', fontWeight: 700 }} align="right">
          {quote.price === 0 ? '--' : `$${quote.price.toFixed(2)}`}
        </TableCell>
        <TableCell align="right" sx={{ width: 160 }}>
          {quote.price === 0 ? (
            '--'
          ) : (
            <Stack alignItems="flex-end" spacing={0.5}>
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
          {quote.price === 0 ? '--' : quote.volume.toLocaleString()}
        </TableCell>
        <TableCell align="right">
          {quote.price === 0 ? (
            '--'
          ) : (
            <Stack alignItems="flex-end" spacing={0.5}>
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

export const MarketTable = ({
  quotes,
  selectedSymbol,
  onSelectSymbol,
  priceHistory,
  watchlistLabel,
  watchlistDescription,
  symbolTypes = {},
}: MarketTableProps) => {
    const showSparklines = useDeferredReveal({
    delayMs: 900,
      idleTimeoutMs: 1200,
      quietWindowMs: 1400,
    });

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
                    isSelected={quote.symbol === selectedSymbol && quote.price > 0}
                    assetType={assetType}
                    values={values}
                    showSparkline={showSparklines}
                    onSelectSymbol={onSelectSymbol}
                  />
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </DashboardPanel>
    );
  };
