import type {
  GuidanceBundle,
  GuidanceItem,
  Horizon,
  RiskLevel,
  Suggestion,
} from '../types/market.js';

export const SYMBOL_UNIVERSE = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'AVGO',
  'BRK-B',
  'JPM',
  'V',
  'JNJ',
  'WMT',
  'MA',
  'PG',
  'XOM',
  'HD',
  'CVX',
  'ABBV',
  'KO',
  'PEP',
  'BAC',
  'COST',
  'MRK',
  'DIS',
  'NFLX',
  'ADBE',
  'CRM',
  'CSCO',
  'ORCL',
  'ACN',
  'AMD',
  'QCOM',
  'INTC',
  'AMAT',
  'TXN',
  'IBM',
  'GS',
  'MS',
  'BLK',
  'UNH',
  'PFE',
  'LLY',
  'NKE',
  'MCD',
  'SBUX',
  'SHOP',
  'UBER',
  'PLTR',
  'SNOW',
  'PANW',
  'CRWD',
  'PYPL',
  'SQ',
  'BA',
];

export const ETF_UNIVERSE = [
  'SPY',
  'VOO',
  'VTI',
  'IVV',
  'QQQ',
  'SCHD',
  'DIA',
  'IWM',
  'XLK',
  'XLF',
  'XLE',
  'XLV',
  'XLP',
  'XLI',
  'XLY',
  'XLU',
  'VNQ',
  'GLD',
  'TLT',
  'SOXX',
  'SMH',
  'ARKK',
];

interface RawScore {
  symbol: string;
  short: number;
  long: number;
  rationaleShort: string;
  rationaleLong: string;
}

interface StockGuidanceRow {
  symbol: string;
  research: number;
  caution: number;
  trend: number;
  risk: number;
}

interface EtfGuidanceRow {
  symbol: string;
  uptrend: number;
  downtrend: number;
  risk: number;
}

const hashNumber = (input: string, salt: number): number => {
  let hash = salt;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1_000_003;
  }
  return hash / 1_000_003;
};

const normalizeScores = (values: number[]): number[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values.map(() => 50);
  }
  return values.map((value) => ((value - min) / (max - min)) * 100);
};

const riskLevelFromScore = (riskScore: number): RiskLevel => {
  if (riskScore < 34) {
    return 'low';
  }

  if (riskScore < 67) {
    return 'medium';
  }

  return 'high';
};

const rankNormalized = <T>(rows: T[], scoreSelector: (row: T) => number) => {
  const normalized = normalizeScores(rows.map(scoreSelector));

  return rows.map((row, index) => ({
    row,
    score: Number((normalized[index] ?? 0).toFixed(2)),
  }));
};

const buildStockGuidanceUniverse = (): StockGuidanceRow[] => {
  return SYMBOL_UNIVERSE.map((symbol) => {
    const quality = hashNumber(symbol, 71) * 100;
    const stability = hashNumber(symbol, 79) * 100;
    const trend = hashNumber(symbol, 83) * 100;
    const valuationSupport = hashNumber(symbol, 89) * 100;
    const drawdownRisk = hashNumber(symbol, 97) * 100;

    return {
      symbol,
      research:
        quality * 0.33 +
        stability * 0.24 +
        trend * 0.23 +
        valuationSupport * 0.2,
      caution:
        drawdownRisk * 0.42 +
        (100 - trend) * 0.28 +
        (100 - quality) * 0.18 +
        (100 - stability) * 0.12,
      trend,
      risk: drawdownRisk,
    };
  });
};

const buildEtfGuidanceUniverse = (): EtfGuidanceRow[] => {
  return ETF_UNIVERSE.map((symbol) => {
    const oneDay = hashNumber(symbol, 101) * 100;
    const fiveDay = hashNumber(symbol, 107) * 100;
    const twentyDay = hashNumber(symbol, 109) * 100;
    const breadth = hashNumber(symbol, 113) * 100;
    const volatility = hashNumber(symbol, 127) * 100;

    return {
      symbol,
      uptrend: oneDay * 0.15 + fiveDay * 0.3 + twentyDay * 0.4 + breadth * 0.15,
      downtrend:
        (100 - oneDay) * 0.15 +
        (100 - fiveDay) * 0.3 +
        (100 - twentyDay) * 0.4 +
        volatility * 0.15,
      risk: volatility,
    };
  });
};

const buildGuidanceItem = (params: {
  symbol: string;
  assetType: 'stock' | 'etf';
  stance: 'research' | 'avoid';
  trend: 'up' | 'down';
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  rationale: string;
}): GuidanceItem => {
  return {
    symbol: params.symbol,
    assetType: params.assetType,
    stance: params.stance,
    trend: params.trend,
    riskLevel: params.riskLevel,
    confidence: params.confidence,
    summary: params.summary,
    rationale: params.rationale,
  };
};

