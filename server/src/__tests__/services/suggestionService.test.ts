import { describe, expect, it } from 'vitest';
import {
  buildGuidanceBundle,
  ETF_UNIVERSE,
  rankSuggestions,
  SYMBOL_UNIVERSE,
} from '../../services/suggestionService';

describe('suggestionService', () => {
  it('scores across at least 50 symbols', () => {
    expect(SYMBOL_UNIVERSE.length).toBeGreaterThanOrEqual(50);
  });

  it('returns normalized scores between 0 and 100 for short-term', () => {
    const results = rankSuggestions('short');
    expect(results.length).toBeGreaterThan(0);
    for (const row of results) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(100);
    }
  });

  it('returns sorted results descending by score', () => {
    const results = rankSuggestions('long');
    for (let i = 1; i < results.length; i += 1) {
      const previous = results[i - 1];
      const current = results[i];
      if (!previous || !current) {
        continue;
      }
      expect(previous.score).toBeGreaterThanOrEqual(current.score);
    }
  });

  it('builds beginner-friendly stock and ETF guidance groups with risk framing', () => {
    const bundle = buildGuidanceBundle(4);

    expect(bundle.beginnerMessage.length).toBeGreaterThan(0);
    expect(bundle.stockIdeas).toHaveLength(4);
    expect(bundle.stockCautions).toHaveLength(4);
    expect(bundle.etfLeaders).toHaveLength(4);
    expect(bundle.etfLaggards).toHaveLength(4);

    expect(bundle.stockIdeas.every((item) => item.assetType === 'stock' && item.stance === 'research')).toBe(true);
    expect(bundle.stockCautions.every((item) => item.assetType === 'stock' && item.stance === 'avoid')).toBe(true);
    expect(bundle.etfLeaders.every((item) => item.assetType === 'etf' && item.trend === 'up')).toBe(true);
    expect(bundle.etfLaggards.every((item) => item.assetType === 'etf' && item.trend === 'down')).toBe(true);

    for (const section of [
      ...bundle.stockIdeas,
      ...bundle.stockCautions,
      ...bundle.etfLeaders,
      ...bundle.etfLaggards,
    ]) {
      expect(section.confidence).toBeGreaterThanOrEqual(0);
      expect(section.confidence).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(section.riskLevel);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.rationale.length).toBeGreaterThan(0);
    }

    expect(ETF_UNIVERSE.length).toBeGreaterThanOrEqual(10);
  });
});
