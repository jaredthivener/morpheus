import type { FastifyInstance } from 'fastify';
import { buildGuidanceBundle, rankSuggestions } from '../services/suggestionService.js';
import type { Horizon } from '../types/market.js';

export const registerSuggestionRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/suggestions',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            horizon: { type: 'string', enum: ['short', 'long'] },
            limit: { type: 'number', minimum: 1, maximum: 20 },
          },
          required: ['horizon'],
        },
      },
    },
    async (request) => {
      const query = request.query as { horizon: Horizon; limit?: number };
      return {
        data: rankSuggestions(query.horizon, query.limit ?? 10),
      };
    },
  );

  fastify.get(
    '/guidance',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 8 },
          },
        },
      },
    },
    async (request) => {
      const query = request.query as { limit?: number };
      return {
        data: buildGuidanceBundle(query.limit ?? 4),
      };
    },
  );
};
