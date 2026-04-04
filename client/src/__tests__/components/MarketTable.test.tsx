import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import {
  MarketTable,
  MARKET_SELECTION_HANDOFF_DELAY_MS,
} from '../../components/market/MarketTable';

const expectPaintContained = (element: HTMLElement) => {
  expect(getComputedStyle(element).contain).toBe('paint');
};

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
    {
      symbol: 'NVDA',
      price: 912.4,
      changePercent: 2.6,
      volume: 2_420_000,
      source: 'live' as const,
      asOf: Date.now() - 20_000,
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
          priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
          watchlistLabel="ETF Starter"
          watchlistDescription="A broader mix of ETFs and steady stocks for new users."
          symbolTypes={{ AAPL: 'stock', MSFT: 'etf', NVDA: 'stock' }}
        />,
      );

      const row = screen.getByText('AAPL').closest('tr');
      const symbolShell = screen.getByTestId('market-symbol-shell-AAPL');
      const sessionPanel = screen.getByTestId('market-session-panel-AAPL');
      const feedPanel = screen.getByTestId('market-feed-panel-AAPL');

      expect(row).not.toBeNull();
      expectPaintContained(symbolShell);
      expect(symbolShell).toHaveAttribute('data-selection-visual-state', 'idle');
      expectPaintContained(sessionPanel);
      expectPaintContained(feedPanel);

      fireEvent.click(row as HTMLTableRowElement);

      expect(row).toHaveAttribute('aria-selected', 'true');
      expect(onSelectSymbol).not.toHaveBeenCalled();
      expect(symbolShell).toHaveAttribute('data-selection-visual-state', 'pending');
      expect(screen.getByText('Syncing selection')).toBeInTheDocument();
      expect(screen.queryByText('Focused in ticket')).not.toBeInTheDocument();

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

  it('keeps selection feedback isolated to the symbol shell during watchlist handoff', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
      render(
        <MarketTable
          quotes={quotes}
          selectedSymbol="MSFT"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
          watchlistLabel="ETF Starter"
          watchlistDescription="A broader mix of ETFs and steady stocks for new users."
          symbolTypes={{ AAPL: 'stock', MSFT: 'etf', NVDA: 'stock' }}
        />,
      );

      const row = screen.getByText('AAPL').closest('tr');
      const symbolShell = screen.getByTestId('market-symbol-shell-AAPL');
      const sessionPanel = screen.getByTestId('market-session-panel-AAPL');
      const feedPanel = screen.getByTestId('market-feed-panel-AAPL');

      fireEvent.click(row as HTMLTableRowElement);

      expect(row).toHaveAttribute('aria-selected', 'true');
      expect(symbolShell).toHaveAttribute('data-selection-visual-state', 'pending');
      expectPaintContained(symbolShell);
      expectPaintContained(sessionPanel);
      expectPaintContained(feedPanel);
      expect(screen.getByText('Syncing selection')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('only upgrades the watchlist highlight after the parent selection catches up', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
      const view = render(
        <MarketTable
          quotes={quotes}
          selectedSymbol="MSFT"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
          watchlistLabel="ETF Starter"
          watchlistDescription="A broader mix of ETFs and steady stocks for new users."
          symbolTypes={{ AAPL: 'stock', MSFT: 'etf', NVDA: 'stock' }}
        />,
      );

      const symbolShell = screen.getByTestId('market-symbol-shell-AAPL');
      const syncedShell = screen.getByTestId('market-symbol-shell-MSFT');

      fireEvent.click(screen.getByText('AAPL').closest('tr') as HTMLTableRowElement);

      expect(symbolShell).toHaveAttribute('data-selection-visual-state', 'pending');
      expect(syncedShell).toHaveAttribute('data-selection-visual-state', 'synced');
      expect(screen.getByText('Syncing selection')).toBeInTheDocument();
      expect(screen.getByText('Focused for comparison')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(MARKET_SELECTION_HANDOFF_DELAY_MS + 10);
      });

      expect(onSelectSymbol).toHaveBeenCalledWith('AAPL');

      view.rerender(
        <MarketTable
          quotes={quotes}
          selectedSymbol="AAPL"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
          watchlistLabel="ETF Starter"
          watchlistDescription="A broader mix of ETFs and steady stocks for new users."
          symbolTypes={{ AAPL: 'stock', MSFT: 'etf', NVDA: 'stock' }}
        />,
      );

      expect(screen.getByTestId('market-symbol-shell-AAPL')).toHaveAttribute('data-selection-visual-state', 'synced');
      expect(screen.getByTestId('market-symbol-shell-MSFT')).toHaveAttribute('data-selection-visual-state', 'idle');
      expect(screen.getByText('Focused in ticket')).toBeInTheDocument();
      expect(screen.queryByText('Focused for comparison')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears a stale pending row when the parent drives a different symbol', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();

    try {
      const view = render(
        <MarketTable
          quotes={quotes}
          selectedSymbol="MSFT"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
        />,
      );

      fireEvent.click(screen.getByText('AAPL').closest('tr') as HTMLTableRowElement);

      expect(screen.getByTestId('market-symbol-shell-AAPL')).toHaveAttribute('data-selection-visual-state', 'pending');

      view.rerender(
        <MarketTable
          quotes={quotes}
          selectedSymbol="NVDA"
          onSelectSymbol={onSelectSymbol}
          priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
        />,
      );

      expect(screen.getByTestId('market-symbol-shell-AAPL')).toHaveAttribute('data-selection-visual-state', 'idle');
      expect(screen.getByTestId('market-symbol-shell-NVDA')).toHaveAttribute('data-selection-visual-state', 'synced');

      act(() => {
        vi.advanceTimersByTime(MARKET_SELECTION_HANDOFF_DELAY_MS + 10);
      });

      expect(onSelectSymbol).not.toHaveBeenCalledWith('AAPL');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears a stale pending row before paint when the parent overrides selection', () => {
    vi.useFakeTimers();

    const onSelectSymbol = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    document.body.append(container);

    try {
      act(() => {
        flushSync(() => {
          root.render(
            <MarketTable
              quotes={quotes}
              selectedSymbol="MSFT"
              onSelectSymbol={onSelectSymbol}
              priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
              watchlistLabel="Balanced Builder"
              watchlistDescription="A mix of broad exposure and durable single names."
              symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
            />,
          );
        });
      });

      act(() => {
        fireEvent.click(within(container).getByText('AAPL').closest('tr') as HTMLTableRowElement);
      });

      expect(within(container).getByTestId('market-symbol-shell-AAPL')).toHaveAttribute('data-selection-visual-state', 'pending');

      act(() => {
        flushSync(() => {
          root.render(
            <MarketTable
              quotes={quotes}
              selectedSymbol="NVDA"
              onSelectSymbol={onSelectSymbol}
              priceHistory={{ AAPL: [200, 200.8, 201.15], MSFT: [420, 419.4, 418.5], NVDA: [905.5, 908.2, 912.4] }}
              watchlistLabel="Balanced Builder"
              watchlistDescription="A mix of broad exposure and durable single names."
              symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
            />,
          );
        });
      });

      expect(within(container).getByTestId('market-symbol-shell-AAPL')).toHaveAttribute('data-selection-visual-state', 'idle');
      expect(within(container).getByTestId('market-symbol-shell-NVDA')).toHaveAttribute('data-selection-visual-state', 'synced');
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
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
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5], NVDA: [905.5, 912.4] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
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
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5], NVDA: [905.5, 912.4] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
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
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5], NVDA: [905.5, 912.4] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
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
          priceHistory={{ AAPL: [200.7, 201.15], MSFT: [419.2, 418.5], NVDA: [905.5, 912.4] }}
          watchlistLabel="Balanced Builder"
          watchlistDescription="A mix of broad exposure and durable single names."
          symbolTypes={{ AAPL: 'stock', MSFT: 'stock', NVDA: 'stock' }}
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
