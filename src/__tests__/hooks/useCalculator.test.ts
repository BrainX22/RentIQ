import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCalculator, DEFAULT_CALCULATOR_INPUTS } from "@/hooks/useCalculator";

const STORAGE_KEY = "rentiq:calculator";

describe("useCalculator — core behaviour", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("initialises with DEFAULT_CALCULATOR_INPUTS when localStorage is empty", () => {
    const { result } = renderHook(() => useCalculator());
    expect(result.current.inputs).toEqual(DEFAULT_CALCULATOR_INPUTS);
  });

  it("setInput updates a single field immutably", () => {
    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setInput("propertyPrice", 450000);
    });
    expect(result.current.inputs.propertyPrice).toBe(450000);
    // Other fields untouched
    expect(result.current.inputs.downPaymentPercent).toBe(DEFAULT_CALCULATOR_INPUTS.downPaymentPercent);
  });

  it("resetInputs restores DEFAULT_CALCULATOR_INPUTS", () => {
    const { result } = renderHook(() => useCalculator());
    act(() => result.current.setInput("propertyPrice", 999999));
    act(() => result.current.resetInputs());
    expect(result.current.inputs).toEqual(DEFAULT_CALCULATOR_INPUTS);
  });
});

describe("useCalculator — localStorage persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("writes inputs to localStorage after 500ms debounce", async () => {
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setInput("propertyPrice", 500000);
    });

    // Before debounce fires — nothing written yet
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Advance past debounce
    act(() => { vi.advanceTimersByTime(600); });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.propertyPrice).toBe(500000);
  });

  it("does not write on rapid successive changes before debounce fires", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useCalculator());

    act(() => { result.current.setInput("propertyPrice", 100000); });
    act(() => { result.current.setInput("propertyPrice", 200000); });
    act(() => { result.current.setInput("propertyPrice", 300000); });

    // Advance only 300ms — debounce should not have fired
    act(() => { vi.advanceTimersByTime(300); });
    // No writes for the calculator key in that window
    const calculatorWrites = setSpy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(calculatorWrites.length).toBe(0);
  });

  it("restores valid inputs from localStorage on mount", () => {
    const savedInputs = { ...DEFAULT_CALCULATOR_INPUTS, propertyPrice: 750000 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInputs));

    const { result } = renderHook(() => useCalculator());

    // Flush the mount effect
    act(() => { vi.advanceTimersByTime(0); });

    expect(result.current.inputs.propertyPrice).toBe(750000);
  });

  it("uses defaults when localStorage contains invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{");
    const { result } = renderHook(() => useCalculator());
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.inputs).toEqual(DEFAULT_CALCULATOR_INPUTS);
  });

  it("uses defaults when localStorage data fails Zod validation", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ propertyPrice: -9999 }));
    const { result } = renderHook(() => useCalculator());
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.inputs).toEqual(DEFAULT_CALCULATOR_INPUTS);
  });

  it("resetInputs removes the localStorage entry", () => {
    const savedInputs = { ...DEFAULT_CALCULATOR_INPUTS, propertyPrice: 600000 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInputs));

    const { result } = renderHook(() => useCalculator());
    act(() => { vi.advanceTimersByTime(0); });

    act(() => { result.current.resetInputs(); });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("reset does NOT re-persist defaults after the debounce window", () => {
    const savedInputs = { ...DEFAULT_CALCULATOR_INPUTS, propertyPrice: 600000 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInputs));

    const { result } = renderHook(() => useCalculator());
    act(() => { vi.advanceTimersByTime(0); }); // flush mount restore

    act(() => { result.current.resetInputs(); });

    // Advance well past debounce — entry must stay cleared
    act(() => { vi.advanceTimersByTime(1000); });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("next mount after reset starts with defaults, not stale saved values", () => {
    const savedInputs = { ...DEFAULT_CALCULATOR_INPUTS, propertyPrice: 600000 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedInputs));

    const { result: r1 } = renderHook(() => useCalculator());
    act(() => { vi.advanceTimersByTime(0); });
    act(() => { r1.current.resetInputs(); });

    // Fresh mount — storage was cleared
    const { result: r2 } = renderHook(() => useCalculator());
    act(() => { vi.advanceTimersByTime(0); });
    expect(r2.current.inputs).toEqual(DEFAULT_CALCULATOR_INPUTS);
  });
});
