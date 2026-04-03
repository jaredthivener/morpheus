import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { memo } from 'react';
import { fetchGuidance } from '../../api/client';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import type { GuidanceBundle, GuidanceItem } from '../../types/market';

export const SuggestionsPanel = memo(() => {
  const theme = useTheme();
  const guidanceQuery = useQuery({
    queryKey: ['guidance', 4],
    queryFn: () => fetchGuidance(4),
    refetchInterval: 30_000,
  });

  const buildPlaceholderItems = (
    prefix: string,
    assetType: GuidanceItem['assetType'],
    stance: GuidanceItem['stance'],
    trend: GuidanceItem['trend'],
  ): GuidanceItem[] =>
    Array.from({ length: 4 }, (_, index) => ({
      symbol: `${prefix}-${index + 1}`,
      assetType,
      stance,
      trend,
      riskLevel: 'medium',
      confidence: 0,
      summary: 'Loading guidance...',
      rationale: 'Updating AI guidance and risk framing.',
    }));

  const guidance: GuidanceBundle =
    guidanceQuery.data ?? {
      beginnerMessage:
        'Start with diversified ideas and treat every AI signal as a research prompt, not a command.',
      stockIdeas: buildPlaceholderItems('STOCK', 'stock', 'research', 'up'),
      stockCautions: buildPlaceholderItems('CAUTION', 'stock', 'avoid', 'down'),
      etfLeaders: buildPlaceholderItems('ETF-UP', 'etf', 'research', 'up'),
      etfLaggards: buildPlaceholderItems('ETF-DOWN', 'etf', 'avoid', 'down'),
    };

  const sections = [
    {
      title: 'Good Stocks to Research',
      subtitle: 'Higher-quality stock ideas worth researching further.',
      note: 'Stronger quality and stability inputs.',
      tone: 'primary',
      rows: guidance.stockIdeas,
      prefix: 's',
    },
    {
      title: 'Stocks to Avoid for Now',
      subtitle: 'Names showing weaker stability or trend support.',
      note: 'Caution is higher while trend support is weaker.',
      tone: 'error',
      rows: guidance.stockCautions,
      prefix: 'c',
    },
    {
      title: 'ETFs Trending Up',
      subtitle: 'Broader market or sector funds with stronger direction.',
      note: 'Useful for diversified trend research.',
      tone: 'success',
      rows: guidance.etfLeaders,
      prefix: 'l',
    },
    {
      title: 'ETFs Trending Down',
      subtitle: 'Funds losing strength across recent windows.',
      note: 'Better treated as caution signals than fresh entries.',
      tone: 'warning',
      rows: guidance.etfLaggards,
      prefix: 'd',
    },
  ] as const;

  return (
    <DashboardPanel
      title="AI Guidance for Everyday Investors"
      subtitle="A compact research board for everyday investors, with cleaner comparisons and less visual waste."
      action={<Chip label="Educational only" variant="outlined" color="primary" size="small" />}
      minHeight={0}
    >
      <Stack spacing={1.15}>
        <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 1.2, borderRadius: '18px' })}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5, maxWidth: 760 }}>
              {guidance.beginnerMessage}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Chip label="Research prompts" size="small" variant="outlined" />
              <Chip label="Stocks + ETFs" size="small" variant="outlined" />
            </Stack>
          </Stack>
        </Box>

        <Grid container spacing={1.5}>
          {sections.map((section) => {
            const accent = theme.palette[section.tone].main;

            return (
            <Grid key={section.title} size={{ xs: 12, sm: 6 }}>
              <Box
                sx={(theme) => ({
                  ...insetSurfaceSx(theme),
                  p: 1.15,
                  height: '100%',
                  borderRadius: '18px',
                })}
              >
                <Stack spacing={0.95}>
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <div>
                      <Typography variant="subtitle2" sx={{ mb: 0.15, fontWeight: 700 }}>
                        {section.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {section.subtitle}
                      </Typography>
                    </div>
                    <Chip label={`${Math.min(section.rows.length, 2)} ideas`} size="small" variant="outlined" />
                  </Stack>

                  <Stack spacing={0.6}>
                    {section.rows.slice(0, 2).map((item) => (
                      <Box
                        key={`${section.prefix}-${item.symbol}`}
                        sx={(theme) => ({
                          borderRadius: '16px',
                          px: 1,
                          py: 0.85,
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? alpha(accent, 0.1)
                              : alpha(accent, 0.06),
                          border: `1px solid ${alpha(accent, theme.palette.mode === 'dark' ? 0.24 : 0.12)}`,
                        })}
                      >
                        <Stack spacing={0.65}>
                          <Stack direction="row" justifyContent="space-between" spacing={1.25} alignItems="flex-start">
                            <div>
                              <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                  {item.symbol}
                                </Typography>
                                <Chip label={item.assetType.toUpperCase()} size="small" variant="outlined" />
                                <Chip label={item.trend === 'up' ? 'UP' : 'DOWN'} size="small" variant="outlined" />
                              </Stack>
                            </div>

                            <Stack alignItems="flex-end" spacing={0.35}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {item.confidence.toFixed(0)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: item.riskLevel === 'high' ? 'warning.main' : 'text.secondary',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {item.riskLevel} risk
                              </Typography>
                            </Stack>
                          </Stack>

                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              lineHeight: 1.45,
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.summary}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>

                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {section.note}
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          );})}
        </Grid>
      </Stack>
    </DashboardPanel>
  );
});

