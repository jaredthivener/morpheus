import { describe, expect, it, vi } from 'vitest';
import {
  INVESTOR_PROFILE_STORAGE_KEY,
  getInitialInvestorProfileId,
  getInvestorProfile,
  persistInvestorProfileId,
} from '../../utils/investorProfile';

describe('investorProfile utilities', () => {
  it('returns a stored profile id when one exists', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('balanced-builder'),
      setItem: vi.fn(),
    };

    expect(getInitialInvestorProfileId({ storage, fallbackProfileId: 'etf-starter' })).toBe(
      'balanced-builder',
    );
  });

  it('falls back to the starter profile when storage is empty or invalid', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('unknown-profile'),
      setItem: vi.fn(),
    };

    expect(getInitialInvestorProfileId({ storage, fallbackProfileId: 'etf-starter' })).toBe(
      'etf-starter',
    );
  });

  it('persists the selected profile id', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };

    persistInvestorProfileId('growth-explorer', storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      INVESTOR_PROFILE_STORAGE_KEY,
      'growth-explorer',
    );
  });

  it('returns the starter profile when an id cannot be found', () => {
    expect(getInvestorProfile('not-real')).toMatchObject({
      id: 'etf-starter',
      label: 'ETF Starter',
    });
  });
});