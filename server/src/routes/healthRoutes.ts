import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/health', async () => {
    return {
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  });
};
