export const INTERACTION_VITALS_QUERY_PARAM = 'dtn-perf';
export const INTERACTION_VITALS_QUERY_VALUE = 'interaction';
export const MAX_INTERACTION_VITAL_HISTORY = 20;

export type InteractionRating = 'good' | 'needs-improvement' | 'poor';
export type InteractionType = 'pointer' | 'keyboard';

export interface InteractionMetricInput {
  id: string;
  value: number;
  rating: InteractionRating;
  attribution: {
    interactionTarget: string;
    interactionType: InteractionType;
    interactionTime: number;
    inputDelay: number;
    processingDuration: number;
    presentationDelay: number;
    processedEventEntries: readonly unknown[];
  };
}

export interface InteractionVitalSnapshot {
  id: string;
  value: number;
  rating: InteractionRating;
  interactionTarget: string | null;
  interactionType: InteractionType | null;
  interactionTime: number;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  processedEntriesCount: number;
  generatedAt: number;
}

export interface InteractionVitalsState {
  collectorReady: boolean;
  error: string | null;
  inp: InteractionVitalSnapshot | null;
  history: InteractionVitalSnapshot[];
}

declare global {
  interface Window {
    __DTN_PERF__?: InteractionVitalsState;
  }
}

let collectorPromise: Promise<void> | null = null;

export const shouldEnableInteractionVitals = (search: string): boolean => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get(INTERACTION_VITALS_QUERY_PARAM) === INTERACTION_VITALS_QUERY_VALUE;
};

export const ensureInteractionVitalsState = (targetWindow: Window): InteractionVitalsState => {
  if (targetWindow.__DTN_PERF__) {
    return targetWindow.__DTN_PERF__;
  }

  const state: InteractionVitalsState = {
    collectorReady: false,
    error: null,
    inp: null,
    history: [],
  };

  targetWindow.__DTN_PERF__ = state;
  return state;
};

export const createInteractionVitalSnapshot = (
  metric: InteractionMetricInput,
): InteractionVitalSnapshot => ({
  id: metric.id,
  value: metric.value,
  rating: metric.rating,
  interactionTarget: metric.attribution.interactionTarget || null,
  interactionType: metric.attribution.interactionType ?? null,
  interactionTime: metric.attribution.interactionTime,
  inputDelay: metric.attribution.inputDelay,
  processingDuration: metric.attribution.processingDuration,
  presentationDelay: metric.attribution.presentationDelay,
  processedEntriesCount: metric.attribution.processedEventEntries.length,
  generatedAt: Date.now(),
});

export const recordInteractionVital = (
  state: InteractionVitalsState,
  snapshot: InteractionVitalSnapshot,
): void => {
  state.inp = snapshot;
  state.history = [...state.history, snapshot].slice(-MAX_INTERACTION_VITAL_HISTORY);
};

const dispatchInteractionVital = (
  targetWindow: Window,
  snapshot: InteractionVitalSnapshot,
): void => {
  targetWindow.dispatchEvent(new CustomEvent('dtn:inp', { detail: snapshot }));
};

export const startInteractionVitalsCollection = async (
  targetWindow: Window = window,
): Promise<InteractionVitalsState> => {
  const state = ensureInteractionVitalsState(targetWindow);

  if (state.collectorReady) {
    return state;
  }

  if (!collectorPromise) {
    collectorPromise = (async () => {
      try {
        // Keep attribution-only diagnostics off the normal startup path unless perf mode asks for them.
        const { onINP } = await import('web-vitals/attribution');

        onINP(
          (metric) => {
            const snapshot = createInteractionVitalSnapshot(metric);
            recordInteractionVital(state, snapshot);
            dispatchInteractionVital(targetWindow, snapshot);
          },
          {
            durationThreshold: 0,
            includeProcessedEventEntries: true,
            reportAllChanges: true,
          },
        );

        state.collectorReady = true;
        state.error = null;
      } catch (error: unknown) {
        state.error = error instanceof Error ? error.message : String(error);
        collectorPromise = null;
        throw error;
      }
    })();
  }

  await collectorPromise;
  return state;
};