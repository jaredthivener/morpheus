import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeferredReveal } from '../../hooks/useDeferredReveal';

type IdleCallback = Parameters<NonNullable<typeof window.requestIdleCallback>>[0];

describe('useDeferredReveal', () => {
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: originalRequestIdleCallback,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: originalCancelIdleCallback,
    });
  });

  it('waits for an idle callback before revealing deferred content when the browser supports it', async () => {
    const idleCallbacks: IdleCallback[] = [];

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: ((callback: IdleCallback) => {
        idleCallbacks.push(callback);
        return idleCallbacks.length;
      }) as typeof window.requestIdleCallback,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn() as typeof window.cancelIdleCallback,
    });

    const { result } = renderHook(() => useDeferredReveal({ delayMs: 180, idleTimeoutMs: 900 }));

    expect(result.current).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(179);
    });

    expect(result.current).toBe(false);
    expect(idleCallbacks).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(idleCallbacks).toHaveLength(1);
    expect(result.current).toBe(false);

    await act(async () => {
      idleCallbacks[0]?.({ didTimeout: false, timeRemaining: () => 40 } as IdleDeadline);
    });

    expect(result.current).toBe(true);
  });

  it('falls back to a timeout reveal when requestIdleCallback is unavailable', async () => {
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useDeferredReveal({ delayMs: 60 }));

    expect(result.current).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59);
    });

    expect(result.current).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });

    expect(result.current).toBe(true);
  });

  it('pushes the reveal back until the user stops interacting for the quiet window', async () => {
    const idleCallbacks: IdleCallback[] = [];
    const cancelIdleCallback = vi.fn();

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: ((callback: IdleCallback) => {
        idleCallbacks.push(callback);
        return idleCallbacks.length;
      }) as typeof window.requestIdleCallback,
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: cancelIdleCallback as typeof window.cancelIdleCallback,
    });

    const { result } = renderHook(() =>
      useDeferredReveal({ delayMs: 120, idleTimeoutMs: 900, quietWindowMs: 300 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120);
    });

    expect(idleCallbacks).toHaveLength(0);
    expect(result.current).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180);
    });

    expect(idleCallbacks).toHaveLength(1);
    expect(result.current).toBe(false);

    await act(async () => {
      window.dispatchEvent(new PointerEvent('pointerdown'));
    });

    expect(cancelIdleCallback).toHaveBeenCalledWith(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });

    expect(idleCallbacks).toHaveLength(1);
    expect(result.current).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(idleCallbacks).toHaveLength(2);

    await act(async () => {
      idleCallbacks[1]?.({ didTimeout: false, timeRemaining: () => 40 } as IdleDeadline);
    });

    expect(result.current).toBe(true);
  });
});