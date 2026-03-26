import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

describe("useAnimatedNumber", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Restore default matchMedia stub from setup.ts
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  function mockReducedMotion(enabled: boolean) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: enabled && query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  it("returns the initial value immediately on first render", () => {
    const { result } = renderHook(() => useAnimatedNumber(500));
    expect(result.current).toBe(500);
  });

  it("returns a number type", () => {
    const { result } = renderHook(() => useAnimatedNumber(42));
    expect(typeof result.current).toBe("number");
  });

  it("returns new value immediately when prefers-reduced-motion: reduce is active", () => {
    mockReducedMotion(true);

    const { result, rerender } = renderHook(
      ({ value }) => useAnimatedNumber(value),
      { initialProps: { value: 100 } }
    );

    expect(result.current).toBe(100);

    act(() => {
      rerender({ value: 999 });
    });

    expect(result.current).toBe(999);
  });

  it("returns new value immediately for negative targets with reduced motion", () => {
    mockReducedMotion(true);

    const { result, rerender } = renderHook(
      ({ value }) => useAnimatedNumber(value),
      { initialProps: { value: 0 } }
    );

    act(() => {
      rerender({ value: -500 });
    });

    expect(result.current).toBe(-500);
  });

  it("starts animating toward the new value when target changes (no reduced motion)", () => {
    mockReducedMotion(false);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(globalThis.performance, "now").mockReturnValue(0);

    const { result, rerender } = renderHook(
      ({ value }) => useAnimatedNumber(value),
      { initialProps: { value: 0 } }
    );

    expect(result.current).toBe(0);

    act(() => {
      rerender({ value: 100 });
    });

    // RAF was scheduled
    expect(rafCallbacks.length).toBeGreaterThan(0);

    // Simulate frame at 400ms (past 300ms duration) → animation completes
    vi.spyOn(globalThis.performance, "now").mockReturnValue(400);
    act(() => {
      const lastCb = rafCallbacks[rafCallbacks.length - 1];
      lastCb(400);
    });

    expect(result.current).toBe(100);
  });

  it("reaches exactly the target value when animation completes", () => {
    mockReducedMotion(false);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(globalThis.performance, "now").mockReturnValue(0);

    const { result, rerender } = renderHook(
      ({ value }) => useAnimatedNumber(value),
      { initialProps: { value: 0 } }
    );

    act(() => {
      rerender({ value: 1234.56 });
    });

    // Simulate past-duration frame
    act(() => {
      const lastCb = rafCallbacks[rafCallbacks.length - 1];
      lastCb(999);
    });

    expect(result.current).toBe(1234.56);
  });

  it("cancels animation frame on unmount (no memory leak)", () => {
    mockReducedMotion(false);

    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(globalThis.performance, "now").mockReturnValue(0);

    const { result, rerender, unmount } = renderHook(
      ({ value }) => useAnimatedNumber(value),
      { initialProps: { value: 0 } }
    );

    // Trigger an animation
    act(() => {
      rerender({ value: 100 });
    });

    expect(result.current).toBe(0); // still at start
    expect(rafSpy).toHaveBeenCalled();

    // Unmount mid-animation — cleanup must cancel the pending RAF
    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("accepts optional duration parameter", () => {
    mockReducedMotion(true);

    const { result, rerender } = renderHook(
      ({ value }) => useAnimatedNumber(value, 150),
      { initialProps: { value: 0 } }
    );

    act(() => {
      rerender({ value: 50 });
    });

    expect(result.current).toBe(50);
  });
});
