import { Box, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';

type PillTone = 'red' | 'blue';

interface MatrixPillProps {
  tone: PillTone;
}

const PILL_TONES: Record<PillTone, { dark: string; light: string; glow: string; border: string }> = {
  red: {
    dark: '#ff4d6d',
    light: '#ff8a9f',
    glow: '#ff385f',
    border: '#ffd0d8',
  },
  blue: {
    dark: '#2b9dff',
    light: '#7bd3ff',
    glow: '#1888ff',
    border: '#d2efff',
  },
};

const MatrixPill = ({ tone }: MatrixPillProps) => {
  const rotation = tone === 'red' ? '-8deg' : '7deg';
  const testId = tone === 'red' ? 'matrix-pill-red' : 'matrix-pill-blue';

  return (
    <Box
      aria-hidden="true"
      data-testid={testId}
      sx={(theme) => {
        const colors = PILL_TONES[tone];
        const isDarkMode = theme.palette.mode === 'dark';

        return {
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: { xs: 56, sm: 62 },
          height: { xs: 24, sm: 27 },
          borderRadius: '999px',
          border: `1px solid ${alpha(colors.border, isDarkMode ? 0.48 : 0.78)}`,
          background: `linear-gradient(135deg, ${alpha(colors.light, isDarkMode ? 0.9 : 0.98)} 0%, ${alpha(colors.dark, isDarkMode ? 0.88 : 0.94)} 58%, ${alpha(colors.glow, isDarkMode ? 0.96 : 0.9)} 100%)`,
          boxShadow: `0 0 0 1px ${alpha(colors.border, isDarkMode ? 0.14 : 0.24)} inset, 0 12px 28px ${alpha(colors.glow, isDarkMode ? 0.3 : 0.18)}, 0 8px 18px ${alpha(theme.palette.common.black, isDarkMode ? 0.32 : 0.12)}`,
          transform: `rotate(${rotation})`,
          overflow: 'hidden',
          isolation: 'isolate',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '10% 14% auto',
            height: '34%',
            borderRadius: '999px',
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isDarkMode ? 0.58 : 0.82)} 0%, transparent 100%)`,
            zIndex: 0,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            background: `radial-gradient(circle at 24% 28%, ${alpha(theme.palette.common.white, isDarkMode ? 0.16 : 0.2)} 0%, transparent 32%), linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.common.black, isDarkMode ? 0.18 : 0.08)} 100%)`,
            zIndex: 0,
          },
        };
      }}
    />
  );
};

export const MatrixPillDuo = () => {
  return (
    <Stack
      aria-hidden="true"
      data-testid="matrix-pill-duo"
      direction="row"
      alignItems="center"
      sx={{
        ml: { sm: 0.35 },
        '& > :nth-of-type(2)': {
          ml: { xs: -0.65, sm: -0.8 },
        },
      }}
    >
      <MatrixPill tone="red" />
      <MatrixPill tone="blue" />
    </Stack>
  );
};