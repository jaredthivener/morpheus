import { beforeEach, describe, expect, it, vi } from 'vitest';

const { quoteMock, yahooFinanceCtorMock } = vi.hoisted(() => {
  const quoteMock = vi.fn();
  const yahooFinanceCtorMock = vi.fn(function YahooFinanceMock() {
    return {
      quote: quoteMock,
    };
  });

  return {
    quoteMock,
    yahooFinanceCtorMock,
  };
});

vi.mock('yahoo-finance2', () => ({
  default: yahooFinanceCtorMock,
}));

import { MarketDataService } from '../../services/marketDataService.js';

describe('marketDataService', () => {
  beforeEach(() => {
    quoteMock.mockReset();
    yahooFinanceCtorMock.mockClear();
  });

  it('refreshes quotes from Yahoo and marks them as live when upstream returns a valid price', async () => {
    quoteMock.mockResolvedValue([
      {
        symbol: 'AAPL',
        regularMarketPrice: 199.31,
        regularMarketChangePercent: 0.42,
        regularMarketVolume: 10_000,
      },
    ]);

    const service = new MarketDataService();
    const data = await service.refreshQuotes(['AAPL']);
    const quote = data[0];

    expect(quote).toBeDefined();
    expect(yahooFinanceCtorMock).toHaveBeenCalledTimes(1);
    expect(quote?.symbol).toBe('AAPL');
    expect(quote?.price).toBe(199.31);
    expect(quote?.source).toBe('live');
    expect(typeof quote?.asOf).toBe('number');
    expect(quoteMock).toHaveBeenCalledTimes(1);
    expect(quoteMock).toHaveBeenCalledWith(['AAPL']);
  });

  it('uses the observation time when Yahoo returns a stale market timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T14:30:00.000Z'));

    try {
      quoteMock.mockResolvedValue([
        {
          symbol: 'AAPL',
          regularMarketPrice: 199.31,
          regularMarketChangePercent: 0.42,
          regularMarketVolume: 10_000,
          regularMarketTime: new Date('2026-04-01T16:00:00.000Z'),
        },
      ]);

      const service = new MarketDataService();
      const [quote] = await service.refreshQuotes(['AAPL']);

      expect(quote?.source).toBe('live');
      expect(quote?.asOf).toBe(Date.now());
    } finally {
      vi.useRealTimers();
    }
  });

  it('serves the cached live quote synchronously while a background refresh is pending', async () => {
    quoteMock.mockResolvedValue([
      {
        symbol: 'AAPL',
        regularMarketPrice: 199.31,
        regularMarketChangePercent: 0.42,
        regularMarketVolume: 10_000,
      },
    ]);

    const service = new MarketDataService();
    await service.refreshQuotes(['AAPL']);

    const data = service.getQuotes(['AAPL']);

    expect(data[0]?.source).toBe('live');
    expect(data[0]?.price).toBe(199.31);
    expect(quoteMock).toHaveBeenCalledTimes(1);
  });

  it('uses synthetic first then cached values when upstream quote feed is unavailable', async () => {
    quoteMock.mockRejectedValue(new Error('upstream unavailable'));
    const service = new MarketDataService();

    const first = await service.refreshQuotes(['AAPL']);
    const second = service.getQuotes(['AAPL']);

    expect(first[0]?.source).toBe('synthetic');
    expect(second[0]?.source).toBe('cached');
    expect(second[0]?.price).toBe(first[0]?.price);
    expect(second[0]?.asOf).toBe(first[0]?.asOf);
  });

  it('refreshes multiple symbols in a single upstream quote request', async () => {
    quoteMock.mockResolvedValue([
      {
        symbol: 'AAPL',
        regularMarketPrice: 199.31,
        regularMarketChangePercent: 0.42,
        regularMarketVolume: 10_000,
      },
      {
        symbol: 'MSFT',
        regularMarketPrice: 412.05,
        regularMarketChangePercent: 0.18,
        regularMarketVolume: 8_500,
      },
    ]);

    const service = new MarketDataService();
    const data = await service.refreshQuotes(['AAPL', 'MSFT']);

    expect(quoteMock).toHaveBeenCalledTimes(1);
    expect(quoteMock).toHaveBeenCalledWith(['AAPL', 'MSFT']);
    expect(data.map((quote) => quote.symbol)).toEqual(['AAPL', 'MSFT']);
    expect(data.every((quote) => quote.source === 'live')).toBe(true);
  });

  it('covers ETF-first starter symbols in the default quote set', () => {
    const service = new MarketDataService();
    const data = service.getQuotes();

    expect(data.some((quote) => quote.symbol === 'VOO')).toBe(true);
    expect(data.some((quote) => quote.symbol === 'SCHD')).toBe(true);
    expect(data.some((quote) => quote.symbol === 'AAPL')).toBe(true);
    expect(data.some((quote) => quote.symbol === 'NVDA')).toBe(true);
  });

  it('builds websocket ticks from the current quote state so live metadata is preserved', async () => {
    quoteMock.mockResolvedValue([
      {
        symbol: 'AAPL',
        regularMarketPrice: 199.31,
        regularMarketChangePercent: 0.42,
        regularMarketVolume: 10_000,
      },
    ]);

    const service = new MarketDataService();
    const [quote] = await service.refreshQuotes(['AAPL']);
    const [tick] = service.nextTicks(['AAPL']);

    expect(tick).toMatchObject({
      symbol: 'AAPL',
      price: 199.31,
      changePercent: 0.42,
      volume: 10_000,
      source: 'live',
    });
    expect(tick?.asOf).toBe(quote?.asOf);
    expect(typeof tick?.timestamp).toBe('number');
  });

  it('backs off after a rate-limit style upstream failure instead of retrying immediately', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T14:30:00.000Z'));

    try {
      quoteMock.mockRejectedValue(new Error('429 Too Many Requests'));
      const service = new MarketDataService();

      await service.refreshQuotes(['AAPL']);
      await service.refreshQuotes(['AAPL']);

      expect(quoteMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60_000);

      await service.refreshQuotes(['AAPL']);

      expect(quoteMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
