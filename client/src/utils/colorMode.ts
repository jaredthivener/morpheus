export type ColorMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'dtn-color-mode';

interface StorageReader {
  getItem: (key: string) => string | null;
}

interface StorageWriter {
  setItem: (key: string, value: string) => void;
}

interface GetInitialColorModeOptions {
  storage?: StorageReader | null;
  prefersDark?: boolean;
  fallbackMode?: ColorMode;
}

const isColorMode = (value: string | null): value is ColorMode => value === 'light' || value === 'dark';

const getBrowserPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const getInitialColorMode = ({
  storage = typeof window !== 'undefined' ? window.localStorage : null,
  prefersDark = getBrowserPrefersDark(),
  fallbackMode = 'dark',
}: GetInitialColorModeOptions = {}): ColorMode => {
  const storedMode = storage?.getItem(COLOR_MODE_STORAGE_KEY) ?? null;
  if (isColorMode(storedMode)) {
    return storedMode;
  }

  if (prefersDark) {
    return 'dark';
  }

  return fallbackMode;
};

export const persistColorMode = (
  mode: ColorMode,
  storage: StorageWriter | null = typeof window !== 'undefined' ? window.localStorage : null,
): void => {
  storage?.setItem(COLOR_MODE_STORAGE_KEY, mode);
};