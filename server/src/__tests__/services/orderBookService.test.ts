import { describe, expect, it } from 'vitest';
import {
  buildSyntheticOrderBook,
  evaluateLimitOrder,
  type LimitOrderInput,
} from '../../services/orderBookService';

describe('orderBookService', () => {
  it('builds deterministic 5-level bid/ask depth around mid price', () => {
    const book = buildSyntheticOrderBook('AAPL', 100, 5);

    expect(book.symbol).toBe('AAPL');
    expect(book.bids.length).toBe(5);
    expect(book.asks.length).toBe(5);
    expect(book.bids[0]?.price).toBeLessThan(100);
    expect(book.asks[0]?.price).toBeGreaterThan(100);
    expect(book.spread).toBeGreaterThan(0);
  });

  it('fills buy limit when limit >= best ask', () => {
    const book = buildSyntheticOrderBook('AAPL', 100, 5);
    const bestAsk = book.asks[0]?.price ?? 100;
    const order: LimitOrderInput = {
      symbol: 'AAPL',
      side: 'buy',
      shares: 10,
      limitPrice: bestAsk,
    };

    const result = evaluateLimitOrder(order, book);
    expect(result.filled).toBe(true);
    expect(result.executedPrice).toBeGreaterThan(0);
  });

  it('does not fill sell limit when limit > best bid', () => {
    const book = buildSyntheticOrderBook('AAPL', 100, 5);
    const bestBid = book.bids[0]?.price ?? 0;
    const order: LimitOrderInput = {
      symbol: 'AAPL',
      side: 'sell',
      shares: 10,
      limitPrice: bestBid + 1,
    };

    const result = evaluateLimitOrder(order, book);
    expect(result.filled).toBe(false);
    expect(result.executedPrice).toBeNull();
  });
});
