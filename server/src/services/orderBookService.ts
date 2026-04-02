export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface SyntheticOrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  timestamp: number;
}

export interface LimitOrderInput {
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  limitPrice: number;
}

export interface LimitOrderResult {
  filled: boolean;
  executedPrice: number | null;
  reason: string;
}

const symbolSeed = (symbol: string): number => {
  let seed = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    seed += symbol.charCodeAt(i) * (i + 3);
  }
  return seed;
};

export const buildSyntheticOrderBook = (
  symbol: string,
  midPrice: number,
  levels = 5,
): SyntheticOrderBook => {
  const seed = symbolSeed(symbol);
  const tick = Math.max(0.01, Number((midPrice * 0.0005).toFixed(2)));

  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  for (let i = 1; i <= levels; i += 1) {
    const bidPrice = Number((midPrice - i * tick).toFixed(2));
    const askPrice = Number((midPrice + i * tick).toFixed(2));
    const sizeBase = 120 + ((seed + i * 19) % 180);

    bids.push({ price: bidPrice, size: sizeBase + i * 9 });
    asks.push({ price: askPrice, size: sizeBase + i * 7 });
  }

  const bestBid = bids[0]?.price ?? midPrice;
  const bestAsk = asks[0]?.price ?? midPrice;

  return {
    symbol,
    bids,
    asks,
    spread: Number((bestAsk - bestBid).toFixed(2)),
    timestamp: Date.now(),
  };
};

export const evaluateLimitOrder = (
  order: LimitOrderInput,
  book: SyntheticOrderBook,
): LimitOrderResult => {
  const bestBid = book.bids[0]?.price;
  const bestAsk = book.asks[0]?.price;

  if (order.side === 'buy') {
    if (bestAsk !== undefined && order.limitPrice >= bestAsk) {
      return {
        filled: true,
        executedPrice: bestAsk,
        reason: 'Buy limit crossed the best ask.',
      };
    }

    return {
      filled: false,
      executedPrice: null,
      reason: 'Buy limit is below the current ask.',
    };
  }

  if (bestBid !== undefined && order.limitPrice <= bestBid) {
    return {
      filled: true,
      executedPrice: bestBid,
      reason: 'Sell limit crossed the best bid.',
    };
  }

  return {
    filled: false,
    executedPrice: null,
    reason: 'Sell limit is above the current bid.',
  };
};
