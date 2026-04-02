import type {
  BacktestPoint,
  GuidanceBundle,
  LimitOrderResponse,
  OrderBook,
  Quote,
  Suggestion,
} from '../types/market';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const fetchMarketData = async (symbols: string[]): Promise<Quote[]> => {
  const symbolQuery = symbols.join(',');
  const result = await getJson<{ data: Quote[] }>(`/api/v1/market-data?symbols=${symbolQuery}`);
  return result.data;
};

export const fetchSuggestions = async (horizon: 'short' | 'long'): Promise<Suggestion[]> => {
  const result = await getJson<{ data: Suggestion[] }>(`/api/v1/suggestions?horizon=${horizon}&limit=8`);
  return result.data;
};

export const fetchGuidance = async (limit = 4): Promise<GuidanceBundle> => {
  const result = await getJson<{ data: GuidanceBundle }>(`/api/v1/guidance?limit=${limit}`);
  return result.data;
};

export const fetchBacktest = async (horizon: 'short' | 'long', days = 180): Promise<BacktestPoint[]> => {
  const result = await getJson<{ data: BacktestPoint[] }>(
    `/api/v1/backtest?horizon=${horizon}&days=${days}`,
  );
  return result.data;
};

export const fetchOrderBook = async (symbol: string): Promise<OrderBook> => {
  const result = await getJson<{ data: OrderBook }>(`/api/v1/order-book?symbol=${symbol}`);
  return result.data;
};

export const submitLimitOrder = async (params: {
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  limitPrice: number;
}): Promise<LimitOrderResponse> => {
  const result = await postJson<{ data: LimitOrderResponse }>('/api/v1/orders/limit', params);
  return result.data;
};