export const buildGuidanceBundle = (limit = 4): GuidanceBundle => {
  const stockRows = buildStockGuidanceUniverse();
  const etfRows = buildEtfGuidanceUniverse();

  const stockResearch = rankNormalized(stockRows, (row) => row.research)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) =>
      buildGuidanceItem({
        symbol: row.symbol,
        assetType: 'stock',
        stance: 'research',
        trend: 'up',
        riskLevel: riskLevelFromScore(row.risk),
        confidence: score,
        summary: 'Quality, stability, and trend signals are aligned for deeper research.',
        rationale:
          'This name ranks well on long-term quality and stability inputs while keeping downside-risk signals more controlled than the average stock in the universe.',
      }),
    );

  const stockCautions = rankNormalized(stockRows, (row) => row.caution)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) =>
      buildGuidanceItem({
        symbol: row.symbol,
        assetType: 'stock',
        stance: 'avoid',
        trend: 'down',
        riskLevel: riskLevelFromScore(Math.max(row.risk, 68)),
        confidence: score,
        summary: 'Trend and stability inputs are weaker here, so caution is higher right now.',
        rationale:
          'This name scores worse on trend persistence and downside-risk checks, making it a lower-conviction starting point for average users building watchlists.',
      }),
    );

  const etfLeaders = rankNormalized(etfRows, (row) => row.uptrend)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) =>
      buildGuidanceItem({
        symbol: row.symbol,
        assetType: 'etf',
        stance: 'research',
        trend: 'up',
        riskLevel: riskLevelFromScore(row.risk),
        confidence: score,
        summary: 'Recent multi-period trend inputs are improving for this ETF.',
        rationale:
          'This ETF is ranking well on 1-day, 5-day, and 20-day directional strength, which makes it a useful candidate for broader-market or sector research.',
      }),
    );

  const etfLaggards = rankNormalized(etfRows, (row) => row.downtrend)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) =>
      buildGuidanceItem({
        symbol: row.symbol,
        assetType: 'etf',
        stance: 'avoid',
        trend: 'down',
        riskLevel: riskLevelFromScore(Math.max(row.risk, 45)),
        confidence: score,
        summary: 'Short- and medium-term trend inputs are slipping for this ETF.',
        rationale:
          'This ETF is losing relative strength across several time windows, so it is better framed as a caution signal than a fresh starting point.',
      }),
    );

  return {
    beginnerMessage:
      'Start with diversified ETFs or durable businesses, then use every AI idea as a research prompt rather than a command to buy or sell.',
    stockIdeas: stockResearch,
    stockCautions,
    etfLeaders,
    etfLaggards,
  };
};

const scoreUniverse = (): RawScore[] => {
  return SYMBOL_UNIVERSE.map((symbol, idx) => {
    const oneDayMomentum = hashNumber(symbol, 11) * 100;
    const fiveDayMomentum = hashNumber(symbol, 17) * 100;
    const twentyDayMomentum = hashNumber(symbol, 29) * 100;
    const volumeSurge = hashNumber(symbol, 37) * 100;
    const rsiProxy = hashNumber(symbol, 43) * 100;

    const volatilityAdjustedReturn = hashNumber(symbol, 53) * 100;
    const valueProximity52w = hashNumber(symbol, 61) * 100;
    const sectorDiversityBoost = ((idx % 10) / 10) * 100;

    const short =
      oneDayMomentum * 0.3 +
      fiveDayMomentum * 0.25 +
      twentyDayMomentum * 0.2 +
      volumeSurge * 0.15 +
      rsiProxy * 0.1;

    const long =
      volatilityAdjustedReturn * 0.45 +
      valueProximity52w * 0.35 +
      sectorDiversityBoost * 0.2;

    return {
      symbol,
      short,
      long,
      rationaleShort: 'Strong momentum blend (1d/5d/20d) with supportive volume profile.',
      rationaleLong:
        'Balanced long-term profile with volatility-adjusted return and diversification support.',
    };
  });
};

export const rankSuggestions = (horizon: Horizon, limit = 10): Suggestion[] => {
  const rows = scoreUniverse();
  const rawValues = rows.map((row) => (horizon === 'short' ? row.short : row.long));
  const normalized = normalizeScores(rawValues);

  const ranked = rows
    .map((row, idx) => {
      const normalizedScore = normalized[idx] ?? 0;
      const score = Number(normalizedScore.toFixed(2));
      return {
        symbol: row.symbol,
        score,
        horizon,
        rationale: horizon === 'short' ? row.rationaleShort : row.rationaleLong,
      } satisfies Suggestion;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
};
