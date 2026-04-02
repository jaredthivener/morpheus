import { readFileSync } from 'node:fs';

const BASE_URL = process.env.PERF_API_BASE_URL ?? 'http://localhost:3000';

const budgetConfig = JSON.parse(
  readFileSync(new URL('./performance-budgets.json', import.meta.url), 'utf8'),
);
const marketBudget = budgetConfig.server.marketDataQuality;

const percentile = (values, pct) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchQuotes = async () => {
  const query = marketBudget.symbols.join(',');
  const response = await fetch(`${BASE_URL}/api/v1/market-data?symbols=${query}`);

  if (!response.ok) {
    throw new Error(`Market data quality check failed with status ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.data)) {
    throw new Error('Market data quality check received an invalid payload shape.');
  }

  return payload.data;
};

const summarizeQuotes = (quotes) => {
  const expectedSymbols = new Set(marketBudget.symbols);
  const returnedSymbols = new Set(
    quotes
      .filter((quote) => quote && typeof quote.symbol === 'string')
      .map((quote) => quote.symbol),
  );

  const coveredSymbols = marketBudget.symbols.filter((symbol) => returnedSymbols.has(symbol)).length;
  const symbolCoveragePct = (coveredSymbols / expectedSymbols.size) * 100;

  const validQuotes = quotes.filter(
    (quote) =>
      quote &&
      typeof quote.price === 'number' &&
      Number.isFinite(quote.price) &&
      typeof quote.asOf === 'number' &&
      Number.isFinite(quote.asOf) &&
      typeof quote.source === 'string',
  );

  const positivePriceCoveragePct =
    (validQuotes.filter((quote) => quote.price > 0).length / expectedSymbols.size) * 100;
  const syntheticRatePct =
    validQuotes.length === 0
      ? 100
      : (validQuotes.filter((quote) => quote.source === 'synthetic').length / validQuotes.length) * 100;
  const ages = validQuotes.map((quote) => Math.max(0, Date.now() - quote.asOf));
  const freshnessP95Ms = percentile(ages, 95);
  const maxQuoteAgeMs = Math.max(0, ...ages);

  const sourceBreakdown = validQuotes.reduce(
    (counts, quote) => {
      counts[quote.source] = (counts[quote.source] ?? 0) + 1;
      return counts;
    },
    { live: 0, cached: 0, synthetic: 0 },
  );

  return {
    symbolCoveragePct,
    positivePriceCoveragePct,
    freshnessP95Ms,
    maxQuoteAgeMs,
    syntheticRatePct,
    sourceBreakdown,
  };
};

let latestMetrics = null;

for (let attempt = 1; attempt <= marketBudget.warmupAttempts; attempt += 1) {
  const quotes = await fetchQuotes();
  latestMetrics = summarizeQuotes(quotes);

  const passed =
    latestMetrics.symbolCoveragePct >= marketBudget.symbolCoveragePct &&
    latestMetrics.positivePriceCoveragePct >= marketBudget.positivePriceCoveragePct &&
    latestMetrics.freshnessP95Ms <= marketBudget.freshnessP95Ms &&
    latestMetrics.maxQuoteAgeMs <= marketBudget.maxQuoteAgeMs &&
    latestMetrics.syntheticRatePct <= marketBudget.maxSyntheticRatePct;

  if (passed) {
    break;
  }

  if (attempt < marketBudget.warmupAttempts) {
    await delay(marketBudget.warmupDelayMs);
  }
}

if (!latestMetrics) {
  throw new Error('Market data quality check could not collect any metrics.');
}

process.stdout.write('Market feed quality:\n');
process.stdout.write(
  `  symbol coverage: ${latestMetrics.symbolCoveragePct.toFixed(2)}% (limit ${marketBudget.symbolCoveragePct}%)\n`,
);
process.stdout.write(
  `  positive price coverage: ${latestMetrics.positivePriceCoveragePct.toFixed(2)}% (limit ${marketBudget.positivePriceCoveragePct}%)\n`,
);
process.stdout.write(
  `  freshness p95: ${latestMetrics.freshnessP95Ms.toFixed(2)} ms (limit ${marketBudget.freshnessP95Ms} ms)\n`,
);
process.stdout.write(
  `  max quote age: ${latestMetrics.maxQuoteAgeMs.toFixed(2)} ms (limit ${marketBudget.maxQuoteAgeMs} ms)\n`,
);
process.stdout.write(
  `  synthetic fallback rate: ${latestMetrics.syntheticRatePct.toFixed(2)}% (limit ${marketBudget.maxSyntheticRatePct}%)\n`,
);
process.stdout.write(
  `  source mix: live=${latestMetrics.sourceBreakdown.live}, cached=${latestMetrics.sourceBreakdown.cached}, synthetic=${latestMetrics.sourceBreakdown.synthetic}\n`,
);

if (
  latestMetrics.symbolCoveragePct < marketBudget.symbolCoveragePct ||
  latestMetrics.positivePriceCoveragePct < marketBudget.positivePriceCoveragePct ||
  latestMetrics.freshnessP95Ms > marketBudget.freshnessP95Ms ||
  latestMetrics.maxQuoteAgeMs > marketBudget.maxQuoteAgeMs ||
  latestMetrics.syntheticRatePct > marketBudget.maxSyntheticRatePct
) {
  throw new Error('Market feed quality budget failed.');
}