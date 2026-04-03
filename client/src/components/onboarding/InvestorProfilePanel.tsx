import { Box, ButtonBase, Chip, Grid, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { memo } from 'react';
import { DashboardPanel, insetSurfaceSx } from '../common/DashboardPanel';
import type { InvestorProfile, InvestorProfileId } from '../../utils/investorProfile';

interface InvestorProfilePanelProps {
  profiles: InvestorProfile[];
  selectedProfileId: InvestorProfileId;
  onSelectProfile: (profileId: InvestorProfileId) => void;
}

export const InvestorProfilePanel = memo(({
  profiles,
  selectedProfileId,
  onSelectProfile,
}: InvestorProfilePanelProps) => {
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

  return (
    <DashboardPanel
      title="Choose Your Starting Lens"
      subtitle="This changes what the dashboard emphasizes first. It is a learning preference, not a recommendation."
      action={<Chip label="ETF-first available" variant="outlined" color="primary" size="small" />}
      minHeight={0}
    >
      <Stack spacing={1.25}>
        <Grid container spacing={1.1}>
          {profiles.map((profile) => {
            const isSelected = profile.id === selectedProfileId;

            return (
              <Grid key={profile.id} size={{ xs: 12, sm: 4 }}>
                <ButtonBase
                  onClick={() => onSelectProfile(profile.id)}
                  aria-label={`Switch to ${profile.label}`}
                  sx={{ display: 'block', width: '100%', borderRadius: '18px', textAlign: 'left' }}
                >
                  <Box
                    sx={(theme) => ({
                      ...insetSurfaceSx(theme),
                      minHeight: 122,
                      px: 1.25,
                      py: 1.15,
                      borderRadius: '18px',
                      border: `1px solid ${
                        isSelected
                          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.78 : 0.42)
                          : alpha(theme.palette.divider, 0.92)
                      }`,
                      ...(isSelected
                        ? {
                            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1)} 0%, ${alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.26 : 0.68)} 100%)`,
                          }
                        : null),
                      transition: 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.58 : 0.28),
                      },
                    })}
                  >
                    <Stack justifyContent="space-between" spacing={1} sx={{ height: '100%' }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                            {profile.label}
                          </Typography>
                          <Box
                            sx={(theme) => ({
                              mt: 0.3,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.35),
                              boxShadow: isSelected
                                ? `0 0 0 6px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)}`
                                : 'none',
                            })}
                          />
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            lineHeight: 1.45,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {profile.summary}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                        <Typography
                          variant="caption"
                          sx={{
                            color: isSelected ? 'primary.main' : 'text.secondary',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {isSelected ? 'Current lens' : 'Switch lens'}
                        </Typography>
                        {isSelected ? <Chip label="Active" size="small" color="primary" /> : null}
                      </Stack>
                    </Stack>
                  </Box>
                </ButtonBase>
              </Grid>
            );
          })}
        </Grid>

        {selectedProfile ? (
          <Box
            sx={(theme) => ({
              ...insetSurfaceSx(theme),
              p: 1.35,
              borderRadius: '20px',
              border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.42 : 0.24)}`,
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.28)} 100%)`
                  : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, rgba(255,255,255,0.84) 100%)`,
            })}
          >
            <Stack spacing={1.1}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.1}>
                <div>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {selectedProfile.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.45, mt: 0.2 }}>
                    {selectedProfile.description}
                  </Typography>
                </div>
                <Chip label="Active lens" size="small" color="primary" variant="outlined" />
              </Stack>

              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {selectedProfile.watchlist.slice(0, 6).map((entry) => (
                  <Chip
                    key={`${selectedProfile.id}-${entry.symbol}`}
                    label={`${entry.symbol} ${entry.assetType === 'etf' ? 'ETF' : 'Stock'}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </DashboardPanel>
  );
});