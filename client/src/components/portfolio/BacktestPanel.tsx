import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import { fetchBacktest } from '../../api/client';
import type { BacktestPoint } from '../../types/market';

interface StrategySeries {
  key: 'short' | 'long';
  label: string;
  lineLabel: string;
  color: string;
  points: BacktestPoint[];
  values: number[];
  returnPercent: number;
  endingEquity: number;
  maxDrawdownPercent: number;
}

interface ComparisonHoverPoint {
  key: StrategySeries['key'];
  label: string;
  color: string;
  timestamp: number;
  equity: number;
  xPercent: number;
  yPercent: number;
}

interface ComparisonHoverSnapshot {
  dateLabel: string;
  spread: number;
  guideXPercent: number;
  points: ComparisonHoverPoint[];
}

const CHART_HEIGHT = 240;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const percentageReturn = (values: number[]): number => {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined || first === 0) {
    return 0;
  }

  return ((last - first) / first) * 100;
};

const maxDrawdownPercent = (values: number[]): number => {
  const startingValue = values[0];
  if (startingValue === undefined || startingValue <= 0) {
    return 0;
  }

  let runningPeak = startingValue;
  let deepestPullback = 0;

  for (const value of values) {
    if (value > runningPeak) {
      runningPeak = value;
    }

    const drawdown = ((value - runningPeak) / runningPeak) * 100;
    if (drawdown < deepestPullback) {
      deepestPullback = drawdown;
    }
  }

  return deepestPullback;
};

const formatDateLabel = (timestamp: number | undefined): string => {
  if (timestamp === undefined || Number.isNaN(timestamp)) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
};

const buildStrategySeries = (
  key: StrategySeries['key'],
  label: string,
  lineLabel: string,
  color: string,
  data: BacktestPoint[] | undefined,
): StrategySeries => {
  const points = data ?? [];
  const values = points.map((point) => point.equity);

  return {
    key,
    label,
    lineLabel,
    color,
    points,
    values,
    returnPercent: percentageReturn(values),
    endingEquity: values[values.length - 1] ?? 0,
    maxDrawdownPercent: maxDrawdownPercent(values),
  };
};

