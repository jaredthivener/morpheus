import type { AssetType } from '../types/market';

export type InvestorProfileId = 'etf-starter' | 'balanced-builder' | 'growth-explorer';

export interface InvestorWatchlistItem {
  symbol: string;
  assetType: AssetType;
}

export interface InvestorProfile {
  id: InvestorProfileId;
  label: string;
  summary: string;
  description: string;
  watchlist: InvestorWatchlistItem[];
}

export const INVESTOR_PROFILE_STORAGE_KEY = 'dtn-investor-profile';

export const INVESTOR_PROFILES: InvestorProfile[] = [
  {
    id: 'etf-starter',
    label: 'ETF Starter',
    summary: 'Begin with broader exposure before focusing on individual companies.',
    description:
      'This lens emphasizes diversified ETFs and a few steadier large-cap names so beginners can compare broad exposure with durable businesses.',
    watchlist: [
      { symbol: 'VOO', assetType: 'etf' },
      { symbol: 'VTI', assetType: 'etf' },
      { symbol: 'SCHD', assetType: 'etf' },
      { symbol: 'XLV', assetType: 'etf' },
      { symbol: 'XLP', assetType: 'etf' },
      { symbol: 'XLU', assetType: 'etf' },
      { symbol: 'MSFT', assetType: 'stock' },
      { symbol: 'JNJ', assetType: 'stock' },
      { symbol: 'WMT', assetType: 'stock' },
      { symbol: 'COST', assetType: 'stock' },
    ],
  },
  {
    id: 'balanced-builder',
    label: 'Balanced Builder',
    summary: 'Mix core ETFs with durable stocks to compare both sides of the market.',
    description:
      'This lens keeps broad-market funds in view while adding blue-chip stocks so users can study diversification next to company-specific risk.',
    watchlist: [
      { symbol: 'VOO', assetType: 'etf' },
      { symbol: 'QQQ', assetType: 'etf' },
      { symbol: 'SCHD', assetType: 'etf' },
      { symbol: 'XLK', assetType: 'etf' },
      { symbol: 'AAPL', assetType: 'stock' },
      { symbol: 'MSFT', assetType: 'stock' },
      { symbol: 'JPM', assetType: 'stock' },
      { symbol: 'WMT', assetType: 'stock' },
      { symbol: 'XOM', assetType: 'stock' },
      { symbol: 'NVDA', assetType: 'stock' },
    ],
  },
  {
    id: 'growth-explorer',
    label: 'Growth Explorer',
    summary: 'Track higher-volatility sectors without losing ETF context.',
    description:
      'This lens highlights growth-heavy ETFs and large-cap momentum stocks for users who want more movement while still comparing sector baskets.',
    watchlist: [
      { symbol: 'QQQ', assetType: 'etf' },
      { symbol: 'SOXX', assetType: 'etf' },
      { symbol: 'SMH', assetType: 'etf' },
      { symbol: 'IWM', assetType: 'etf' },
      { symbol: 'NVDA', assetType: 'stock' },
      { symbol: 'AMZN', assetType: 'stock' },
      { symbol: 'META', assetType: 'stock' },
      { symbol: 'TSLA', assetType: 'stock' },
      { symbol: 'AMD', assetType: 'stock' },
      { symbol: 'GOOGL', assetType: 'stock' },
    ],
  },
];

interface StorageReader {
  getItem: (key: string) => string | null;
}

interface StorageWriter {
  setItem: (key: string, value: string) => void;
}

interface GetInitialInvestorProfileOptions {
  storage?: StorageReader | null;
  fallbackProfileId?: InvestorProfileId;
}

export const isInvestorProfileId = (value: string | null): value is InvestorProfileId => {
  return INVESTOR_PROFILES.some((profile) => profile.id === value);
};

export const getInvestorProfile = (profileId: string | null): InvestorProfile => {
  return (
    INVESTOR_PROFILES.find((profile) => profile.id === profileId) ?? INVESTOR_PROFILES[0]!
  );
};

export const getInitialInvestorProfileId = ({
  storage = typeof window !== 'undefined' ? window.localStorage : null,
  fallbackProfileId = 'etf-starter',
}: GetInitialInvestorProfileOptions = {}): InvestorProfileId => {
  const storedProfileId = storage?.getItem(INVESTOR_PROFILE_STORAGE_KEY) ?? null;

  if (isInvestorProfileId(storedProfileId)) {
    return storedProfileId;
  }

  return fallbackProfileId;
};

export const persistInvestorProfileId = (
  profileId: InvestorProfileId,
  storage: StorageWriter | null = typeof window !== 'undefined' ? window.localStorage : null,
): void => {
  storage?.setItem(INVESTOR_PROFILE_STORAGE_KEY, profileId);
};