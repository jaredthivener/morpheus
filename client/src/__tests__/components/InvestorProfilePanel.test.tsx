import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvestorProfilePanel } from '../../components/onboarding/InvestorProfilePanel';
import { INVESTOR_PROFILES } from '../../utils/investorProfile';

const expectProfileContained = (element: HTMLElement) => {
  expect(getComputedStyle(element).contain).toBe('layout paint');
};

describe('InvestorProfilePanel', () => {
  it('renders the available starting lenses and lets the user switch profiles', () => {
    const onSelectProfile = vi.fn();

    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <InvestorProfilePanel
          profiles={INVESTOR_PROFILES}
          selectedProfileId="etf-starter"
          onSelectProfile={onSelectProfile}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Choose Your Starting Lens')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to etf starter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to balanced builder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to growth explorer/i })).toBeInTheDocument();
    expect(screen.getByText('Active lens')).toBeInTheDocument();
    expect(screen.queryByText('QQQ ETF')).not.toBeInTheDocument();

    expectProfileContained(screen.getByTestId('investor-profile-shell-etf-starter'));
    expect(screen.getByTestId('investor-profile-shell-etf-starter')).toHaveAttribute(
      'data-selection-visual-state',
      'active',
    );
    expectProfileContained(screen.getByTestId('investor-profile-shell-balanced-builder'));
    expectProfileContained(screen.getByTestId('investor-profile-shell-growth-explorer'));

    const balancedBuilderButton = screen.getByRole('button', { name: /switch to balanced builder/i });

    fireEvent.click(balancedBuilderButton);

    expect(onSelectProfile).toHaveBeenCalledWith('balanced-builder');
    expect(balancedBuilderButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('investor-profile-shell-balanced-builder')).toHaveAttribute(
      'data-selection-visual-state',
      'active',
    );
    expect(screen.queryByText('QQQ ETF')).not.toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <InvestorProfilePanel
          profiles={INVESTOR_PROFILES}
          selectedProfileId="balanced-builder"
          onSelectProfile={onSelectProfile}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('QQQ ETF')).toBeInTheDocument();
  });
});