import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface SessionSparklineProps {
  values: number[];
  tone: 'positive' | 'negative' | 'neutral';
}

export const SessionSparkline = ({ values, tone }: SessionSparklineProps) => {
  const theme = useTheme();
  const singleValue = values[0] ?? 0;
  const normalizedValues: number[] =
    values.length === 0 ? [0, 0] : values.length === 1 ? [singleValue, singleValue] : values;

  const minValue = Math.min(...normalizedValues);
  const maxValue = Math.max(...normalizedValues);
  const range = Math.max(1, maxValue - minValue);
  const colors = {
    positive: {
      stroke: theme.palette.primary.main,
      fill: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
      background: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
    },
    negative: {
      stroke: theme.palette.error.main,
      fill: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
      background: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.1 : 0.07),
    },
    neutral: {
      stroke: theme.palette.secondary.main,
      fill: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1),
      background: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.08 : 0.06),
    },
  }[tone];

  const points = normalizedValues.map((value, index) => {
    const x = (index / Math.max(normalizedValues.length - 1, 1)) * 100;
    const y = 25 - ((value - minValue) / range) * 18;
    return { x, y };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = [`M ${points[0]?.x ?? 0},28`, ...points.map((point) => `L ${point.x},${point.y}`), `L ${points[points.length - 1]?.x ?? 100},28 Z`].join(' ');

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 104,
        height: 34,
        borderRadius: 999,
        backgroundColor: colors.background,
        px: 0.5,
      }}
    >
      <svg viewBox="0 0 100 30" width="100%" height="30" aria-hidden="true" focusable="false">
        <path
          d="M 0,22 H 100"
          stroke={alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1)}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <path d={areaPath} fill={colors.fill} />
        <polyline
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polylinePoints}
        />
      </svg>
    </Box>
  );
};