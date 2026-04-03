import { startTransition, useEffect, useState } from 'react';

interface DeferredRevealOptions {
  delayMs?: number;
  idleTimeoutMs?: number;
  quietWindowMs?: number;
}

const FALLBACK_REVEAL_DELAY_MS = 0;
const DEFAULT_IDLE_TIMEOUT_MS = 1500;
const PASSIVE_POINTERDOWN_LISTENER_OPTIONS = { passive: true, capture: false };

export const useDeferredReveal = ({
  delayMs = 0,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  quietWindowMs = 0,
}: DeferredRevealOptions = {}): boolean => {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (isRevealed || typeof window === 'undefined') {
      return;
    }

    let isDelayElapsed = delayMs === 0;
    let lastInteractionAt = Date.now();
    let revealDelayTimerId: number | undefined;
    let quietWindowTimerId: number | undefined;
    let fallbackTimerId: number | undefined;
    let idleCallbackId: number | undefined;

    const clearScheduledReveal = () => {
      if (quietWindowTimerId !== undefined) {
        window.clearTimeout(quietWindowTimerId);
        quietWindowTimerId = undefined;
      }

      if (fallbackTimerId !== undefined) {
        window.clearTimeout(fallbackTimerId);
        fallbackTimerId = undefined;
      }

      if (idleCallbackId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
        idleCallbackId = undefined;
      }
    };

    const reveal = () => {
      startTransition(() => {
        setIsRevealed(true);
      });
    };

    const scheduleReveal = () => {
      clearScheduledReveal();

      if (!isDelayElapsed) {
        return;
      }

      if (quietWindowMs > 0) {
        const remainingQuietWindowMs = quietWindowMs - (Date.now() - lastInteractionAt);

        if (remainingQuietWindowMs > 0) {
          quietWindowTimerId = window.setTimeout(scheduleReveal, remainingQuietWindowMs);
          return;
        }
      }

      if (typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(() => {
          idleCallbackId = undefined;
          reveal();
        }, { timeout: idleTimeoutMs });
        return;
      }

      fallbackTimerId = window.setTimeout(() => {
        fallbackTimerId = undefined;
        reveal();
      }, FALLBACK_REVEAL_DELAY_MS);
    };

    const markInteraction = () => {
      lastInteractionAt = Date.now();

      if (isDelayElapsed) {
        scheduleReveal();
      }
    };

    if (quietWindowMs > 0) {
      window.addEventListener(
        'pointerdown',
        markInteraction,
        PASSIVE_POINTERDOWN_LISTENER_OPTIONS,
      );
      window.addEventListener('keydown', markInteraction);
    }

    if (isDelayElapsed) {
      scheduleReveal();
    } else {
      revealDelayTimerId = window.setTimeout(() => {
        isDelayElapsed = true;
        scheduleReveal();
      }, delayMs);
    }

    return () => {
      if (revealDelayTimerId !== undefined) {
        window.clearTimeout(revealDelayTimerId);
      }

      clearScheduledReveal();

      if (quietWindowMs > 0) {
        window.removeEventListener(
          'pointerdown',
          markInteraction,
          PASSIVE_POINTERDOWN_LISTENER_OPTIONS,
        );
        window.removeEventListener('keydown', markInteraction);
      }
    };
  }, [delayMs, idleTimeoutMs, isRevealed, quietWindowMs]);

  return isRevealed;
};