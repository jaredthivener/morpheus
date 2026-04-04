# Morpheus Architecture

## Purpose

This document is the living system map for Morpheus. `AGENTS.md` is the social contract; this file is the implementation map that must stay current whenever architecture, product guardrails, or performance enforcement changes.

Update this document in the same change whenever any of the following moves:

- Feature ownership between client and server
- API routes, websocket behavior, or quote-source semantics
- State ownership, shared types, or major component composition
- Beginner-investor product guardrails or educational framing
- Performance budgets, performance tooling, or the definition of done

## Product Intent

Morpheus is a beginner-friendly paper-trading lab. The product teaches users how to compare diversified ETF exposure with individual stocks, inspect guidance, and practice simulated execution before risking real money.

The product guardrails are intentional:

- The experience is paper trading only.
- Investor profiles change emphasis, not recommendations.
- Suggestion scoring stays server-side and only ranked outcomes plus rationale strings reach the client.
- Quote freshness and fallback quality are treated as user trust features, not optional telemetry.

## Topology

```text
morpheus/
├── client/
│   └── src/
│       ├── App.tsx                    # Dashboard composition and profile-driven watchlist selection
│       ├── api/                       # Fetch wrappers used by TanStack Query
│       ├── components/
│       │   ├── layout/               # Shell, overview, structural panels, decorative matrix backdrop
│       │   ├── market/               # Watchlist and market surface
│       │   ├── onboarding/           # Investor profile selection
│       │   ├── portfolio/            # Summary and backtest visuals
│       │   ├── suggestions/          # Ranked ideas and rationale
│       │   ├── trading/              # Paper order ticket
│       │   └── common/               # Shared UI building blocks
│       ├── hooks/                     # WebSocket and reusable client behavior
│       ├── performance/               # Client performance contracts and perf-only vitals collection
│       ├── store/                     # Zustand portfolio state
│       ├── types/                     # Client-only TypeScript types
│       └── utils/                     # Pure market, profile, and formatting helpers
├── server/
│   └── src/
│       ├── routes/                    # Fastify route registration and schemas
│       ├── services/                  # Market data, backtests, guidance, order books
│       ├── websocket/                 # Tick broadcast server
│       ├── performance/               # Server perf budget types
│       └── types/                     # Server-only TypeScript types
└── scripts/perf/                      # Hard performance gates and report scripts
```

## Ownership Boundaries

- `client/src/types` and `server/src/types` contain types only. They do not hold runtime behavior.
- The client never imports from `server/`, and the server never imports from `client/`.
- UI components render and compose; they do not own business rules.
- `client/src/components/layout` owns non-interactive shell chrome such as the Matrix rain background and pill duo; decorative motion and iconography must stay presentation-only and never intercept input.
- Business rules live in `server/src/services` or `client/src/utils` depending on whether the logic must remain server-private.
- Portfolio state is owned by the client store because the app is a local paper-trading workflow.
- Suggestion internals remain server-only because raw scoring details are a product governance surface.

## Runtime Flow

### 1. Investor Lens → Watchlist

- `client/src/App.tsx` resolves the active investor profile from local storage.
- `client/src/components/onboarding/InvestorProfilePanel.tsx` owns the immediate visual acknowledgment of a newly selected lens so the selected card updates inside the click frame without requiring the heavier dashboard surfaces to re-render.
- `client/src/App.tsx` advances the watchlist-driving market surface through a short deferred handoff after the click so quote and ticket updates stay off the initial interaction path.
- The watchlist drives the market-data query key, the visible market table, and the default symbol routed into the paper ticket.

### 2. Quote Read Path

- The client requests `/api/v1/market-data` for the active watchlist.
- `server/src/services/marketDataService.ts` resolves live quotes first, then cached or synthetic fallbacks.
- Upstream Yahoo refreshes are batched per refresh cycle instead of fanning out one request per symbol.
- Rate-limit or upstream failures trigger a short provider cooldown window so the server serves cached or synthetic quotes instead of retry-storming the provider.
- `Quote.asOf` must always represent the source timestamp of the returned quote.
- Cached fallback does not get a fresh timestamp stamped onto it. Preserving source time is required for freshness enforcement.

### 3. Real-Time Update Path

- `client/src/hooks/useMarketSocket.ts` subscribes the websocket to the active watchlist symbols.
- The websocket server refreshes the union of active client subscriptions on a one-second cadence and broadcasts quote-backed ticks.
- Incoming ticks update the visible quote list and in-session sparkline history through pure helper functions.
- Tick payloads carry both transport timing (`timestamp`) for websocket latency measurement and quote freshness/source metadata (`asOf`, `source`, `changePercent`, `volume`) so the UI stays truthful between REST fetches.
- The websocket server must emit an immediate usable tick after connect so reconnect latency is observable and budgeted.

