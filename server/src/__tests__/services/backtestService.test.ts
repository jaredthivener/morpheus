import { describe, expect, it } from 'vitest';
import { simulateBacktest } from '../../services/backtestService';

describe('backtestService', () => {
  it('returns ascending dates with positive equity values', () => {
    const points = simulateBacktest('short', 30, 100_000);

    expect(points.length).toBe(30);
    expect(points[0]?.equity).toBeGreaterThan(0);

    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1];
      const current = points[i];
      if (!previous || !current) {
        continue;
      }

      expect(current.timestamp).toBeGreaterThan(previous.timestamp);
      expect(current.equity).toBeGreaterThan(0);
    }
  });

  it('produces different equity curve profiles for short vs long horizon', () => {
    const shortCurve = simulateBacktest('short', 60, 100_000);
    const longCurve = simulateBacktest('long', 60, 100_000);

    const shortLast = shortCurve.at(-1);
    const longLast = longCurve.at(-1);
    expect(shortLast).toBeDefined();
    expect(longLast).toBeDefined();
    expect(shortLast?.equity).not.toBe(longLast?.equity);
  });
});
