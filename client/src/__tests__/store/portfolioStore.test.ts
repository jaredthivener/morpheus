import { beforeEach, describe, expect, it } from 'vitest';
import { createPortfolioStore } from '../../store/portfolioStore';

describe('portfolioStore', () => {
  beforeEach(() => {
    // Fresh store per test to avoid cross-test state leaks.
  });

  it('buys shares and reduces cash', () => {
    const store = createPortfolioStore();
    store.getState().buy('AAPL', 10, 100);

    const state = store.getState();
    expect(state.cash).toBe(99_000);
    expect(state.holdings.AAPL?.shares).toBe(10);
    expect(state.holdings.AAPL?.avgCost).toBe(100);
  });

  it('sells shares and increases cash', () => {
    const store = createPortfolioStore();
    store.getState().buy('AAPL', 10, 100);
    store.getState().sell('AAPL', 4, 110);

    const state = store.getState();
    expect(state.cash).toBe(99_440);
    expect(state.holdings.AAPL?.shares).toBe(6);
  });

  it('computes total portfolio value using latest prices', () => {
    const store = createPortfolioStore();
    store.getState().buy('AAPL', 10, 100);
    store.getState().setPrice('AAPL', 120);

    const state = store.getState();
    expect(state.totalValue()).toBe(100_200);
    expect(state.unrealizedPnL()).toBe(200);
  });
});