### 4. Paper Execution Path

- The market table selection and symbol selector both feed the paper order ticket.
- The ticket queries `/api/v1/order-book` for bid, ask, and spread context.
- The ticket lets order-type toggle selection acknowledge immediately, then hands the heavier market-versus-limit form swap off after a short delay so the click path stays responsive on slower hardware.
- Market orders execute locally against the simulated portfolio store.
- Limit orders are checked by the server and then reflected locally when simulated fills occur.

### 5. Guidance Path

- Suggestions and guidance routes stay on the server.
- The client renders ranked outcomes and rationale strings.
- Raw scoring internals are not exposed to the UI.

### 6. Backtest Comparison Path

- `client/src/components/portfolio/BacktestPanel.tsx` requests the short and long historical simulation series in parallel from `/api/v1/backtest`.
- The client derives comparison metrics such as ending spread, leader, and deepest pullback directly from the returned series instead of introducing a separate summary endpoint.
- The comparison chart owns a client-side scrubber that reveals the active simulation date and per-model equity values on hover or keyboard inspection without extra server round trips.
- Backtest copy must stay descriptive and historical. The UI can explain path roughness and outcome gaps, but it must not imply future performance.

## Performance Architecture

Performance is a product contract, not a reporting extra.

Source of truth:

- `scripts/perf/performance-budgets.json` defines shared client and server thresholds.
- `client/src/performance/vitals.ts` mirrors the client budget in TypeScript.
- `server/src/performance/budgets.ts` mirrors the server budget in TypeScript.

Hard gates:

- `npm run perf:api` checks route-tier API latency budgets.
- `npm run perf:market` checks quote freshness, coverage, and synthetic fallback quality.
- `npm run perf:ws` checks websocket latency, jitter, and reconnect-to-first-tick.
- `npm run perf:bundle` checks gzip bundle size.
- `npm run perf:web` and `npm run perf:web:report` check navigation-mode web vitals.
- `npm run perf:inp` runs a real browser interaction flow and hard-fails if INP exceeds 200 ms.
- `npm run perf` is the release gate and must stay green.

Pull request enforcement:

- `.github/workflows/quality-and-performance.yml` runs required GitHub checks for `Quality Checks`, `Performance Gate`, `Dependency Audit`, and `CodeQL Analysis` on PR open, update, reopen, and ready-for-review events, plus pushes to `main`.
- Protected branch rules must require those checks on the latest PR commit before merge so performance budgets and security analysis are enforced before code lands.
- The performance workflow resolves a Chromium-family executable on the runner and exports `PLAYWRIGHT_CHROMIUM_EXECUTABLE` so the browser-based INP gate runs consistently in CI.
- Lighthouse collection reads its target URL from environment configuration, so isolated local perf runs can point at the preview instance created by `scripts/perf/run-all.mjs` instead of accidentally auditing another local server.
- Explicit interaction-perf mode pins the dashboard to the ETF Starter lens and skips profile persistence so scripted INP always measures the same initial watchlist state instead of inheriting a saved browser preference.

Implementation details:

- Noncritical lower-dashboard surfaces such as guidance, the paper ticket, portfolio exposure, backtest analysis, and decorative matrix effects are deferred until after the primary market surface becomes interactive or the browser reaches an idle window.
- Deferred surfaces reserve their layout space with lightweight placeholders so responsiveness improves without introducing layout shift.
- The app lazily loads the `web-vitals/attribution` collector only when the explicit perf query flag is present.
- Scripted INP runs against stable user flows already present in the UI: theme toggle, investor profile change, watchlist selection, and ticket interaction.
- Navigation-mode metrics like TBT and Max Potential FID remain useful diagnostics, but they are no longer the only enforcement path for interaction latency.

## Change Checklist

Use this checklist before considering a non-trivial change done:

1. If UI composition, data flow, or feature ownership changed, update this file.
2. If performance expectations changed, update `scripts/perf/performance-budgets.json`, the mirrored TypeScript budget, and the relevant tests.
3. If beginner-investor guidance changed, realign PM/PO and financial-expert acceptance criteria before shipping behavior changes.
4. If a new route or websocket behavior was added, add or update a perf gate in `scripts/perf/`.
5. If PR enforcement changed, update the workflow contract and required-check list in this document.
6. If a new surface can affect rendering, latency, or bundle size, run the full perf gate before closing the work.

## Definition Of Done

A change is not done unless all of the following are true:

- Architecture documentation reflects the current system.
- Tests covering the changed behavior exist and pass.
- `npm run lint`, `npm run type-check`, and the relevant test suites pass.
- `npm run perf` passes without budget regressions unless the user explicitly approves a revised budget.
- For pull requests, the required GitHub checks `Quality Checks`, `Performance Gate`, `Dependency Audit`, and `CodeQL Analysis` pass on the latest commit before merge.