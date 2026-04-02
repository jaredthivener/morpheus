import { readFileSync } from 'node:fs';

const BASE_URL = process.env.PERF_API_BASE_URL ?? 'http://localhost:3000';
const budgetConfig = JSON.parse(
  readFileSync(new URL('./performance-budgets.json', import.meta.url), 'utf8'),
);

const percentile = (values, pct) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
};

const runScenario = async ({ path, durationMs, concurrency }) => {
  const latencies = [];
  const startedAt = Date.now();
  let requestCount = 0;
  const url = `${BASE_URL}${path}`;

  const worker = async () => {
    while (Date.now() - startedAt < durationMs) {
      const t0 = performance.now();
      const response = await fetch(url);
      const t1 = performance.now();

      if (!response.ok) {
        throw new Error(`Benchmark request failed (${response.status}) for ${url}`);
      }

      latencies.push(t1 - t0);
      requestCount += 1;
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    samples: requestCount,
  };
};

for (const scenario of budgetConfig.server.apiScenarios) {
  const result = await runScenario(scenario);
  const p95 = result.p95;
  const p99 = result.p99;
  process.stdout.write(`API scenario: ${scenario.name}\n`);
  process.stdout.write(`  samples: ${result.samples}\n`);
  process.stdout.write(`  p95: ${p95} ms (limit ${scenario.p95Ms})\n`);
  process.stdout.write(`  p99: ${p99} ms (limit ${scenario.p99Ms})\n`);

  if (p95 > scenario.p95Ms || p99 > scenario.p99Ms) {
    throw new Error(`API latency budget failed for ${scenario.name}`);
  }
}
