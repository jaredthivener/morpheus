import type { FastifyInstance } from 'fastify';
import type { MarketDataService } from '../services/marketDataService.js';

export const registerMarketRoutes = async (
  fastify: FastifyInstance,
  marketDataService: MarketDataService,
): Promise<void> => {
  fastify.get(
    '/market-data',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            symbols: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { symbols?: string };
      const symbols = query.symbols
        ?.split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);

      const data = marketDataService.getQuotes(symbols);
      return { data };
    },
  );
};
