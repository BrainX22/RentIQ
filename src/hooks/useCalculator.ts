"use client";

import { useMemo, useState } from "react";
import { calculateAll } from "@/lib/calculations";
import type { CalculatorInputs, CalculatorResults } from "@/types";

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

  const setInput = <K extends keyof CalculatorInputs>(field: K, value: number) => {
    setInputs((prev) => ({
      ...prev,
      [field]: normalizeNumber(value),
    }));
  };

  const setInputsBulk = (nextInputs: Partial<CalculatorInputs>) => {
    setInputs((prev) => ({
      ...prev,
      ...nextInputs,
    }));
  };

  const resetInputs = () => {
    setInputs(DEFAULT_CALCULATOR_INPUTS);
  };

  const results: CalculatorResults = useMemo(() => calculateAll(inputs), [inputs]);

  return {
    inputs,
    setInput,
    setInputsBulk,
    resetInputs,
    results,
  };
}
