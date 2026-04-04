import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { memo } from 'react';
import type { Quote } from '../../types/market';
import { insetSurfaceSx, panelSurfaceSx } from '../common/DashboardPanel';
import { formatQuoteFreshness } from '../../utils/marketSession';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

interface AccountOverviewProps {
  cash: number;
  totalValue: number;
  unrealizedPnL: number;
  positionsCount: number;
  trackedSymbols: number;
  selectedQuote?: Quote;
}

const formatCurrency = (value: number): string => currencyFormatter.format(value);

interface AccountSnapshotPanelProps {
  cash: number;
  totalValue: number;
  unrealizedPnL: number;
  positionsCount: number;
  trackedSymbols: number;
}

const AccountSnapshotPanel = memo(({
  cash,
  totalValue,
  unrealizedPnL,
  positionsCount,
  trackedSymbols,
}: AccountSnapshotPanelProps) => {
  const pnlTone = unrealizedPnL >= 0 ? 'success.main' : 'error.main';

  const quickStats = [
    {
      label: 'Account value',
      value: formatCurrency(totalValue),
      tone: 'text.primary',
    },
    {
      label: 'Cash',
      value: formatCurrency(cash),
      tone: 'text.primary',
    },
    {
      label: 'Open P/L',
      value: `${unrealizedPnL >= 0 ? '+' : '-'}${formatCurrency(Math.abs(unrealizedPnL))}`,
      tone: pnlTone,
    },
    {
      label: 'Positions',
      value: String(positionsCount),
      tone: 'primary.main',
    },
  ];

  return (
    <Paper
      sx={(theme) => ({
        ...panelSurfaceSx(theme),
        p: { xs: 2, md: 2.25 },
        minHeight: 188,
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.22)} 0%, ${alpha(theme.palette.background.paper, 0.72)} 42%, ${alpha(theme.palette.common.black, 0.68)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.common.white, 0.9)} 44%, ${alpha(theme.palette.success.main, 0.16)} 100%)`,
      })}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          spacing={1.25}
        >
          <div>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.12em' }}>
              Account snapshot
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.04em', mt: 0.35 }}>
              {formatCurrency(totalValue)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
              Cash, open P/L, and exposure in one compact strip.
            </Typography>
          </div>
          <Chip label={`${trackedSymbols} symbols live`} variant="outlined" color="primary" />
        </Stack>

        <Grid container spacing={1.25}>
          {quickStats.map((metric) => (
            <Grid key={metric.label} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 1.25, minHeight: 92 })}>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}
                >
                  {metric.label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ mt: 0.45, fontWeight: 800, letterSpacing: '-0.03em', color: metric.tone }}
                >
                  {metric.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Paper>
  );
});

AccountSnapshotPanel.displayName = 'AccountSnapshotPanel';

const FocusedSymbolPanel = memo(({ selectedQuote }: Pick<AccountOverviewProps, 'selectedQuote'>) => {
  const changeTone = (selectedQuote?.changePercent ?? 0) >= 0 ? 'success.main' : 'error.main';
  const feedColor =
    selectedQuote?.source === 'live'
      ? 'success'
      : selectedQuote?.source === 'cached'
        ? 'warning'
        : 'default';

  return (
    <Paper
      sx={(theme) => ({
        ...panelSurfaceSx(theme),
        p: { xs: 2, md: 2.25 },
        minHeight: 188,
      })}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
          spacing={1}
        >
          <div>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.12em' }}>
              Focused symbol
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>
              {selectedQuote?.symbol ?? '--'}
            </Typography>
          </div>
          <Chip
            size="small"
            label={selectedQuote ? selectedQuote.source.toUpperCase() : 'AWAITING FEED'}
            color={feedColor}
            variant={selectedQuote?.source === 'live' ? 'filled' : 'outlined'}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              {selectedQuote ? formatCurrency(selectedQuote.price) : '--'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {selectedQuote ? formatQuoteFreshness(selectedQuote.asOf) : 'Awaiting the first quote batch'}
            </Typography>
          </div>
          <Stack direction="row" spacing={1} sx={{ minWidth: { sm: 200 } }}>
            <Box sx={(theme) => ({ ...insetSurfaceSx(theme), flex: 1, p: 1.1 })}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Move
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.25, fontWeight: 700, color: changeTone }}>
                {selectedQuote
                  ? `${selectedQuote.changePercent >= 0 ? '+' : ''}${selectedQuote.changePercent.toFixed(2)}%`
                  : '--'}
              </Typography>
            </Box>
            <Box sx={(theme) => ({ ...insetSurfaceSx(theme), flex: 1, p: 1.1 })}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Freshness
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.25, fontWeight: 700 }}>
                {selectedQuote ? formatQuoteFreshness(selectedQuote.asOf) : '--'}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
});

FocusedSymbolPanel.displayName = 'FocusedSymbolPanel';

export const AccountOverview = memo(({
  cash,
  totalValue,
  unrealizedPnL,
  positionsCount,
  trackedSymbols,
  selectedQuote,
}: AccountOverviewProps) => {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1}
        sx={{ mb: 1.5, px: 0.25 }}
      >
        <div>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
            Session overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 540, lineHeight: 1.45 }}>
            Account state on the left, active market focus on the right.
          </Typography>
        </div>
        <Chip
          label={selectedQuote ? `Focus ${selectedQuote.symbol}` : 'Syncing market feed'}
          color="primary"
          variant="outlined"
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <AccountSnapshotPanel
            cash={cash}
            totalValue={totalValue}
            unrealizedPnL={unrealizedPnL}
            positionsCount={positionsCount}
            trackedSymbols={trackedSymbols}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <FocusedSymbolPanel selectedQuote={selectedQuote} />
        </Grid>
      </Grid>
    </Box>
  );
});

AccountOverview.displayName = 'AccountOverview';