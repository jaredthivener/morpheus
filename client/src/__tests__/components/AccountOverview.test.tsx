import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { AccountOverview } from '../../components/layout/AccountOverview';

describe('AccountOverview', () => {
  it('renders a compact account snapshot and the focused symbol context', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <AccountOverview
          cash={82_500}
          totalValue={105_420}
          unrealizedPnL={5420}
          positionsCount={3}
          trackedSymbols={10}
          selectedQuote={{
            symbol: 'AAPL',
            price: 201.15,
            changePercent: 1.24,
            volume: 1_500_000,
            source: 'live',
            asOf: Date.now(),
          }}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Account value')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Open P/L')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Focused symbol')).toBeInTheDocument();
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    expect(screen.getByText('10 symbols live')).toBeInTheDocument();
  });
});