import type { Horizon } from '../types/market.js';

export interface BacktestPoint {
  timestamp: number;
  equity: number;
}

const seededNoise = (index: number, seed: number): number => {
  const x = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const simulateBacktest = (
  horizon: Horizon,
  days = 180,
  initialEquity = 100_000,
): BacktestPoint[] => {
  const dailyDrift = horizon === 'short' ? 0.0009 : 0.00055;
  const dailyVolatility = horizon === 'short' ? 0.014 : 0.008;
  const seed = horizon === 'short' ? 31 : 73;

  let equity = initialEquity;
  const now = Date.now();
  const start = now - (days - 1) * 24 * 60 * 60 * 1000;

  const points: BacktestPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const shock = (seededNoise(i, seed) - 0.5) * 2;
    const dailyReturn = dailyDrift + shock * dailyVolatility;
    equity = Math.max(1000, equity * (1 + dailyReturn));

    points.push({
      timestamp: start + i * 24 * 60 * 60 * 1000,
      equity: Number(equity.toFixed(2)),
    });
  }

  return points;
};
