export type Horizon = 'short' | 'long';
export type AssetType = 'stock' | 'etf';
export type GuidanceStance = 'research' | 'avoid';
export type GuidanceTrend = 'up' | 'down';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Quote {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  source: 'live' | 'cached' | 'synthetic';
  asOf: number;
}

export interface Tick {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  source: Quote['source'];
  asOf: number;
  timestamp: number;
}

export interface Suggestion {
  symbol: string;
  score: number;
  horizon: Horizon;
  rationale: string;
}

export interface GuidanceItem {
  symbol: string;
  assetType: AssetType;
  stance: GuidanceStance;
  trend: GuidanceTrend;
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  rationale: string;
}

export interface GuidanceBundle {
  beginnerMessage: string;
  stockIdeas: GuidanceItem[];
  stockCautions: GuidanceItem[];
  etfLeaders: GuidanceItem[];
  etfLaggards: GuidanceItem[];
}
