"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { CalculatorInputs } from "@/types";

interface Props {
  inputs: CalculatorInputs;
  setInput: (field: keyof CalculatorInputs, value: number) => void;
}

// ─── Reusable sub-inputs ──────────────────────────────────────────────────────

interface CurrencyInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  error?: string;
  step?: number;
}

function CurrencyInput({ id, value, onChange, onBlur, error, step = 1000 }: CurrencyInputProps) {
  return (
    <>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-gray-400">
          $
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          step={step}
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onBlur={onBlur}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          className={cn(
            "pl-7 font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            error && "border-red-400 focus-visible:ring-red-400"
          )}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </>
  );
}

interface PercentInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  error?: string;
  max?: number;
  step?: number;
}

function PercentInput({ id, value, onChange, onBlur, error, max = 100, step = 0.5 }: PercentInputProps) {
  return (
    <>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={0}
          max={max}
          step={step}
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(Math.min(parseFloat(e.target.value) || 0, max))}
          onBlur={onBlur}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          className={cn(
            "pr-8 font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            error && "border-red-400 focus-visible:ring-red-400"
          )}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-sm text-gray-400">
          %
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </>
  );
}

// ─── Loan term options ────────────────────────────────────────────────────────

const LOAN_TERMS = [15, 20, 30] as const;

// ─── Required field validation ────────────────────────────────────────────────

type RequiredField = "propertyPrice" | "monthlyRent" | "interestRate";

const REQUIRED_FIELD_LABELS: Record<RequiredField, string> = {
  propertyPrice: "Property Price",
  monthlyRent: "Monthly Rent",
  interestRate: "Interest Rate",
};

function getRequiredFieldError(field: RequiredField, value: number): string | undefined {
  if (value <= 0) return `${REQUIRED_FIELD_LABELS[field]} is required.`;
  return undefined;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalculatorInputs({ inputs, setInput }: Props) {
  const [touched, setTouched] = useState<Partial<Record<keyof CalculatorInputs, boolean>>>({});

  const handleBlur = (field: keyof CalculatorInputs) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const requiredError = (field: RequiredField): string | undefined => {
    if (!touched[field]) return undefined;
    return getRequiredFieldError(field, inputs[field]);
  };

  return (
    <div className="space-y-8">
      {/* ── Purchase ─────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Purchase
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="propertyPrice" className="text-sm text-gray-600">
              Property Price
            </Label>
            <CurrencyInput
              id="propertyPrice"
              value={inputs.propertyPrice}
              onChange={(v) => setInput("propertyPrice", v)}
              onBlur={() => handleBlur("propertyPrice")}
              error={requiredError("propertyPrice")}
              step={5000}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="downPaymentPercent" className="text-sm text-gray-600">
                Down Payment
              </Label>
              <span className="font-mono text-sm text-orange-600">
                {inputs.downPaymentPercent}%
              </span>
            </div>
            <PercentInput
              id="downPaymentPercent"
              value={inputs.downPaymentPercent}
              onChange={(v) => setInput("downPaymentPercent", v)}
              max={50}
              step={1}
            />
            <Slider
              value={[inputs.downPaymentPercent]}
              onValueChange={(value) => setInput("downPaymentPercent", typeof value === "number" ? value : value[0])}
              min={0}
              max={50}
              step={1}
              className="py-1"
            />
          </div>
        </div>
      </section>

      {/* ── Financing ────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Financing
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="interestRate" className="text-sm text-gray-600">
                Interest Rate
              </Label>
              <span className="font-mono text-sm text-orange-600">
                {inputs.interestRate}%
              </span>
            </div>
            <PercentInput
              id="interestRate"
              value={inputs.interestRate}
              onChange={(v) => setInput("interestRate", v)}
              onBlur={() => handleBlur("interestRate")}
              error={requiredError("interestRate")}
              max={20}
              step={0.1}
            />
            <Slider
              value={[inputs.interestRate]}
              onValueChange={(value) => setInput("interestRate", typeof value === "number" ? value : value[0])}
              min={2}
              max={15}
              step={0.1}
              className="py-1"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Loan Term</Label>
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              {LOAN_TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setInput("loanTermYears", term)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 font-mono text-sm font-medium transition-colors",
                    inputs.loanTermYears === term
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {term} yr
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Income ───────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Income
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyRent" className="text-sm text-gray-600">
            Monthly Rent
          </Label>
          <CurrencyInput
            id="monthlyRent"
            value={inputs.monthlyRent}
            onChange={(v) => setInput("monthlyRent", v)}
            onBlur={() => handleBlur("monthlyRent")}
            error={requiredError("monthlyRent")}
            step={50}
          />
        </div>
      </section>

      {/* ── Expenses ─────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Expenses
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="propertyTaxYearly" className="text-sm text-gray-600">
              Property Tax (yearly)
            </Label>
            <CurrencyInput
              id="propertyTaxYearly"
              value={inputs.propertyTaxYearly}
              onChange={(v) => setInput("propertyTaxYearly", v)}
              step={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insuranceMonthly" className="text-sm text-gray-600">
              Insurance (monthly)
            </Label>
            <CurrencyInput
              id="insuranceMonthly"
              value={inputs.insuranceMonthly}
              onChange={(v) => setInput("insuranceMonthly", v)}
              step={10}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hoaFeesMonthly" className="text-sm text-gray-600">
              HOA (monthly)
            </Label>
            <CurrencyInput
              id="hoaFeesMonthly"
              value={inputs.hoaFeesMonthly}
              onChange={(v) => setInput("hoaFeesMonthly", v)}
              step={10}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenancePercent" className="text-sm text-gray-600">
                Maintenance
              </Label>
              <span className="font-mono text-sm text-gray-500">
                {inputs.maintenancePercent}% of rent
              </span>
            </div>
            <PercentInput
              id="maintenancePercent"
              value={inputs.maintenancePercent}
              onChange={(v) => setInput("maintenancePercent", v)}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="vacancyPercent" className="text-sm text-gray-600">
                Vacancy Rate
              </Label>
              <span className="font-mono text-sm text-gray-500">
                {inputs.vacancyPercent}% of rent
              </span>
            </div>
            <PercentInput
              id="vacancyPercent"
              value={inputs.vacancyPercent}
              onChange={(v) => setInput("vacancyPercent", v)}
              max={50}
              step={1}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
