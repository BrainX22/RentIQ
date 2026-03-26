import { useMemo } from "react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { Property } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardSummaryRowProps {
  properties: Property[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardSummaryRow({ properties }: DashboardSummaryRowProps) {
  const { totalMonthlyCashFlow, totalPortfolioValue, avgCocReturn } = useMemo(() => {
    let cashFlow = 0;
    let value = 0;
    let cocSum = 0;
    let cocCount = 0;

    for (const p of properties) {
      cashFlow += p.monthly_cash_flow;
      value += p.property_price;
      if (p.cash_on_cash_return !== null) {
        cocSum += p.cash_on_cash_return;
        cocCount++;
      }
    }

    return {
      totalMonthlyCashFlow: cashFlow,
      totalPortfolioValue: value,
      avgCocReturn: cocCount === 0 ? null : cocSum / cocCount,
    };
  }, [properties]);

  const cashFlowIsNegative = totalMonthlyCashFlow < 0;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Portfolio Summary</h2>
        <span className="inline-flex items-center rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          Max
        </span>
      </div>

      <hr className="my-4 border-violet-200" />

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-violet-600">Total Monthly CF</p>
          <p
            className={cn(
              "mt-1 font-mono text-2xl font-bold",
              cashFlowIsNegative ? "text-red-600" : "text-emerald-600"
            )}
          >
            {formatCurrency(totalMonthlyCashFlow)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-violet-600">Total Value</p>
          <p className="mt-1 font-mono text-2xl font-bold text-gray-900">
            {formatCurrency(totalPortfolioValue)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-violet-600">Avg CoC Return</p>
          <p className="mt-1 font-mono text-2xl font-bold text-gray-900">
            {avgCocReturn === null ? "—" : formatPercent(avgCocReturn)}
          </p>
        </div>
      </div>
    </div>
  );
}
