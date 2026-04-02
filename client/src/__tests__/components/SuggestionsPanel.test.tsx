import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchGuidanceMock } = vi.hoisted(() => ({
  fetchGuidanceMock: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  fetchGuidance: fetchGuidanceMock,
}));

import { SuggestionsPanel } from '../../components/suggestions/SuggestionsPanel';

describe('SuggestionsPanel', () => {
  beforeEach(() => {
    fetchGuidanceMock.mockReset();
  });

  it('renders grouped beginner-friendly stock and ETF guidance', async () => {
    fetchGuidanceMock.mockResolvedValue({
      beginnerMessage:
        'Start with diversified ETFs or durable businesses, then treat every AI idea as a research prompt.',
      stockIdeas: [
        {
          symbol: 'MSFT',
          assetType: 'stock',
          stance: 'research',
          trend: 'up',
          riskLevel: 'medium',
          confidence: 82,
          summary: 'Quality and stability signals are aligned for deeper research.',
          rationale: 'Durable business quality and steadier downside inputs make this a stronger starting point.',
        },
      ],
      stockCautions: [
        {
          symbol: 'TSLA',
          assetType: 'stock',
          stance: 'avoid',
          trend: 'down',
          riskLevel: 'high',
          confidence: 77,
          summary: 'Trend and downside inputs are weaker here right now.',
          rationale: 'Higher downside volatility and weaker trend persistence increase caution for average users.',
        },
      ],
      etfLeaders: [
        {
          symbol: 'SPY',
          assetType: 'etf',
          stance: 'research',
          trend: 'up',
          riskLevel: 'low',
          confidence: 79,
          summary: 'Multi-period trend inputs remain constructive.',
          rationale: 'Broad-market trend readings are improving across short and medium windows.',
        },
      ],
      etfLaggards: [
        {
          symbol: 'ARKK',
          assetType: 'etf',
          stance: 'avoid',
          trend: 'down',
          riskLevel: 'high',
          confidence: 74,
          summary: 'Trend signals are weakening across multiple windows.',
          rationale: 'Higher-volatility sector exposure and softer trend readings make this a caution signal.',
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <QueryClientProvider client={queryClient}>
          <SuggestionsPanel />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText('AI Guidance for Everyday Investors')).toBeInTheDocument();
    expect(await screen.findByText('Good Stocks to Research')).toBeInTheDocument();
    expect(screen.getByText('Stocks to Avoid for Now')).toBeInTheDocument();
    expect(screen.getByText('ETFs Trending Up')).toBeInTheDocument();
    expect(screen.getByText('ETFs Trending Down')).toBeInTheDocument();
    expect(screen.getByText('Educational only')).toBeInTheDocument();
    expect(await screen.findByText('MSFT')).toBeInTheDocument();
    expect(await screen.findByText('SPY')).toBeInTheDocument();
  });
});