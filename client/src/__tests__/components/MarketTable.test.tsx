import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarketTable } from '../../components/market/MarketTable';

describe('MarketTable', () => {
  const quotes = [
    {
      symbol: 'AAPL',
      price: 201.15,
      changePercent: 1.25,
      volume: 1_500_000,
      source: 'live' as const,
      asOf: Date.now(),
    },
    {
      symbol: 'MSFT',
      price: 418.5,
      changePercent: -0.8,
      volume: 820_000,
      source: 'cached' as const,
      asOf: Date.now() - 65_000,
    },
  ];

  it('selects a quote row when clicked', () => {
    const onSelectSymbol = vi.fn();

    render(
      <MarketTable
        quotes={quotes}
        selectedSymbol="MSFT"
        onSelectSymbol={onSelectSymbol}
        priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5] }}
        watchlistLabel="ETF Starter"
        watchlistDescription="A broader mix of ETFs and steady stocks for new users."
        symbolTypes={{ AAPL: 'stock', MSFT: 'etf' }}
      />,
    );

    const row = screen.getByText('AAPL').closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(row as HTMLTableRowElement);

    expect(onSelectSymbol).toHaveBeenCalledWith('AAPL');
    expect(screen.getByText('ETF Starter')).toBeInTheDocument();
    expect(screen.getByText('ETF')).toBeInTheDocument();
  });

  it('supports keyboard selection and marks the focused row', () => {
    const onSelectSymbol = vi.fn();

    render(
      <MarketTable
        quotes={quotes}
        selectedSymbol="AAPL"
        onSelectSymbol={onSelectSymbol}
        priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5] }}
        watchlistLabel="Balanced Builder"
        watchlistDescription="A mix of broad exposure and durable single names."
        symbolTypes={{ AAPL: 'stock', MSFT: 'stock' }}
      />,
    );

    const row = screen.getByText('AAPL').closest('tr');
    expect(row).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(row as HTMLTableRowElement, { key: 'Enter' });

    expect(onSelectSymbol).toHaveBeenCalledWith('AAPL');
    expect(screen.getByText('Focused in ticket')).toBeInTheDocument();
  });
});