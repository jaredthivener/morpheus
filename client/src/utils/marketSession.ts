import type { Quote, Tick } from '../types/market';

export type SessionHistory = Record<string, number[]>;

interface PriceSample {
  symbol: string;
  price: number;
}

const MAX_SESSION_POINTS = 18;

export const appendPriceHistory = (
  history: SessionHistory,
  samples: PriceSample[],
  maxPoints = MAX_SESSION_POINTS,
): SessionHistory => {
  if (samples.length === 0) {
    return history;
  }

  let nextHistory: SessionHistory | null = null;

  for (const sample of samples) {
    if (!Number.isFinite(sample.price) || sample.price <= 0) {
      continue;
    }

    const currentValues: number[] = (nextHistory ?? history)[sample.symbol] ?? [];
    const roundedPrice = Number(sample.price.toFixed(2));

    if (currentValues[currentValues.length - 1] === roundedPrice) {
      continue;
    }

    nextHistory = {
      ...(nextHistory ?? history),
      [sample.symbol]: [...currentValues, roundedPrice].slice(-maxPoints),
    };
  }

  return nextHistory ?? history;
};

export const applyTicksToQuotes = (quotes: Quote[], ticks: Tick[]): Quote[] => {
  if (quotes.length === 0 || ticks.length === 0) {
    return quotes;
  }

  const latestTicks = new Map<string, Tick>();
  for (const tick of ticks) {
    latestTicks.set(tick.symbol, tick);
  }

  let changed = false;

  const nextQuotes = quotes.map((quote) => {
    const nextTick = latestTicks.get(quote.symbol);
    if (!nextTick) {
      return quote;
    }

    const roundedPrice = Number(nextTick.price.toFixed(2));
    const roundedChangePercent = Number(nextTick.changePercent.toFixed(2));
    const nextAsOf = nextTick.asOf;

    if (
      quote.price === roundedPrice &&
      quote.changePercent === roundedChangePercent &&
      quote.volume === nextTick.volume &&
      quote.source === nextTick.source &&
      quote.asOf === nextAsOf
    ) {
      return quote;
    }

    changed = true;
    return {
      ...quote,
      price: roundedPrice,
      changePercent: roundedChangePercent,
      volume: nextTick.volume,
      source: nextTick.source,
      asOf: nextAsOf,
    };
  });

  return changed ? nextQuotes : quotes;
};

export const formatQuoteFreshness = (asOf: number, now = Date.now()): string => {
  if (!Number.isFinite(asOf) || asOf <= 0) {
    return 'Awaiting quote';
  }

  const deltaMs = Math.max(0, now - asOf);
  if (deltaMs < 5_000) {
    return 'Just now';
  }

  if (deltaMs < 60_000) {
    return `${Math.max(1, Math.floor(deltaMs / 1_000))}s ago`;
  }

  if (deltaMs < 3_600_000) {
    return `${Math.max(1, Math.floor(deltaMs / 60_000))}m ago`;
  }

  return `${Math.max(1, Math.floor(deltaMs / 3_600_000))}h ago`;
};