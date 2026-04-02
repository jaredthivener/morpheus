import { describe, expect, it } from 'vitest';
import type { Quote } from '../../types/market';
import { appendPriceHistory, applyTicksToQuotes, formatQuoteFreshness } from '../../utils/marketSession';

describe('marketSession utilities', () => {
  it('appends symbol history, skips duplicate prices, and caps the session window', () => {
    const history = {
      AAPL: [100, 101, 102],
    };

    const nextHistory = appendPriceHistory(
      history,
      [
        { symbol: 'AAPL', price: 102 },
        { symbol: 'AAPL', price: 103 },
        { symbol: 'MSFT', price: 250 },
      ],
      3,
    );

    expect(nextHistory.AAPL).toEqual([101, 102, 103]);
    expect(nextHistory.MSFT).toEqual([250]);
    expect(history.AAPL).toEqual([100, 101, 102]);
  });

  it('applies websocket ticks to matching quotes without mutating untouched rows', () => {
    const quotes: Quote[] = [
      {
        symbol: 'AAPL',
        price: 100,
        changePercent: 1.2,
        volume: 1000,
        source: 'live',
        asOf: 1000,
      },
      {
        symbol: 'MSFT',
        price: 200,
        changePercent: -0.5,
        volume: 2000,
        source: 'cached',
        asOf: 1000,
      },
    ];

    const nextQuotes = applyTicksToQuotes(quotes, [
      {
        symbol: 'MSFT',
        price: 200,
        changePercent: -0.72,
        volume: 2400,
        source: 'live',
        asOf: 1500,
        timestamp: 1500,
      } as never,
    ]);

    expect(nextQuotes[0]).toBe(quotes[0]);
    expect(nextQuotes[1]).toMatchObject({
      price: 200,
      changePercent: -0.72,
      volume: 2400,
      source: 'live',
      asOf: 1500,
    });
  });

  it('formats quote freshness for recent and stale samples', () => {
    expect(formatQuoteFreshness(10_000, 10_000)).toBe('Just now');
    expect(formatQuoteFreshness(55_000, 100_000)).toBe('45s ago');
    expect(formatQuoteFreshness(10_000, 130_000)).toBe('2m ago');
  });
});