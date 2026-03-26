"use client";

import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { findRowWinner } from "@/lib/compare-scoring";
import type { Property } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricRow {
  label: string;
  getValue: (p: Property) => number | null;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

// ─── Metric definitions ───────────────────────────────────────────────────────

const METRIC_ROWS: MetricRow[] = [
  {
    label: "Price",
    getValue: (p) => p.property_price,
    format: formatCurrency,
    higherIsBetter: false, // lower price wins
  },
  {
    label: "Monthly Cash Flow",
    getValue: (p) => p.monthly_cash_flow,
    format: formatCurrency,
    higherIsBetter: true,
  },
  {
    label: "CoC Return",
    getValue: (p) => p.cash_on_cash_return,
    format: (v) => formatPercent(v),
    higherIsBetter: true,
  },
  {
    label: "Cap Rate",
    // Derived: noi / price × 100 — computed fresh, not pulled from stored data
    getValue: (p) => (p.property_price > 0 ? (p.noi / p.property_price) * 100 : 0),
    format: (v) => formatPercent(v),
    higherIsBetter: true,
  },
  {
    label: "NOI",
    getValue: (p) => p.noi,
    format: formatCurrency,
    higherIsBetter: true,
  },
  {
    label: "Annual Cash Flow",
    getValue: (p) => p.annual_cash_flow,
    format: formatCurrency,
    higherIsBetter: true,
  },
  {
    label: "Monthly Rent",
    getValue: (p) => p.monthly_rent,
    format: formatCurrency,
    higherIsBetter: true,
  },
  {
    label: "Down Payment",
    // Derived: price × down_pct / 100
    getValue: (p) => (p.property_price * p.down_payment_percent) / 100,
    format: formatCurrency,
    higherIsBetter: false, // lower down payment wins
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ComparisonGridProps {
  properties: Property[];
}

export default function ComparisonGrid({ properties }: ComparisonGridProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse">
        {/* ── Column headers ────────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th
              scope="col"
              className="sticky left-0 z-10 w-36 min-w-[9rem] bg-gray-50 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              Metric
            </th>
            {properties.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="px-5 py-3 text-left text-sm font-semibold text-gray-900"
              >
                <span className="block max-w-[14rem] truncate" title={p.property_name}>
                  {p.property_name}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Metric rows ───────────────────────────────────────────────────── */}
        <tbody className="divide-y divide-gray-100">
          {METRIC_ROWS.map((row) => {
            const values = properties.map((p) => row.getValue(p));
            const winnerIdx = findRowWinner(values, row.higherIsBetter);

            return (
              <tr key={row.label} className="group">
                {/* Sticky label cell */}
                <td className="sticky left-0 z-10 w-36 min-w-[9rem] bg-white px-5 py-3.5 text-sm font-medium text-gray-600 group-hover:bg-gray-50">
                  {row.label}
                </td>

                {/* Value cells — read from pre-computed `values` to avoid double getValue */}
                {values.map((value, colIdx) => {
                  const p = properties[colIdx];
                  const isWinner = colIdx === winnerIdx;

                  return (
                    <td
                      key={p.id}
                      className={cn(
                        "px-5 py-3.5 font-mono text-sm tabular-nums group-hover:bg-gray-50",
                        isWinner
                          ? "font-semibold text-emerald-600"
                          : "text-gray-900"
                      )}
                    >
                      {value === null ? (
                        <span className="text-gray-400">N/A</span>
                      ) : (
                        row.format(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
