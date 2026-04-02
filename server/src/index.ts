import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { MarketDataService } from './services/marketDataService.js';
import { registerHealthRoutes } from './routes/healthRoutes.js';
import { registerMarketRoutes } from './routes/marketRoutes.js';
import { registerSuggestionRoutes } from './routes/suggestionRoutes.js';
import { registerBacktestRoutes } from './routes/backtestRoutes.js';
import { registerOrderBookRoutes } from './routes/orderBookRoutes.js';
import { attachTickServer } from './websocket/tickServer.js';

const bootstrap = async (): Promise<void> => {
  const isPerfMode = process.env.PERF_MODE === '1';
  const fastify = Fastify({ logger: !isPerfMode });
  const marketDataService = new MarketDataService();

  try {
    await marketDataService.refreshQuotes();
  } catch {
    // Continue startup and fall back to the service cache chain if warm-up fails.
  }

  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:'],
      },
    },
  });

  if (!isPerfMode) {
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  await fastify.register(async (api) => {
    await registerHealthRoutes(api);
    await registerMarketRoutes(api, marketDataService);
    await registerOrderBookRoutes(api, marketDataService);
    await registerSuggestionRoutes(api);
    await registerBacktestRoutes(api);
  }, { prefix: '/api/v1' });

  attachTickServer(fastify.server, marketDataService);

  const port = Number(process.env.PORT ?? 3000);
  await fastify.listen({ port, host: '0.0.0.0' });
};

bootstrap().catch((error: unknown) => {
  // Avoid console.log in committed code per conventions.
  process.stderr.write(`Server startup failed: ${String(error)}\n`);
  process.exit(1);
});
