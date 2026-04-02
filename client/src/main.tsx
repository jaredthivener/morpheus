import { StrictMode, useEffect, useState } from 'react';
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
  const theme = getAppTheme(colorMode);

  useEffect(() => {
    persistColorMode(colorMode);
  }, [colorMode]);

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <App
          colorMode={colorMode}
          onToggleColorMode={() => {
            setColorMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
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
