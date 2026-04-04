import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  MarketTable,
  MARKET_SELECTION_HANDOFF_DELAY_MS,
} from '../../components/market/MarketTable';

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

  it('acknowledges a clicked row immediately and defers the parent selection handoff', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
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

      expect(row).toHaveAttribute('aria-selected', 'true');
      expect(onSelectSymbol).not.toHaveBeenCalled();
      expect(screen.getByText('Syncing selection')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(MARKET_SELECTION_HANDOFF_DELAY_MS + 10);
      });

      expect(onSelectSymbol).toHaveBeenCalledWith('AAPL');
      expect(screen.getByText('ETF Starter')).toBeInTheDocument();
      expect(screen.getByText('ETF')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports keyboard selection with the same deferred handoff', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
      render(
        <MarketTable
          quotes={quotes}
          selectedSymbol="MSFT"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock' }}
        />,
      );

      const row = screen.getByText('AAPL').closest('tr');
      expect(row).toHaveAttribute('aria-selected', 'false');

      fireEvent.keyDown(row as HTMLTableRowElement, { key: 'Enter' });

      expect(row).toHaveAttribute('aria-selected', 'true');
      expect(onSelectSymbol).not.toHaveBeenCalled();
      expect(screen.getByText('Syncing selection')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(MARKET_SELECTION_HANDOFF_DELAY_MS + 10);
      });

      expect(onSelectSymbol).toHaveBeenCalledWith('AAPL');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps only the latest row handoff when selections change quickly', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
      render(
        <MarketTable
          quotes={quotes}
          selectedSymbol="MSFT"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock' }}
        />,
      );

      fireEvent.click(screen.getByText('AAPL').closest('tr') as HTMLTableRowElement);

      act(() => {
        vi.advanceTimersByTime(50);
      });

      fireEvent.click(screen.getByText('MSFT').closest('tr') as HTMLTableRowElement);

      act(() => {
        vi.advanceTimersByTime(MARKET_SELECTION_HANDOFF_DELAY_MS + 10);
      });

      expect(onSelectSymbol).toHaveBeenCalledTimes(1);
      expect(onSelectSymbol).toHaveBeenCalledWith('MSFT');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores keyboard reselection when the row is already focused', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
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
      expect(screen.getByText('Focused in ticket')).toBeInTheDocument();

      fireEvent.keyDown(row as HTMLTableRowElement, { key: 'Enter' });

      expect(onSelectSymbol).not.toHaveBeenCalled();
      expect(row).toHaveAttribute('aria-selected', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels a pending handoff when the table unmounts', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
      const view = render(
        <MarketTable
          quotes={quotes}
          selectedSymbol="MSFT"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock' }}
        />,
      );

      fireEvent.click(screen.getByText('AAPL').closest('tr') as HTMLTableRowElement);
      view.unmount();

      act(() => {
        vi.advanceTimersByTime(MARKET_SELECTION_HANDOFF_DELAY_MS + 10);
      });

      expect(onSelectSymbol).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
