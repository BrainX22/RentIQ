"use client";

import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import type { CalculatorInputs, CalculatorResults } from "@/types";
import { AlertTriangle } from "lucide-react";

interface Props {
  inputs: CalculatorInputs;
  results: CalculatorResults;
}

interface ExpenseRow {
  label: string;
  value: number;
}

export default function ExpenseBreakdown({ inputs, results }: Props) {
  const rows: ExpenseRow[] = [
    { label: "Mortgage (P&I)", value: results.monthlyMortgage },
    { label: "Property Tax", value: results.monthlyPropertyTax },
    { label: "Insurance", value: inputs.insuranceMonthly },
    { label: "HOA", value: inputs.hoaFeesMonthly },
    { label: "Maintenance", value: results.monthlyMaintenance },
    { label: "Vacancy Loss", value: results.vacancyLoss },
  ];

  const isNegative = results.monthlyCashFlow < 0;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Monthly Expense Breakdown
      </h3>

      {/* Line items — only render rows with a nonzero value */}
      <div className="space-y-2">
        {rows.map(({ label, value }) =>
          value > 0 ? (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-mono text-gray-900">{formatCurrency(value)}</span>
            </div>
          ) : null
        )}
      </div>

      <Separator className="bg-gray-200" />

      {/* Total expenses */}
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-gray-700">Total Expenses</span>
        <span className="font-mono text-gray-900">{formatCurrency(results.totalMonthlyExpenses)}</span>
      </div>

      {/* Rent income */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Monthly Rent</span>
        <span className="font-mono text-emerald-600">{formatCurrency(inputs.monthlyRent)}</span>
      </div>

      <Separator className="bg-gray-200" />

      {/* Net cash flow */}
      <div className="flex items-center justify-between font-bold">
        <span className={cn(isNegative ? "text-red-600" : "text-emerald-600")}>
          Net Cash Flow
        </span>
        <span
          className={cn(
            "font-mono text-lg",
            isNegative ? "text-red-600" : "text-emerald-600"
          )}
        >
          {formatCurrency(results.monthlyCashFlow)}
        </span>
      </div>

      {/* Break-even warning */}
      {isNegative && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="text-xs text-red-700">
            <p className="font-semibold">Property is cash-flow negative</p>
            <p className="mt-0.5 text-red-600">
              Break-even rent:{" "}
              <span className="font-mono font-bold text-red-700">
                {formatCurrency(results.breakEvenRent)}/mo
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
