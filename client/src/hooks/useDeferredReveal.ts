import { startTransition, useEffect, useState } from 'react';

interface DeferredRevealOptions {
  delayMs?: number;
  idleTimeoutMs?: number;
}

const FALLBACK_REVEAL_DELAY_MS = 0;
const DEFAULT_IDLE_TIMEOUT_MS = 1500;

export const useDeferredReveal = ({
  delayMs = 0,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
}: DeferredRevealOptions = {}): boolean => {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (isRevealed || typeof window === 'undefined') {
      return;
    }

    let revealDelayTimerId: number | undefined;
    let fallbackTimerId: number | undefined;
    let idleCallbackId: number | undefined;

    const reveal = () => {
      startTransition(() => {
        setIsRevealed(true);
      });
    };

    const scheduleReveal = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(() => {
          reveal();
        }, { timeout: idleTimeoutMs });
        return;
      }

      fallbackTimerId = window.setTimeout(reveal, FALLBACK_REVEAL_DELAY_MS);
    };

    revealDelayTimerId = window.setTimeout(scheduleReveal, delayMs);

    return () => {
      if (revealDelayTimerId !== undefined) {
        window.clearTimeout(revealDelayTimerId);
      }

      if (fallbackTimerId !== undefined) {
        window.clearTimeout(fallbackTimerId);
      }

      if (idleCallbackId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [delayMs, idleTimeoutMs, isRevealed]);

  return isRevealed;
};