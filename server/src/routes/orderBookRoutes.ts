import type { FastifyInstance } from 'fastify';
import type { MarketDataService } from '../services/marketDataService.js';
import {
  buildSyntheticOrderBook,
  evaluateLimitOrder,
  type LimitOrderInput,
} from '../services/orderBookService.js';

export const registerOrderBookRoutes = async (
  fastify: FastifyInstance,
  marketDataService: MarketDataService,
): Promise<void> => {
  fastify.get(
    '/order-book',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            symbol: { type: 'string', minLength: 1 },
          },
          required: ['symbol'],
        },
      },
    },
    async (request) => {
      const query = request.query as { symbol: string };
      const symbol = query.symbol.trim().toUpperCase();
      const quote = marketDataService.getQuotes([symbol]);
      const midPrice = quote[0]?.price ?? 100;

      return {
        data: buildSyntheticOrderBook(symbol, midPrice, 5),
      };
    },
  );

  fastify.post(
    '/orders/limit',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            symbol: { type: 'string', minLength: 1 },
            side: { type: 'string', enum: ['buy', 'sell'] },
            shares: { type: 'number', minimum: 1 },
            limitPrice: { type: 'number', minimum: 0.01 },
          },
          required: ['symbol', 'side', 'shares', 'limitPrice'],
        },
      },
    },
    async (request) => {
      const body = request.body as LimitOrderInput;
      const symbol = body.symbol.trim().toUpperCase();

      const quote = marketDataService.getQuotes([symbol]);
      const midPrice = quote[0]?.price ?? 100;
      const book = buildSyntheticOrderBook(symbol, midPrice, 5);
      const result = evaluateLimitOrder({ ...body, symbol }, book);

      return {
        data: {
          symbol,
          side: body.side,
          shares: body.shares,
          limitPrice: body.limitPrice,
          ...result,
          timestamp: Date.now(),
        },
      };
    },
  );
};
