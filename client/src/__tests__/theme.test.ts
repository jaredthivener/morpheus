import { describe, expect, it } from 'vitest';
import { buildAppTheme } from '../theme';

describe('buildAppTheme', () => {
  it('creates a dark phosphor palette with monospace typography', () => {
    const theme = buildAppTheme('dark');

    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBe('#7dff9b');
    expect(theme.palette.background.default).toBe('#020603');
    expect(theme.typography.fontFamily).toContain('SF Mono');
    expect(theme.components?.MuiCssBaseline).toBeDefined();
  });

  it('keeps light mode in the same matrix color family', () => {
    const theme = buildAppTheme('light');

    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBe('#0f7a3c');
    expect(theme.palette.background.default).toBe('#eef7ee');
    expect(theme.palette.text.primary).toBe('#0a1d12');
  });
});