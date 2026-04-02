import { alpha, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ColorMode } from './utils/colorMode';

interface MatrixTokens {
  primary: string;
  secondary: string;
  success: string;
  info: string;
  warning: string;
  error: string;
  backgroundDefault: string;
  backgroundPaper: string;
  textPrimary: string;
  textSecondary: string;
}

export const MATRIX_THEME_TOKENS: Record<ColorMode, MatrixTokens> = {
  dark: {
    primary: '#7dff9b',
    secondary: '#d7ffe1',
    success: '#4cff88',
    info: '#46d98a',
    warning: '#e7c66a',
    error: '#ff6b6b',
    backgroundDefault: '#020603',
    backgroundPaper: '#07110a',
    textPrimary: '#d7ffe1',
    textSecondary: '#7eb793',
  },
  light: {
    primary: '#0f7a3c',
    secondary: '#173325',
    success: '#1d9d58',
    info: '#2c8f56',
    warning: '#97710a',
    error: '#bb3636',
    backgroundDefault: '#eef7ee',
    backgroundPaper: '#f8fff8',
    textPrimary: '#0a1d12',
    textSecondary: '#45624e',
  },
};

export const buildAppTheme = (mode: ColorMode) => {
  const tokens = MATRIX_THEME_TOKENS[mode];
  const isDarkMode = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: tokens.primary },
      secondary: { main: tokens.secondary },
      success: { main: tokens.success },
      info: { main: tokens.info },
      warning: { main: tokens.warning },
      error: { main: tokens.error },
      background: {
        default: tokens.backgroundDefault,
        paper: tokens.backgroundPaper,
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
      },
      divider: alpha(tokens.primary, isDarkMode ? 0.18 : 0.12),
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
      h3: {
        fontWeight: 800,
        letterSpacing: '-0.06em',
        textTransform: 'uppercase',
      },
      h4: {
        fontWeight: 800,
        letterSpacing: '-0.05em',
      },
      h5: {
        fontWeight: 800,
        letterSpacing: '-0.04em',
      },
      h6: {
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      },
      subtitle2: {
        fontWeight: 700,
        letterSpacing: '0.03em',
      },
      button: {
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      },
      overline: {
        fontWeight: 700,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
      },
      caption: {
        letterSpacing: '0.06em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--matrix-phosphor': tokens.primary,
            '--matrix-phosphor-soft': tokens.secondary,
            '--matrix-grid': alpha(tokens.primary, isDarkMode ? 0.075 : 0.04),
            '--matrix-glow': alpha(tokens.primary, isDarkMode ? 0.18 : 0.08),
          },
          body: {
            backgroundColor: tokens.backgroundDefault,
            color: tokens.textPrimary,
          },
          '::selection': {
            backgroundColor: alpha(tokens.primary, isDarkMode ? 0.26 : 0.18),
            color: tokens.textPrimary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          grouped: {
            borderRadius: 999,
            textTransform: 'uppercase',
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.08em',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor:
              mode === 'dark'
                ? alpha(tokens.secondary, 0.03)
                : alpha(tokens.backgroundPaper, 0.92),
            '& fieldset': {
              borderColor: alpha(tokens.primary, mode === 'dark' ? 0.24 : 0.16),
            },
            '&:hover fieldset': {
              borderColor: alpha(tokens.primary, mode === 'dark' ? 0.38 : 0.24),
            },
            '&.Mui-focused fieldset': {
              borderColor: alpha(tokens.primary, 0.64),
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
    },
  });
};

const themeCache: Partial<Record<ColorMode, Theme>> = {};

export const getAppTheme = (mode: ColorMode): Theme => {
  const cachedTheme = themeCache[mode];
  if (cachedTheme) {
    return cachedTheme;
  }

  const theme = buildAppTheme(mode);
  themeCache[mode] = theme;
  return theme;
};