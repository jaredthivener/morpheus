import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchBacktestMock } = vi.hoisted(() => ({
  fetchBacktestMock: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  fetchBacktest: fetchBacktestMock,
}));

import { BacktestPanel } from '../../components/portfolio/BacktestPanel';
import { buildAppTheme } from '../../theme';

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <ThemeProvider theme={buildAppTheme('dark')}>
      <QueryClientProvider client={queryClient}>
        <BacktestPanel />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('BacktestPanel', () => {
  beforeEach(() => {
    fetchBacktestMock.mockReset();
  });

  it('renders a full-width comparison view and reveals hovered time-series data', async () => {
    const jan1 = Date.UTC(2025, 0, 1, 12);
    const jan2 = Date.UTC(2025, 0, 2, 12);
    const jan3 = Date.UTC(2025, 0, 3, 12);
    const jan4 = Date.UTC(2025, 0, 4, 12);

    fetchBacktestMock.mockImplementation(async (horizon: 'short' | 'long') => {
      if (horizon === 'short') {
        return [
          { timestamp: jan1, equity: 100_000 },
          { timestamp: jan2, equity: 102_000 },
          { timestamp: jan3, equity: 98_000 },
          { timestamp: jan4, equity: 119_284 },
        ];
      }

      return [
        { timestamp: jan1, equity: 100_000 },
        { timestamp: jan2, equity: 101_000 },
        { timestamp: jan3, equity: 96_000 },
        { timestamp: jan4, equity: 107_815 },
      ];
    });

    renderPanel();

    expect(await screen.findByText('Historical simulation comparison')).toBeInTheDocument();
    expect(screen.getByText('Short model ahead')).toBeInTheDocument();
    expect(screen.getByText('$11,469')).toBeInTheDocument();
    expect(screen.getByText(/Short deepest pullback/)).toBeInTheDocument();
    expect(screen.getByText(/Long deepest pullback/)).toBeInTheDocument();
    expect(screen.getByText('Move across the chart to inspect a simulation date.')).toBeInTheDocument();

    const chart = screen.getByRole('img', { name: 'Historical simulation comparison chart' });
    expect(chart).toHaveAttribute('preserveAspectRatio', 'none');

    const chartSurface = screen.getByTestId('backtest-comparison-chart-surface');
    Object.defineProperty(chartSurface, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 320,
        bottom: 240,
        width: 320,
        height: 240,
        toJSON: () => undefined,
      }),
    });

    fireEvent.mouseMove(chartSurface, { clientX: 170, clientY: 110 });

    const hoverTooltip = screen.getByTestId('backtest-hover-tooltip');
    expect(within(hoverTooltip).getByText('Jan 3')).toBeInTheDocument();
    expect(within(hoverTooltip).getByText('Short model')).toBeInTheDocument();
    expect(within(hoverTooltip).getByText('$98,000')).toBeInTheDocument();
    expect(within(hoverTooltip).getByText('Long model')).toBeInTheDocument();
    expect(within(hoverTooltip).getByText('$96,000')).toBeInTheDocument();
    expect(within(hoverTooltip).getByText('$2,000')).toBeInTheDocument();
    expect(screen.getByTestId('backtest-hover-highlight')).toBeInTheDocument();

    fireEvent.mouseLeave(chartSurface);

    expect(screen.queryByTestId('backtest-hover-tooltip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('backtest-hover-highlight')).not.toBeInTheDocument();
  });

  it('renders a clear unavailable state when the historical simulation cannot be loaded', async () => {
    fetchBacktestMock.mockRejectedValue(new Error('Request failed: 503'));

    renderPanel();

    expect(await screen.findByText('Backtest comparison unavailable right now.')).toBeInTheDocument();
    expect(screen.getByText('The historical simulation window could not be loaded.')).toBeInTheDocument();
  });
});