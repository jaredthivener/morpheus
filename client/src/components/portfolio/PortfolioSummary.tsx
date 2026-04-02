import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import { usePortfolioStore } from '../../store/portfolioStore';

export const PortfolioSummary = () => {
  const theme = useTheme();
  const cash = usePortfolioStore((state) => state.cash);
  const holdings = usePortfolioStore((state) => state.holdings);
  const prices = usePortfolioStore((state) => state.prices);
  const totalValue = usePortfolioStore((state) => state.totalValue());
  const unrealizedPnL = usePortfolioStore((state) => state.unrealizedPnL());

  const allocationData = Object.values(holdings)
    .map((holding) => ({
      symbol: holding.symbol,
      shares: holding.shares,
      value: (prices[holding.symbol] ?? holding.avgCost) * holding.shares,
      pnl: ((prices[holding.symbol] ?? holding.avgCost) - holding.avgCost) * holding.shares,
    }))
    .sort((a, b) => b.value - a.value);

  const totalAllocation = allocationData.reduce((sum, row) => sum + row.value, 0);
  const investedCapital = Math.max(0, totalValue - cash);

  return (
    <DashboardPanel
      title="Portfolio Exposure"
      subtitle="Position weights and unrealized P/L across open holdings."
      action={<Chip label={`${allocationData.length} position${allocationData.length === 1 ? '' : 's'}`} variant="outlined" />}
    >
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip label={`Cash ${cash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`} variant="outlined" />
        <Chip
          label={`Invested ${investedCapital.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}
          variant="outlined"
        />
        <Chip
          label={`P/L ${unrealizedPnL >= 0 ? '+' : '-'}${Math.abs(unrealizedPnL).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}`}
          sx={{ color: unrealizedPnL >= 0 ? 'success.main' : 'error.main' }}
          variant="outlined"
        />
      </Stack>

      <Box>
        {allocationData.length === 0 ? (
          <Box
            sx={(theme) => ({
              minHeight: 220,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              borderRadius: '24px',
              border: `1px dashed ${alpha(theme.palette.divider, 0.95)}`,
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.03)} 0%, ${alpha(theme.palette.background.paper, 0.84)} 100%)`
                  : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
              px: 2,
            })}
          >
            <div>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                No open positions yet.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Select a symbol from the watchlist and send a paper trade to begin building exposure.
              </Typography>
            </div>
          </Box>
        ) : (
          <Grid container spacing={1.25}>
            {allocationData.map((row) => {
              const ratio = totalAllocation > 0 ? row.value / totalAllocation : 0;
              const widthPercent = Math.max(10, Math.round(ratio * 100));
              return (
                <Grid key={row.symbol} size={{ xs: 12, md: 6 }}>
                  <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 1.35, height: '100%' })}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                      <div>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {row.symbol}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.shares} shares • {(ratio * 100).toFixed(1)}% of deployed capital
                        </Typography>
                      </div>
                      <Stack alignItems="flex-end">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {row.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: row.pnl >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
                        >
                          {row.pnl >= 0 ? '+' : '-'}
                          {Math.abs(row.pnl).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Box
                      sx={(theme) => ({
                        mt: 1,
                        width: '100%',
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                        overflow: 'hidden',
                      })}
                    >
                      <Box
                        sx={{
                          width: `${widthPercent}%`,
                          height: '100%',
                          borderRadius: 999,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.success.main})`,
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </DashboardPanel>
  );
};
