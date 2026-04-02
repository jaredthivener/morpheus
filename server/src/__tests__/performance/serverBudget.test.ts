import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVER_PERFORMANCE_BUDGET } from '../../performance/budgets.js';

const budgetFixture = JSON.parse(
  readFileSync(join(process.cwd(), '../scripts/perf/performance-budgets.json'), 'utf8'),
) as { server: typeof SERVER_PERFORMANCE_BUDGET };

describe('server performance budget contract', () => {
  it('keeps latency thresholds locked', () => {
    expect(SERVER_PERFORMANCE_BUDGET).toEqual(budgetFixture.server);

    const healthBudget = SERVER_PERFORMANCE_BUDGET.apiScenarios.find(
      (scenario) => scenario.name === 'health',
    );
    const marketDataBudget = SERVER_PERFORMANCE_BUDGET.apiScenarios.find(
      (scenario) => scenario.name === 'market-data',
    );
    const backtestBudget = SERVER_PERFORMANCE_BUDGET.apiScenarios.find(
      (scenario) => scenario.name === 'backtest',
    );

    expect(healthBudget?.p95Ms).toBeLessThanOrEqual(40);
    expect(marketDataBudget?.p95Ms).toBeLessThanOrEqual(75);
    expect(backtestBudget?.p99Ms).toBeLessThanOrEqual(250);
    expect(SERVER_PERFORMANCE_BUDGET.websocket.p95Ms).toBeLessThanOrEqual(20);
    expect(SERVER_PERFORMANCE_BUDGET.websocket.p99Ms).toBeLessThanOrEqual(35);
    expect(SERVER_PERFORMANCE_BUDGET.websocket.jitterP95Ms).toBeLessThanOrEqual(20);
    expect(SERVER_PERFORMANCE_BUDGET.websocket.reconnectFirstTickMs).toBeLessThanOrEqual(250);
    expect(SERVER_PERFORMANCE_BUDGET.marketDataQuality.freshnessP95Ms).toBeLessThanOrEqual(15000);
    expect(SERVER_PERFORMANCE_BUDGET.marketDataQuality.maxSyntheticRatePct).toBeLessThanOrEqual(20);
  });
});
