import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { Holding } from '../types/portfolio';

export interface PortfolioState {
  cash: number;
  holdings: Record<string, Holding>;
  prices: Record<string, number>;
  buy: (symbol: string, shares: number, price: number) => boolean;
  sell: (symbol: string, shares: number, price: number) => boolean;
  setPrice: (symbol: string, price: number) => void;
  totalValue: () => number;
  unrealizedPnL: () => number;
}

export const createPortfolioStore = () =>
  createStore<PortfolioState>((set, get) => ({
    cash: 100_000,
    holdings: {},
    prices: {},
    buy: (symbol, shares, price) => {
      if (shares <= 0 || price <= 0) {
        return false;
      }
      const cost = shares * price;
      const { cash, holdings } = get();
      if (cost > cash) {
        return false;
      }

      const current = holdings[symbol];
      const nextShares = (current?.shares ?? 0) + shares;
      const nextAvgCost =
        ((current?.shares ?? 0) * (current?.avgCost ?? 0) + cost) / Math.max(nextShares, 1);

      set({
        cash: cash - cost,
        holdings: {
          ...holdings,
          [symbol]: {
            symbol,
            shares: nextShares,
            avgCost: Number(nextAvgCost.toFixed(2)),
          },
        },
      });
      return true;
    },
    sell: (symbol, shares, price) => {
      if (shares <= 0 || price <= 0) {
        return false;
      }

      const { holdings, cash } = get();
      const current = holdings[symbol];
      if (!current || shares > current.shares) {
        return false;
      }

      const remaining = current.shares - shares;
      const nextHoldings = { ...holdings };
      if (remaining === 0) {
        delete nextHoldings[symbol];
      } else {
        nextHoldings[symbol] = {
          ...current,
          shares: remaining,
        };
      }

      set({
        cash: cash + shares * price,
        holdings: nextHoldings,
      });
      return true;
    },
    setPrice: (symbol, price) => {
      set((state) => ({
        prices: {
          ...state.prices,
          [symbol]: price,
        },
      }));
    },
    totalValue: () => {
      const { cash, holdings, prices } = get();
      const holdingsValue = Object.values(holdings).reduce((sum, holding) => {
        const livePrice = prices[holding.symbol] ?? holding.avgCost;
        return sum + livePrice * holding.shares;
      }, 0);
      return Number((cash + holdingsValue).toFixed(2));
    },
    unrealizedPnL: () => {
      const { holdings, prices } = get();
      const pnl = Object.values(holdings).reduce((sum, holding) => {
        const livePrice = prices[holding.symbol] ?? holding.avgCost;
        return sum + (livePrice - holding.avgCost) * holding.shares;
      }, 0);
      return Number(pnl.toFixed(2));
    },
  }));

const portfolioStore = createPortfolioStore();

export const usePortfolioStore = <T>(selector: (state: PortfolioState) => T): T =>
  useStore(portfolioStore, selector);
