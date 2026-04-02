import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import { Box, Button, Chip, Container, CssBaseline, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { PropsWithChildren } from 'react';
import type { ColorMode } from '../../utils/colorMode';
import { MatrixRainBackground } from './MatrixRainBackground';
import { MatrixPillDuo } from './MatrixPillDuo';

interface AppShellProps extends PropsWithChildren {
  colorMode: ColorMode;
  onToggleColorMode: () => void;
}

export const AppShell = ({ children, colorMode, onToggleColorMode }: AppShellProps) => {
  return (
    <>
      <CssBaseline />
      <Box
        sx={(theme) => ({
          position: 'relative',
          isolation: 'isolate',
          minHeight: '100vh',
          overflow: 'hidden',
          background:
            theme.palette.mode === 'dark'
              ? `radial-gradient(circle at 18% 0%, ${alpha(theme.palette.primary.main, 0.24)} 0%, transparent 26%), radial-gradient(circle at 82% 0%, ${alpha(theme.palette.success.main, 0.12)} 0%, transparent 22%), linear-gradient(180deg, #010402 0%, #06100a 52%, #030805 100%)`
              : `radial-gradient(circle at 18% 0%, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 26%), radial-gradient(circle at 82% 0%, ${alpha(theme.palette.success.main, 0.08)} 0%, transparent 22%), linear-gradient(180deg, #f7fff7 0%, #eef7ee 52%, #e8f2e8 100%)`,
          py: { xs: 2.5, md: 3.25 },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: `repeating-linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.03 : 0.015)} 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.015 : 0.008)} 0 1px, transparent 1px 84px)`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: '0 0 auto 0',
            zIndex: 0,
            height: 320,
            pointerEvents: 'none',
            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.05 : 0.025)} 0%, transparent 100%)`,
          },
        })}
      >
        <MatrixRainBackground />
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', lg: 'center' }}
              spacing={1.5}
              sx={(theme) => ({
                mb: 0.25,
                p: { xs: 1.6, md: 2 },
                borderRadius: '28px',
                border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.16)}`,
                background:
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                    : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.72)} 0%, ${alpha(theme.palette.primary.main, 0.07)} 100%)`,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 18px 34px ${alpha(theme.palette.common.black, 0.22)}`
                    : `0 12px 28px ${alpha(theme.palette.primary.main, 0.08)}`,
                backdropFilter: 'blur(10px) saturate(140%)',
              })}
            >
              <Stack spacing={0.85}>
                <Typography
                  variant="overline"
                  sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}
                >
                  Simulation construct // live market relay
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.1} useFlexGap flexWrap="wrap">
                  <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.04em' }}>
                    MORPHEUS
                  </Typography>
                  <MatrixPillDuo />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 620, lineHeight: 1.45 }}>
                  Train inside the construct with live markets, ETF trends, AI guidance, and paper trades before you risk real money.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 720 }}>
                  Operator mode active • live quotes synchronized • simulated capital only
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip label="Paper Trading" color="primary" variant="filled" />
                <Chip label="Live Quote Feed" variant="outlined" />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={onToggleColorMode}
                  startIcon={colorMode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
                  aria-label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </Stack>
            </Stack>
            <Box>{children}</Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
};