const buildCurvePoints = (values: number[], min: number, max: number): string => {
  const range = Math.max(1, max - min);

  return values
    .map((value, idx) => {
      const x = (idx / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
};

const calculateYPercent = (value: number, min: number, max: number): number => {
  const range = Math.max(1, max - min);
  return 100 - ((value - min) / range) * 100;
};

const buildHoverSnapshot = (
  series: StrategySeries[],
  hoveredIndex: number,
  min: number,
  max: number,
): ComparisonHoverSnapshot | null => {
  const sharedPointCount = Math.max(...series.map((entry) => entry.points.length));
  if (sharedPointCount === 0) {
    return null;
  }

  const clampedIndex = clamp(hoveredIndex, 0, sharedPointCount - 1);
  const points = series.flatMap((entry) => {
    if (entry.points.length === 0) {
      return [];
    }

    const localIndex =
      entry.points.length === 1
        ? 0
        : Math.round((clampedIndex / Math.max(sharedPointCount - 1, 1)) * (entry.points.length - 1));
    const point = entry.points[localIndex];
    if (!point) {
      return [];
    }

    return [
      {
        key: entry.key,
        label: entry.label,
        color: entry.color,
        timestamp: point.timestamp,
        equity: point.equity,
        xPercent:
          entry.points.length === 1 ? 0 : (localIndex / Math.max(entry.points.length - 1, 1)) * 100,
        yPercent: calculateYPercent(point.equity, min, max),
      },
    ];
  });

  if (points.length === 0) {
    return null;
  }

  const leadingPoint = points[0];
  const trailingPoint = points[1];

  return {
    dateLabel: formatDateLabel(points[0]?.timestamp),
    spread:
      leadingPoint !== undefined && trailingPoint !== undefined
        ? Math.abs(leadingPoint.equity - trailingPoint.equity)
        : 0,
    guideXPercent:
      sharedPointCount === 1 ? 0 : (clampedIndex / Math.max(sharedPointCount - 1, 1)) * 100,
    points,
  };
};

const ComparisonMetric = ({
  label,
  value,
  supportingText,
}: {
  label: string;
  value: string;
  supportingText: string;
}) => {
  return (
    <Box sx={(theme) => ({ ...insetSurfaceSx(theme), flex: 1, minWidth: 0, p: 1.35 })}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.3, fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ mt: 0.45, display: 'block', color: 'text.secondary' }}>
        {supportingText}
      </Typography>
    </Box>
  );
};

const ComparisonChart = ({
  series,
  startLabel,
  endLabel,
}: {
  series: StrategySeries[];
  startLabel: string;
  endLabel: string;
}) => {
  const theme = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const allValues = series.flatMap((entry) => entry.values);

  if (allValues.length === 0) {
    return <div style={{ width: '100%', height: CHART_HEIGHT }} />;
  }

  const sharedPointCount = Math.max(...series.map((entry) => entry.points.length));
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padding = Math.max(1, (rawMax - rawMin) * 0.08);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const topLabel = formatCurrency(rawMax);
  const bottomLabel = formatCurrency(rawMin);
  const hoverSnapshot =
    hoveredIndex === null ? null : buildHoverSnapshot(series, hoveredIndex, min, max);

  const updateHoveredIndex = (nextIndex: number | null): void => {
    setHoveredIndex(nextIndex);
  };

  const resolveHoveredIndex = (element: HTMLDivElement, clientX: number): number | null => {
    if (sharedPointCount === 0) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) {
      return null;
    }

    const relativeX = clamp((clientX - rect.left) / rect.width, 0, 1);
    return Math.round(relativeX * Math.max(sharedPointCount - 1, 0));
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>): void => {
    updateHoveredIndex(resolveHoveredIndex(event.currentTarget, event.clientX));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || sharedPointCount === 0) {
      return;
    }

    event.preventDefault();
    setHoveredIndex((current) => {
      const baseIndex = current ?? sharedPointCount - 1;

      if (event.key === 'Home') {
        return 0;
      }

      if (event.key === 'End') {
        return sharedPointCount - 1;
      }

      return event.key === 'ArrowLeft'
        ? Math.max(0, baseIndex - 1)
        : Math.min(sharedPointCount - 1, baseIndex + 1);
    });
  };

  return (
    <Box sx={{ mt: 1.25 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={0.75}
        sx={{ mb: 1.15 }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {series.map((entry) => (
            <Stack direction="row" spacing={0.75} alignItems="center" key={entry.key}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '999px',
                  backgroundColor: entry.color,
                  boxShadow: `0 0 18px ${alpha(entry.color, 0.55)}`,
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entry.lineLabel}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Range {bottomLabel} to {topLabel}
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative' }}>
        <Box
          data-testid="backtest-comparison-chart-surface"
          sx={{ position: 'relative', outline: 'none' }}
          tabIndex={0}
          aria-label="Inspect historical simulation comparison"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => updateHoveredIndex(null)}
          onFocus={() => updateHoveredIndex(sharedPointCount > 0 ? sharedPointCount - 1 : null)}
          onBlur={() => updateHoveredIndex(null)}
          onKeyDown={handleKeyDown}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            width="100%"
            height={CHART_HEIGHT}
            role="img"
            aria-label="Historical simulation comparison chart"
          >
            {['18', '38', '58', '78'].map((offset) => (
              <line
                key={offset}
                x1="0"
                y1={offset}
                x2="100"
                y2={offset}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="0.3"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {series.map((entry) => (
              <polyline
                key={entry.key}
                fill="none"
                stroke={entry.color}
                strokeWidth={1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={buildCurvePoints(entry.values, min, max)}
              />
            ))}

            {hoverSnapshot ? (
              <g data-testid="backtest-hover-highlight">
                <line
                  x1={hoverSnapshot.guideXPercent}
                  y1="0"
                  x2={hoverSnapshot.guideXPercent}
                  y2="100"
                  stroke={theme.palette.primary.main}
                  strokeOpacity="0.26"
                  strokeWidth="0.45"
                  vectorEffect="non-scaling-stroke"
                />
                {hoverSnapshot.points.map((point) => (
                  <circle
                    key={`${point.key}-${point.timestamp}`}
                    cx={point.xPercent}
                    cy={point.yPercent}
                    r="2.05"
                    fill={theme.palette.background.paper}
                    stroke={point.color}
                    strokeWidth="0.85"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            ) : null}
          </svg>

          {hoverSnapshot ? (
            <Box
              data-testid="backtest-hover-tooltip"
              sx={(theme) => ({
                ...insetSurfaceSx(theme),
                position: 'absolute',
                top: 10,
                left: `clamp(110px, ${hoverSnapshot.guideXPercent}%, calc(100% - 110px))`,
                transform: 'translateX(-50%)',
                minWidth: 200,
                maxWidth: 220,
                px: 1.1,
                py: 0.95,
                pointerEvents: 'none',
                boxShadow: `0 14px 32px ${alpha(theme.palette.common.black, 0.28)}`,
              })}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Simulation date
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.15, fontWeight: 700 }}>
                {hoverSnapshot.dateLabel}
              </Typography>

              <Stack spacing={0.55} sx={{ mt: 0.85 }}>
                {hoverSnapshot.points.map((point) => (
                  <Stack
                    key={`${point.key}-tooltip`}
                    direction="row"
                    justifyContent="space-between"
                    spacing={1.25}
                  >
                    <Stack direction="row" spacing={0.65} alignItems="center" minWidth={0}>
                      <Box
                        aria-hidden="true"
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '999px',
                          backgroundColor: point.color,
                          boxShadow: `0 0 14px ${alpha(point.color, 0.55)}`,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {point.label}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {formatCurrency(point.equity)}
                    </Typography>
                  </Stack>
                ))}

                {hoverSnapshot.points.length > 1 ? (
                  <Stack direction="row" justifyContent="space-between" spacing={1.25}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Spread
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {formatCurrency(hoverSnapshot.spread)}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 0.8, color: 'text.secondary' }}
        >
          <Typography variant="caption">{startLabel}</Typography>
          <Typography variant="caption">{endLabel}</Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export const BacktestPanel = () => {
  const theme = useTheme();
  const shortQuery = useQuery({
    queryKey: ['backtest', 'short', 180],
    queryFn: () => fetchBacktest('short', 180),
  });

  const longQuery = useQuery({
    queryKey: ['backtest', 'long', 180],
    queryFn: () => fetchBacktest('long', 180),
  });

  const shortSeries = buildStrategySeries(
    'short',
    'Short model',
    'Short model path',
    theme.palette.primary.main,
    shortQuery.data,
  );
  const longSeries = buildStrategySeries(
    'long',
    'Long model',
    'Long model path',
    theme.palette.success.main,
    longQuery.data,
  );
  const hasData = shortSeries.values.length > 0 && longSeries.values.length > 0;
  const isLoading = shortQuery.isLoading || longQuery.isLoading;
  const hasError = shortQuery.isError || longQuery.isError;
  const endingGap = Math.abs(shortSeries.endingEquity - longSeries.endingEquity);
  const leader =
    shortSeries.endingEquity === longSeries.endingEquity
      ? null
      : shortSeries.endingEquity > longSeries.endingEquity
        ? shortSeries
        : longSeries;
  const trailingLabel = leader?.key === 'short' ? longSeries.label : shortSeries.label;
  const startLabel = formatDateLabel(shortQuery.data?.[0]?.timestamp ?? longQuery.data?.[0]?.timestamp);
  const endLabel = formatDateLabel(
    shortQuery.data?.[shortQuery.data.length - 1]?.timestamp ??
      longQuery.data?.[longQuery.data.length - 1]?.timestamp,
  );

  if (hasError && !hasData) {
    return (
      <DashboardPanel
        title="180-Day Strategy Backtest"
        subtitle="Historical simulation paths for the short and long models over the same 180-day window."
        minHeight={0}
      >
        <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 1.6 })}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Backtest comparison unavailable right now.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.4, color: 'text.secondary' }}>
            The historical simulation window could not be loaded.
          </Typography>
        </Box>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel
      title="180-Day Strategy Backtest"
      subtitle="Historical simulation paths for the short and long models over the same 180-day window."
      action={
        hasData ? (
          <Stack direction="row" spacing={1}>
            <Chip label={`Short ${formatPercent(shortSeries.returnPercent)}`} color={shortSeries.returnPercent >= 0 ? 'success' : 'error'} />
            <Chip label={`Long ${formatPercent(longSeries.returnPercent)}`} color={longSeries.returnPercent >= 0 ? 'success' : 'error'} />
          </Stack>
        ) : null
      }
      minHeight={0}
    >
      {isLoading && !hasData ? (
        <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 1.6 })}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Loading historical simulation window...
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.4, color: 'text.secondary' }}>
            Pulling the short and long model paths into the same comparison frame.
          </Typography>
        </Box>
      ) : (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 1.5 }}>
            <ComparisonMetric
              label="Short ending equity"
              value={formatCurrency(shortSeries.endingEquity)}
              supportingText={`Finished ${formatPercent(shortSeries.returnPercent)} over the window.`}
            />
            <ComparisonMetric
              label="Long ending equity"
              value={formatCurrency(longSeries.endingEquity)}
              supportingText={`Finished ${formatPercent(longSeries.returnPercent)} over the window.`}
            />
            <ComparisonMetric
              label="Current leader"
              value={leader ? `${leader.label} ahead` : 'Dead heat'}
              supportingText={
                leader
                  ? `Finished above ${trailingLabel.toLowerCase()} in the same historical window.`
                  : 'Both strategies finished at the same ending equity.'
              }
            />
            <ComparisonMetric
              label="Ending spread"
              value={formatCurrency(endingGap)}
              supportingText="Difference between the two ending equity values."
            />
          </Stack>

          <Box sx={(theme) => ({ ...insetSurfaceSx(theme), p: 1.35 })}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              spacing={0.9}
            >
              <div>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  Historical simulation comparison
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.45, color: 'text.secondary', maxWidth: { md: '52ch' } }}>
                  Compare both model paths on the same frame so the ending outcome and the roughness of each route stay visible together.
                </Typography>
                <Typography variant="caption" sx={{ mt: 0.55, display: 'block', color: 'text.secondary' }}>
                  Move across the chart to inspect a simulation date.
                </Typography>
              </div>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.85}>
                <Chip
                  label={`Short deepest pullback ${formatPercent(shortSeries.maxDrawdownPercent)}`}
                  variant="outlined"
                  sx={{ borderColor: alpha(theme.palette.primary.main, 0.4) }}
                />
                <Chip
                  label={`Long deepest pullback ${formatPercent(longSeries.maxDrawdownPercent)}`}
                  variant="outlined"
                  sx={{ borderColor: alpha(theme.palette.success.main, 0.42) }}
                />
              </Stack>
            </Stack>

            <ComparisonChart
              series={[shortSeries, longSeries]}
              startLabel={startLabel}
              endLabel={endLabel}
            />

            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Simulation only. Historical model behavior does not imply future performance.
            </Typography>
          </Box>
        </>
      )}
    </DashboardPanel>
  );
};
