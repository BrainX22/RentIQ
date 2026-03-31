"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateAll } from "@/lib/calculations";
import { calculatorInputsSchema } from "@/lib/validations";
import type { CalculatorInputs, CalculatorResults } from "@/types";

const CALCULATOR_STORAGE_KEY = "rentiq:calculator";

export const DEFAULT_CALCULATOR_INPUTS: CalculatorInputs = {
  propertyPrice: 300000,
  downPaymentPercent: 20,
  interestRate: 7,
  loanTermYears: 30,
  monthlyRent: 2000,
  propertyTaxYearly: 3600,
  insuranceMonthly: 100,
  hoaFeesMonthly: 0,
  maintenancePercent: 10,
  vacancyPercent: 5,
  propertyManagementPercent: 0,
  closingCostsPercent: 0,
};

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function useCalculator(initialInputs?: Partial<CalculatorInputs>) {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    ...DEFAULT_CALCULATOR_INPUTS,
    ...initialInputs,
  });

  // Prevents the debounce effect from re-writing defaults immediately after reset.
  const justResetRef = useRef(false);

  const setInput = useCallback(<K extends keyof CalculatorInputs>(field: K, value: number) => {
    setInputs((prev) => ({
      ...prev,
      [field]: normalizeNumber(value),
    }));
  }, []);

  const setInputsBulk = useCallback((nextInputs: Partial<CalculatorInputs>) => {
    const normalized = Object.fromEntries(
      Object.entries(nextInputs).map(([k, v]) => [k, normalizeNumber(v as number)])
    ) as Partial<CalculatorInputs>;
    setInputs((prev) => ({
      ...prev,
      ...normalized,
    }));
  }, []);

  const resetInputs = useCallback(() => {
    justResetRef.current = true;
    setInputs(DEFAULT_CALCULATOR_INPUTS);
    localStorage.removeItem(CALCULATOR_STORAGE_KEY);
  }, []);

  // ── Restore from localStorage on mount (runs once — intentionally empty deps) ─
  useEffect(() => {
    const raw = localStorage.getItem(CALCULATOR_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      const validated = calculatorInputsSchema.safeParse(parsed);
      if (validated.success) {
        setInputs((prev) => ({ ...prev, ...validated.data }));
      }
    } catch {
      // Corrupt JSON — silently fall back to defaults
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to localStorage on change (debounced 500ms) ─────────────────────
  // Skips write when a reset just fired so the cleared entry is not immediately
  // re-populated with defaults.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (justResetRef.current) {
        justResetRef.current = false;
        return;
      }
      localStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(inputs));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputs]);

  const results: CalculatorResults = useMemo(() => calculateAll(inputs), [inputs]);

  return {
    inputs,
    setInput,
    setInputsBulk,
    resetInputs,
    results,
  };
}
