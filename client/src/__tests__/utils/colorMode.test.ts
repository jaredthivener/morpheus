import { describe, expect, it, vi } from 'vitest';
import {
  COLOR_MODE_STORAGE_KEY,
  getInitialColorMode,
  persistColorMode,
} from '../../utils/colorMode';

describe('colorMode utilities', () => {
  it('returns a stored mode when one exists', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('light'),
      setItem: vi.fn(),
    };

    expect(getInitialColorMode({ storage, prefersDark: true })).toBe('light');
  });

  it('falls back to dark mode when there is no stored preference', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };

    expect(getInitialColorMode({ storage, prefersDark: false })).toBe('dark');
  });

  it('persists the selected color mode', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };

    persistColorMode('dark', storage);

    expect(storage.setItem).toHaveBeenCalledWith(COLOR_MODE_STORAGE_KEY, 'dark');
  });
});