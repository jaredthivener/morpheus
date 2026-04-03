import { StrictMode, startTransition, useDeferredValue, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { App } from './App';
import {
  shouldEnableInteractionVitals,
  startInteractionVitalsCollection,
} from './performance/interactionVitals';
import { getAppTheme } from './theme';
import type { ColorMode } from './utils/colorMode';
import { getInitialColorMode, persistColorMode } from './utils/colorMode';

const queryClient = new QueryClient();

const RootApp = () => {
  const [colorMode, setColorMode] = useState<ColorMode>(() => getInitialColorMode());
  const deferredColorMode = useDeferredValue(colorMode);
  const theme = getAppTheme(deferredColorMode);

  useEffect(() => {
    persistColorMode(colorMode);
  }, [colorMode]);

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <App
          colorMode={deferredColorMode}
          onToggleColorMode={() => {
            startTransition(() => {
              setColorMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
            });
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element');
}

if (shouldEnableInteractionVitals(window.location.search)) {
  void startInteractionVitalsCollection().catch(() => undefined);
}

createRoot(rootElement).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
