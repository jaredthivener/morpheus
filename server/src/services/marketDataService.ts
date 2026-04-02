import YahooFinance from 'yahoo-finance2';
import type { Quote, Tick } from '../types/market.js';

const DEFAULT_SYMBOLS = [
  'VOO',
  'VTI',
  'SCHD',
  'XLV',
  'XLP',
  'XLU',
  'QQQ',
  'XLK',
  'SOXX',
  'SMH',
  'IWM',
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'JPM',
  'XOM',
  'WMT',
  'JNJ',
  'COST',
  'AMD',
];
const LIVE_QUOTE_TTL_MS = 15_000;
const UPSTREAM_ERROR_COOLDOWN_MS = 10_000;
const UPSTREAM_RATE_LIMIT_COOLDOWN_MS = 60_000;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

interface YahooQuoteLike {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketTime?: Date;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isYahooQuoteLike = (value: unknown): value is YahooQuoteLike => {
  if (!isObjectRecord(value)) {
    return false;
  }

  const price = value.regularMarketPrice;
  const changePercent = value.regularMarketChangePercent;
  const volume = value.regularMarketVolume;
  const symbol = value.symbol;
  const regularMarketTime = value.regularMarketTime;

  const symbolOk = symbol === undefined || typeof symbol === 'string';
  const priceOk = price === undefined || typeof price === 'number';
  const changeOk = changePercent === undefined || typeof changePercent === 'number';
  const volumeOk = volume === undefined || typeof volume === 'number';
  const regularMarketTimeOk = regularMarketTime === undefined || regularMarketTime instanceof Date;

  return symbolOk && priceOk && changeOk && volumeOk && regularMarketTimeOk;
};

const seededBasePrice = (symbol: string): number => {
  let sum = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    sum += symbol.charCodeAt(i) * (i + 1);
  }
  return 40 + (sum % 300);
};

const quoteToTick = (quote: Quote, timestamp = Date.now()): Tick => ({
  symbol: quote.symbol,
  price: Number(quote.price.toFixed(2)),
  changePercent: Number(quote.changePercent.toFixed(2)),
  volume: quote.volume,
  source: quote.source,
  asOf: quote.asOf,
  timestamp,
});

export class MarketDataService {
  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey'],
  });

  private readonly quotes = new Map<string, Quote>();

  private refreshBatchInFlight: Promise<void> | null = null;

  private upstreamCooldownUntil = 0;

  private quoteFromCache(symbol: string): Quote | null {
    return this.quotes.get(symbol) ?? null;
  }

  private upsertQuote(quote: Quote): Quote {
    this.quotes.set(quote.symbol, quote);
    return quote;
  }

  private resolveQuotes(symbols: string[]): Quote[] {
    return symbols.map((symbol) => this.quoteFromCache(symbol) ?? this.syntheticQuote(symbol));
  }

  private isUpstreamCoolingDown(now = Date.now()): boolean {
    return now < this.upstreamCooldownUntil;
  }

  private setUpstreamCooldown(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const normalizedMessage = message.toLowerCase();
    const cooldownMs =
      normalizedMessage.includes('429') ||
      normalizedMessage.includes('too many requests') ||
      normalizedMessage.includes('rate limit')
        ? UPSTREAM_RATE_LIMIT_COOLDOWN_MS
        : UPSTREAM_ERROR_COOLDOWN_MS;

    this.upstreamCooldownUntil = Date.now() + cooldownMs;
  }

  private clearUpstreamCooldown(): void {
    this.upstreamCooldownUntil = 0;
  }

  private syntheticQuote(symbol: string): Quote {
    return this.upsertQuote({
      symbol,
      price: Number(clamp(seededBasePrice(symbol), 1, 5000).toFixed(2)),
      changePercent: 0,
      volume: 0,
      source: 'synthetic',
      asOf: Date.now(),
    });
  }

  private cachedQuote(symbol: string): Quote | null {
    const existing = this.quoteFromCache(symbol);
    if (!existing) {
      return null;
    }

    return this.upsertQuote({
      ...existing,
      source: 'cached',
    });
  }

  private async refreshBatch(symbols: string[]): Promise<void> {
    if (symbols.length === 0 || this.isUpstreamCoolingDown()) {
      return;
    }

    try {
      const rawQuotes: unknown = await this.yahooFinance.quote(symbols);
      const quoteList = Array.isArray(rawQuotes) ? rawQuotes : [];

      for (const rawQuote of quoteList) {
        if (!isYahooQuoteLike(rawQuote) || typeof rawQuote.symbol !== 'string') {
          continue;
        }

        const price = rawQuote.regularMarketPrice;
        if (typeof price !== 'number' || !Number.isFinite(price)) {
          continue;
        }

        this.upsertQuote({
          symbol: rawQuote.symbol,
          price,
          changePercent: rawQuote.regularMarketChangePercent ?? 0,
          volume: rawQuote.regularMarketVolume ?? 0,
          source: 'live',
          asOf:
            rawQuote.regularMarketTime instanceof Date
              ? rawQuote.regularMarketTime.getTime()
              : Date.now(),
        });
      }

      this.clearUpstreamCooldown();
    } catch (error) {
      this.setUpstreamCooldown(error);
    }
  }

  private shouldRefresh(symbol: string): boolean {
    const quote = this.quoteFromCache(symbol);
    if (!quote) {
      return true;
    }

    if (quote.source !== 'live') {
      return true;
    }

    return Date.now() - quote.asOf >= LIVE_QUOTE_TTL_MS;
  }

  async refreshQuotes(symbols?: string[]): Promise<Quote[]> {
    const requested = symbols && symbols.length > 0 ? symbols : DEFAULT_SYMBOLS;
    const uniqueRequested = [...new Set(requested)];

    if (this.isUpstreamCoolingDown()) {
      return this.resolveQuotes(uniqueRequested);
    }

    if (this.refreshBatchInFlight) {
      await this.refreshBatchInFlight;

      const missingSymbols = uniqueRequested.filter((symbol) => !this.quoteFromCache(symbol));
      if (missingSymbols.length === 0 || this.isUpstreamCoolingDown()) {
        return this.resolveQuotes(uniqueRequested);
      }
    }

    const refreshTask = this.refreshBatch(uniqueRequested);
    this.refreshBatchInFlight = refreshTask;

    try {
      await refreshTask;
    } finally {
      if (this.refreshBatchInFlight === refreshTask) {
        this.refreshBatchInFlight = null;
      }
    }

    return this.resolveQuotes(uniqueRequested);
  }

  getQuotes(symbols?: string[]): Quote[] {
    const requested = symbols && symbols.length > 0 ? symbols : DEFAULT_SYMBOLS;

    const staleSymbols: string[] = [];
    const results = requested.map((symbol) => {
      if (this.shouldRefresh(symbol)) {
        staleSymbols.push(symbol);
      }

      const current = this.quoteFromCache(symbol);
      if (!current) {
        return this.syntheticQuote(symbol);
      }

      if (current.source === 'live' && Date.now() - current.asOf < LIVE_QUOTE_TTL_MS) {
        return current;
      }

      return this.cachedQuote(symbol) ?? this.syntheticQuote(symbol);
    });

    if (staleSymbols.length > 0) {
      void this.refreshQuotes(staleSymbols);
    }

    return results;
  }

  nextTicks(symbols: string[]): Tick[] {
    const timestamp = Date.now();

    return symbols.map((symbol) => {
      const currentQuote = this.quoteFromCache(symbol) ?? this.syntheticQuote(symbol);

      return quoteToTick(currentQuote, timestamp);
    });
  }
}
