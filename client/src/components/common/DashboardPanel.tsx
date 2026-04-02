import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  minHeight?: number;
  contentSx?: SxProps<Theme>;
  children: ReactNode;
}

export const panelSurfaceSx = (theme: Theme) => ({
  position: 'relative',
  isolation: 'isolate',
  overflow: 'hidden',
  borderRadius: '28px',
  border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.34 : 0.18)}`,
  background:
    theme.palette.mode === 'dark'
      ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.78)} 0%, ${alpha(theme.palette.common.black, 0.74)} 100%)`
      : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
  boxShadow:
    theme.palette.mode === 'dark'
      ? `0 24px 56px ${alpha(theme.palette.common.black, 0.38)}, inset 0 1px 0 ${alpha(theme.palette.primary.main, 0.12)}`
      : `0 18px 40px ${alpha(theme.palette.primary.main, 0.1)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.92)}`,
  backdropFilter: 'blur(12px) saturate(140%)',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: `repeating-linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.03)} 0 1px, transparent 1px 6px), linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.06)} 0%, transparent 42%)`,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-28%',
    right: '-8%',
    width: 220,
    height: 220,
    pointerEvents: 'none',
    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)} 0%, transparent 72%)`,
    filter: 'blur(22px)',
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
});

export const insetSurfaceSx = (theme: Theme) => ({
  position: 'relative',
  borderRadius: '22px',
  border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.12)}`,
  background:
    theme.palette.mode === 'dark'
      ? `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.56)} 100%)`
      : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.88)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
  boxShadow:
    theme.palette.mode === 'dark'
      ? `inset 0 1px 0 ${alpha(theme.palette.primary.main, 0.12)}`
      : `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.92)}`,
});

export const DashboardPanel = ({
  title,
  subtitle,
  action,
  minHeight,
  contentSx,
  children,
}: DashboardPanelProps) => {
  return (
    <Paper
      sx={(theme) => ({
        ...panelSurfaceSx(theme),
        p: { xs: 2, md: 2.25 },
        ...(minHeight !== undefined ? { minHeight } : {}),
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <div>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.35, maxWidth: { sm: '46ch' }, lineHeight: 1.45 }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </div>
        {action}
      </Stack>
      <Box sx={contentSx}>{children}</Box>
    </Paper>
  );
};