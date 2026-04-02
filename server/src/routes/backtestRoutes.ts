import type { FastifyInstance } from 'fastify';
import { simulateBacktest } from '../services/backtestService.js';
import type { Horizon } from '../types/market.js';

export const registerBacktestRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/backtest',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            horizon: { type: 'string', enum: ['short', 'long'] },
            days: { type: 'number', minimum: 30, maximum: 365 },
          },
          required: ['horizon'],
        },
      },
    },
    async (request) => {
      const query = request.query as { horizon: Horizon; days?: number };
      return {
        data: simulateBacktest(query.horizon, query.days ?? 180, 100_000),
      };
    },
  );
};
