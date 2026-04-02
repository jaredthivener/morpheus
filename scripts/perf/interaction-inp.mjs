import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const budgetConfig = JSON.parse(
  readFileSync(new URL('./performance-budgets.json', import.meta.url), 'utf8'),
);
const clientBudget = budgetConfig.client;

const PERF_URL =
  process.env.PERF_APP_URL ?? 'http://localhost:4173/?dtn-perf=interaction';

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  process.env.DTN_CHROMIUM_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);

const browserExecutablePath = browserCandidates.find((candidate) => existsSync(candidate));

if (!browserExecutablePath) {
  throw new Error(
    'No Chromium-family browser executable found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE or install Google Chrome.',
  );
}

const waitForDashboard = async (page) => {
  await page.goto(PERF_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'MORPHEUS' }).waitFor();
  await page.locator('tbody tr').filter({ hasText: 'VOO' }).first().waitFor();
  await page.waitForFunction(() => Boolean(globalThis.__DTN_PERF__), { timeout: 10_000 });
  await page.waitForFunction(
    () => globalThis.__DTN_PERF__?.collectorReady === true || globalThis.__DTN_PERF__?.error !== null,
    { timeout: 10_000 },
  );

  const state = await page.evaluate(() => globalThis.__DTN_PERF__ ?? null);
  if (state?.error) {
    throw new Error(`INP collector failed to start: ${state.error}`);
  }
};

const exerciseInteractions = async (page) => {
  await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).click();

  await page.getByRole('button', { name: 'Switch to Growth Explorer' }).click();
  await page.locator('tbody tr').filter({ hasText: 'SOXX' }).first().waitFor();

  await page.locator('tbody tr').filter({ hasText: 'NVDA' }).first().click();
  await page.locator('tbody tr[aria-selected="true"]').filter({ hasText: 'NVDA' }).first().waitFor();

  await page.getByRole('button', { name: /^Limit$/ }).click();
  await page.getByRole('button', { name: /^Market$/ }).click();

  const sharesInput = page.getByLabel('Shares');
  await sharesInput.click();
  await sharesInput.fill('25');

  await page.waitForTimeout(400);
};

const collectInpMetric = async (page, context) => {
  let historyLength = await page.evaluate(() => globalThis.__DTN_PERF__?.history.length ?? 0);

  if (historyLength === 0) {
    const backgroundPage = await context.newPage();
    await backgroundPage.goto('about:blank');
    await backgroundPage.bringToFront();
    await page.waitForTimeout(300);
    await backgroundPage.close();
    await page.bringToFront();
  }

  await page.waitForFunction(() => (globalThis.__DTN_PERF__?.history.length ?? 0) > 0, {
    timeout: 10_000,
  });

  historyLength = await page.evaluate(() => globalThis.__DTN_PERF__?.history.length ?? 0);
  const inp = await page.evaluate(() => globalThis.__DTN_PERF__?.inp ?? null);

  if (!inp) {
    throw new Error('No INP metric was collected during the scripted interaction flow.');
  }

  return {
    historyLength,
    inp,
  };
};

const browser = await chromium.launch({
  executablePath: browserExecutablePath,
  headless: true,
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });
  const page = await context.newPage();

  await waitForDashboard(page);
  await exerciseInteractions(page);

  const { historyLength, inp } = await collectInpMetric(page, context);

  process.stdout.write(
    [
      `Scripted INP: ${inp.value.toFixed(2)} ms (limit ${clientBudget.inpTargetMs} ms)`,
      `  Interaction target: ${inp.interactionTarget ?? 'unknown'}`,
      `  Interaction type: ${inp.interactionType ?? 'unknown'}`,
      `  Subparts: input ${inp.inputDelay.toFixed(2)} ms, processing ${inp.processingDuration.toFixed(2)} ms, presentation ${inp.presentationDelay.toFixed(2)} ms`,
      `  Samples captured: ${historyLength}`,
    ].join('\n') + '\n',
  );

  if (inp.value > clientBudget.inpTargetMs) {
    throw new Error('Scripted INP budget failed.');
  }

  await context.close();
} finally {
  await browser.close();
}