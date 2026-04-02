# Morpheus — Agent Guidelines

## Read This First

Every agent session **must** read this file completely before writing any code, running any command,
or making any architectural decision. This is the social contract: treat these rules as non-negotiable
constraints, not suggestions.

The living architecture map is `docs/architecture.md`. For any non-trivial change, read it after this
file and update it in the same change whenever system boundaries, product guardrails, or performance
enforcement move.

---

## Runtime & Versions (locked)

| Runtime / Package        | Version         | Notes                          |
|--------------------------|-----------------|--------------------------------|
| Node.js                  | **v24.x LTS**   | Active LTS "Krypton" ≥24.14.1 |
| React                    | **19.2.x**      | Use latest React 19.2 patterns |
| Material UI              | **7.x**         | `@mui/material` ≥7.3.9        |
| Vite                     | **8.x**         | ≥8.0.3                        |
| Fastify                  | **5.x**         | ≥5.8.4                        |
| Zustand                  | **5.x**         | ≥5.0.12                       |
| TanStack Query           | **5.x**         | ≥5.95.2                       |
| TypeScript               | **5.7.x**       |                                |

**Never introduce a dependency without verifying its latest version via `npm show <pkg>@latest version`.**

---

## Performance Contract

All development work is measured against these hard limits. Exceeding any budget requires explicit
justification documented in the PR:

| Metric                               | Budget      | What It Measures                                                                        | Why It Matters                                                                                          |
|--------------------------------------|-------------|-----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| LCP                                  | ≤ 1,800 ms  | Time until the largest visible element finishes painting                                | Finance dashboards feel trustworthy only when the primary market surface appears almost immediately     |
| FCP                                  | ≤ 1,200 ms  | Time until any visible content first renders                                             | Early feedback is critical on quote-heavy screens where users expect near-instant responsiveness        |
| CLS                                  | ≤ 0.03      | Total unexpected layout shift                                                            | Stable watchlists and tickets prevent misreads and misclicks during async market refreshes              |
| INP target                           | ≤ 200 ms    | End-user interaction latency target for taps, clicks, and input                         | Research workflows degrade fast when filters, sort actions, or ticket edits hesitate                    |
| Total Blocking Time                  | ≤ 150 ms    | Navigation-mode main-thread responsiveness between FCP and interactive state             | Useful diagnostic for slow work even with a dedicated hard INP gate                                     |
| Max Potential FID                    | ≤ 100 ms    | Longest main-thread task exposed during lab execution                                    | Prevents single heavy tasks from undermining interaction quality                                        |
| Critical market read API P95         | ≤ 75 ms     | 95th-percentile latency for `/market-data` and `/order-book` routes                      | Quote lookup and order-book reads must feel immediate                                                   |
| Critical market read API P99         | ≤ 150 ms    | Tail latency for `/market-data` and `/order-book` routes                                 | Keeps bursty quote and book requests from feeling inconsistent                                          |
| Advisory API P95                     | ≤ 100 ms    | 95th-percentile latency for `/suggestions` and `/guidance`                               | Guidance should stay fast enough to support exploration without blocking user flow                      |
| Advisory API P99                     | ≤ 180 ms    | Tail latency for `/suggestions` and `/guidance`                                          | Prevents AI-driven surfaces from becoming the slow column on the page                                   |
| Analytics API P95                    | ≤ 125 ms    | 95th-percentile latency for `/backtest`                                                  | Heavier analysis still needs to feel interactive                                                        |
| Analytics API P99                    | ≤ 250 ms    | Tail latency for `/backtest`                                                             | Protects the worst-case experience on comparative strategy work                                         |
| WebSocket tick latency P95           | ≤ 20 ms     | 95th-percentile wall-clock delay from server tick timestamp to client receipt            | Price streams must feel real-time, not merely “fast enough”                                             |
| WebSocket tick latency P99           | ≤ 35 ms     | Tail latency for the same websocket tick path                                            | Guards market-feed smoothness under bursts                                                               |
| WebSocket latency jitter P95         | ≤ 20 ms     | Variation between consecutive websocket tick latencies                                   | Consistency matters as much as raw speed when users track changing quotes                               |
| WebSocket reconnect to first tick    | ≤ 250 ms    | Time from reconnect start to the first usable tick after transport recovery              | Recovery after transient disconnects must be quick enough to preserve trust                             |
| Quote freshness P95                  | ≤ 15,000 ms | Age of returned quote data based on source timestamp                                     | Returned data must stay inside the live quote freshness window                                           |
| Max quote age                        | ≤ 20,000 ms | Oldest quote returned in the market-feed quality gate                                    | Prevents a single stale symbol from hiding inside an otherwise-fast response                            |
| Synthetic fallback rate              | ≤ 20 %      | Share of requested symbols served from synthetic fallback during perf validation          | Surfaces market-data degradation instead of letting fake prices silently pass perf gates                |
| Main JS bundle (gzip)                | ≤ 170 KB    | Gzip size of the primary JavaScript chunk delivered on first load                        | Smaller bundles preserve responsiveness on laptop and mobile-class CPUs                                 |
| Total initial (gzip)                 | ≤ 400 KB    | Gzip size of all assets fetched before the page becomes usable                           | Keeps first-visit bandwidth low enough for slow or unstable connections                                 |
| Frame budget                         | ≤ 16 ms     | Time available per frame to keep animations at 60 fps ($1000 / 60$)                      | Smooth scrolling and chart updates still cannot miss the rendering budget                               |

