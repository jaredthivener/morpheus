import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../components/layout/AppShell';
import { buildAppTheme } from '../../theme';

describe('AppShell', () => {
  it('renders the theme toggle and calls back when clicked', () => {
    const handleToggle = vi.fn();

    render(
      <ThemeProvider theme={buildAppTheme('dark')}>
        <AppShell colorMode="dark" onToggleColorMode={handleToggle}>
          <div>dashboard body</div>
        </AppShell>
      </ThemeProvider>,
    );

    const toggleButton = screen.getByRole('button', { name: /switch to light mode/i });
    fireEvent.click(toggleButton);

    expect(handleToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'MORPHEUS' })).toBeInTheDocument();
    expect(screen.getByTestId('matrix-pill-duo')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-pill-red')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-pill-blue')).toBeInTheDocument();
    expect(screen.getByText('Paper Trading')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-rain-background')).toBeInTheDocument();
  });
});