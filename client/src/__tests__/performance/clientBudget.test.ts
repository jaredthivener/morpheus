/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERFORMANCE_BUDGET } from '../../performance/vitals.js';

const budgetFixture = JSON.parse(
  readFileSync(join(process.cwd(), '../scripts/perf/performance-budgets.json'), 'utf8'),
) as { client: typeof PERFORMANCE_BUDGET };

describe('client performance budget contract', () => {
  it('defines strict web-vitals and bundle budgets', () => {
    expect(PERFORMANCE_BUDGET).toEqual(budgetFixture.client);
    expect(PERFORMANCE_BUDGET.lcpMs).toBeLessThanOrEqual(1800);
    expect(PERFORMANCE_BUDGET.fcpMs).toBeLessThanOrEqual(1200);
    expect(PERFORMANCE_BUDGET.cls).toBeLessThanOrEqual(0.03);
    expect(PERFORMANCE_BUDGET.speedIndexMs).toBeLessThanOrEqual(1000);
    expect(PERFORMANCE_BUDGET.totalBlockingTimeMs).toBeLessThanOrEqual(150);
    expect(PERFORMANCE_BUDGET.maxPotentialFidMs).toBeLessThanOrEqual(100);
    expect(PERFORMANCE_BUDGET.serverResponseTimeMs).toBeLessThanOrEqual(200);
    expect(PERFORMANCE_BUDGET.inpTargetMs).toBeLessThanOrEqual(200);
    expect(PERFORMANCE_BUDGET.mainBundleKbGzip).toBeLessThanOrEqual(170);
    expect(PERFORMANCE_BUDGET.initialPayloadKbGzip).toBeLessThanOrEqual(400);
  });
});