Performance tests live in `client/src/__tests__/performance/`, `server/src/__tests__/performance/`,
and `scripts/perf/`.

Performance is a non-regression contract:
- If any metric fails, implementation is not done.
- The team must continue iterating until all budgets pass again.
- No feature ships with degraded metrics unless the user explicitly approves a revised budget.
- `npm run perf:inp` is the hard INP gate.
- TBT and Max Potential FID remain required navigation-mode diagnostics and do not replace the hard INP gate.

---

## Architecture

The summary below is a quick reference. `docs/architecture.md` is the living architecture document and
must be updated whenever architecture, data flow, product guardrails, or performance enforcement changes.

```
morpheus/
├── client/          # React 19.2 + Vite 8 + MUI 7 SPA
│   └── src/
│       ├── pages/           # Route-level components
│       ├── components/      # Feature components (layout|market|portfolio|trading|suggestions|common)
│       ├── hooks/           # Custom React hooks
│       ├── store/           # Zustand slices
│       ├── api/             # TanStack Query + fetch wrappers
│       ├── types/           # Shared TypeScript types (no runtime code)
│       ├── utils/           # Pure functions, formatters, scoring
│       └── performance/     # Web Vitals instrumentation
└── server/          # Fastify 5 REST API + WebSocket tick server
    └── src/
        ├── routes/          # Fastify route handlers
        ├── services/        # Business logic (market data, portfolio, AI scoring)
        ├── websocket/       # Real-time price tick broadcaster
        └── types/           # Server-side types
```

**Key boundaries:**
- `types/` directories contain **only** TypeScript interfaces and type aliases — no runtime imports
- Client never imports from `server/` and vice versa
- All business logic (scoring, calculations) lives in `services/` or `utils/` — never in components or routes

---

## Coding Standards

### TypeScript
- `strict: true` with `noUncheckedIndexedAccess` — no exceptions
- Use `type` imports: `import type { Foo } from './types'`
- No `any`. Use `unknown` + type guards at system boundaries
- Discriminated unions over optional fields for state machines

### React
- Functional components only — no class components
- React 19.2 features preferred: `use()`, `useActionState`, `useFormStatus`, `useOptimistic`, `useEffectEvent`, `<Activity>`
- `ref` as a direct prop (no `forwardRef`)
- Context rendered directly (no `Context.Provider`)
- Ref callbacks return cleanup functions
- Place `<title>`, `<meta>` directly in components — React 19 hoists them

### Naming
| Thing              | Convention          | Example                        |
|--------------------|---------------------|--------------------------------|
| Components         | PascalCase          | `PortfolioSummary.tsx`         |
| Hooks              | camelCase + `use`   | `useMarketTick.ts`             |
| Zustand stores     | camelCase + `Store` | `portfolioStore.ts`            |
| Server routes      | kebab-case paths    | `/api/v1/market-data`          |
| Types/interfaces   | PascalCase          | `PortfolioHolding`             |
| Constants          | SCREAMING_SNAKE     | `MAX_POSITIONS`                |
| Test files         | `*.test.ts(x)`      | `portfolioStore.test.ts`       |

### File Structure
- One component per file
- Co-locate tests: `Foo.tsx` → `Foo.test.tsx` in `__tests__/` or adjacent `*.test.tsx`
- Barrel exports (`index.ts`) only at the component-group level, never re-exporting everything from a page

---

## Security (OWASP Top 10 — enforced)

- **No `eval`, `new Function`, or `dangerouslySetInnerHTML`** without explicit sanitization
- All API inputs validated with Fastify's built-in JSON Schema validation
- `@fastify/helmet` active on all routes — never disable
- `@fastify/rate-limit` on all public endpoints
- No secrets in source code — use environment variables; never log them
- Content-Security-Policy header must be restrictive: no `unsafe-inline` JS
- Dependency audits: run `npm audit` before every merge

