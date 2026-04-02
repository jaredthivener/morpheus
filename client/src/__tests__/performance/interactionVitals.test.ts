import { describe, expect, it } from 'vitest';
import {
  MAX_INTERACTION_VITAL_HISTORY,
  createInteractionVitalSnapshot,
  ensureInteractionVitalsState,
  recordInteractionVital,
  shouldEnableInteractionVitals,
} from '../../performance/interactionVitals.js';

describe('interaction vitals collector helpers', () => {
  it('only enables collection for the explicit perf query flag', () => {
    expect(shouldEnableInteractionVitals('?dtn-perf=interaction')).toBe(true);
    expect(shouldEnableInteractionVitals('dtn-perf=interaction')).toBe(true);
    expect(shouldEnableInteractionVitals('?dtn-perf=market')).toBe(false);
    expect(shouldEnableInteractionVitals('?foo=bar')).toBe(false);
  });

  it('serializes the INP attribution payload into a stable snapshot', () => {
    const snapshot = createInteractionVitalSnapshot({
      id: 'inp-1',
      value: 118,
      rating: 'good',
      attribution: {
        interactionTarget: 'button[aria-label="Switch to dark mode"]',
        interactionType: 'pointer',
        interactionTime: 412.5,
        inputDelay: 12,
        processingDuration: 55,
        presentationDelay: 51,
        processedEventEntries: [{}, {}],
      },
    });

    expect(snapshot).toMatchObject({
      id: 'inp-1',
      value: 118,
      rating: 'good',
      interactionTarget: 'button[aria-label="Switch to dark mode"]',
      interactionType: 'pointer',
      interactionTime: 412.5,
      inputDelay: 12,
      processingDuration: 55,
      presentationDelay: 51,
      processedEntriesCount: 2,
    });
    expect(snapshot.generatedAt).toBeTypeOf('number');
  });

  it('reuses the same global store and caps metric history', () => {
    const targetWindow = {} as Window;
    const state = ensureInteractionVitalsState(targetWindow);

    expect(ensureInteractionVitalsState(targetWindow)).toBe(state);

    for (let index = 0; index < MAX_INTERACTION_VITAL_HISTORY + 3; index += 1) {
      recordInteractionVital(state, {
        id: `inp-${index}`,
        value: index,
        rating: 'good',
        interactionTarget: `row-${index}`,
        interactionType: 'pointer',
        interactionTime: index,
        inputDelay: index,
        processingDuration: index,
        presentationDelay: index,
        processedEntriesCount: 1,
        generatedAt: index,
      });
    }

    expect(state.history).toHaveLength(MAX_INTERACTION_VITAL_HISTORY);
    expect(state.inp?.id).toBe(`inp-${MAX_INTERACTION_VITAL_HISTORY + 2}`);
    expect(state.history[0]?.id).toBe('inp-3');
  });
});