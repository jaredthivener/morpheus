# Morpheus

Morpheus is a beginner-friendly paper-trading lab. It pairs a React 19 + Vite client with a Fastify 5 API and WebSocket feed so users can explore watchlists, compare backtests, inspect ranked ideas, and practice simulated trades without placing real orders.

## Stack

- Client: React 19, Vite 8, Material UI 7, Zustand, TanStack Query
- Server: Fastify 5, WebSocket tick server, TypeScript 5.7.x
- Tooling: Vitest, ESLint, Prettier, Lighthouse CI, custom performance gates

## Requirements

- Node.js 24.14.1 or newer
- npm 10 or newer

## Install

From the repository root:

```bash
npm ci
```

## Run The App

Start both the API and the client together from the repository root:

```bash
npm run dev
```

Local endpoints:

- Client: http://localhost:5173
- API: http://localhost:3000

Run each workspace separately if needed:

```bash
npm run dev -w server
npm run dev -w client
```

## Build And Preview

Build both workspaces:

```bash
npm run build
```

Run the built server:

```bash
npm run start -w server
```

Preview the built client:

```bash
npm run preview -w client
```

## Quality Checks

Run the full test suite:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Run strict TypeScript checks:

```bash
npm run type-check
```

Run the full performance gate:

```bash
npm run perf
```

Useful targeted perf commands:

```bash
npm run perf:api
npm run perf:market
npm run perf:ws
npm run perf:bundle
npm run perf:web
npm run perf:web:report
npm run perf:inp
```

## Environment Notes

- The server listens on `PORT`, defaulting to `3000`.
- The client reads `VITE_API_BASE_URL`, defaulting to `http://localhost:3000`.
- Market data is sourced through the server. If upstream warm-up fails, the app can fall back to cached or synthetic data paths instead of blocking startup.

## Project Layout

```text
morpheus/
|- client/   React app and UI state
|- server/   Fastify API, services, and WebSocket feed
|- scripts/  Performance automation and budget checks
`- docs/     Architecture and system guidance
```

## Architecture

The living architecture document is in [docs/architecture.md](docs/architecture.md).