---

## Testing (TDD — mandatory)

Tests are written **before** or **alongside** implementation — never after.

```
Add/update test → Implement → Run targeted suite → Run full suite → Ship
```

Performance validation is part of TDD, not a post-hoc check:

```
Add/update metric test or perf assertion → Implement → Run targeted perf check → Run full perf gate (`npm run perf`) → Ship
```

Performance remediation is a required circular loop:

```
Implement change → Measure (`npm run perf`) → If any metric fails: diagnose root cause → optimize/fix → re-run perf → repeat until all metrics pass
```

| Layer            | Tool                           | Location                          |
|------------------|--------------------------------|-----------------------------------|
| Server unit      | Vitest                         | `server/src/__tests__/`           |
| Client unit      | Vitest + React Testing Library | `client/src/__tests__/`           |
| Performance      | Vitest + custom budgets        | `*/__tests__/performance/`        |

**Commands:**
```bash
npm test                       # all tests
npm test -w server             # server only
npm test -w client             # client only
npm run lint                   # ESLint (must pass with 0 errors)
npm run type-check             # TypeScript strict check
npm run perf:inp               # hard INP browser interaction gate
npm run perf                   # full performance gate (API, WS, bundle, web vitals)
```

Every feature that can affect rendering, network latency, websocket behavior, or bundle size must include or update metric coverage, must update `docs/architecture.md` when the system map changes, and must pass `npm run perf` before merge.

If a code change causes metric regression, rollback or continue optimization work in the same development cycle until regression is removed.

Minimum coverage thresholds (enforced in CI):
- Statements: 80%
- Branches: 75%
- Functions: 80%

---

## Self-Review Protocol (Social Contract)

**Every code change — no matter how small — must pass a self-review before being considered done.**

### Non-Suppression Rule (Mandatory)

- Do **not** suppress warnings or errors to make checks pass (no muting ESLint/TypeScript rules without explicit user approval)
- Do **not** add bypasses such as disabling checks globally or per-file unless the user explicitly requests and documents why
- Resolve the root cause in code, typing, configuration, or tests
- If a rule is truly incorrect for the project, propose a targeted change and ask for approval before applying it

After implementing any feature, fix, or refactor:

1. **Sub-agent review pass**: Spawn a review of the changed files checking:
   - Does it violate any rule in this AGENTS.md?
   - Are there TypeScript `strict` violations or implicit `any`?
   - Does any new code hit a security concern from OWASP Top 10?
   - Are performance budgets at risk? (bundle size, render cost, API latency)
   - Are tests present and meaningful (not just covering happy paths)?
   - Are React 19.2 patterns used where appropriate?

2. **Fix all findings** before presenting output to the user

    - If perf budgets fail, keep working in a loop until they pass.
    - Do not stop at partial improvements when a budget is still red.

3. **Report to user**: After review, briefly state what the review found and how it was resolved (or confirm clean)

This is a non-negotiable step. Skipping it violates the contract.

---

## Product Governance (Mandatory)

- Use the workspace custom agent in `.github/agents/product-owner.agent.md` for feature scoping and prioritization.
- Use the workspace custom agent in `.github/agents/financial-expert.agent.md` when changing beginner-investor guidance, stock or ETF educational signals, or risk framing.
- For every non-trivial feature, obtain PM/PO output before implementation:
    - Problem Statement
    - User Stories
    - Acceptance Criteria
    - Risks and Mitigations
    - Success Metrics
    - Priority and Scope (Now / Next / Later)
- Engineering implementation must trace back to those acceptance criteria.
- If financial professional guidance changes product behavior, update acceptance criteria before coding.

---

## Git Conventions

- Atomic commits: one logical change per commit
- Commit message format: `type(scope): description` — e.g. `feat(portfolio): add equity curve chart`
- Types: `feat` | `fix` | `perf` | `test` | `refactor` | `chore` | `docs`
- Never commit: `console.log` calls, `.env` files, `dist/` output, or failing tests

---

## AI Suggestion Engine

The scoring engine (`server/src/services/suggestionService.ts`) must:
- Score against a universe of ≥50 symbols
- Short-term score: momentum (1d/5d/20d weighted), volume surge, RSI proxy
- Long-term score: volatility-adjusted return, 52-week value proximity, sector diversity
- Normalize all scores to 0–100
- Never expose raw score internals to the client — only ranked results + rationale strings
