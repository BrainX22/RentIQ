"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import type { MonthlyActual, Property } from "@/types";

// ─── Pure helpers (exported for unit testing) ────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Returns true when actual cash flow falls below 80% of projected for
 * 2 or more *directly* consecutive months (no gaps allowed).
 *
 * Consecutive = month N and month N+1 (or Dec → Jan across a year boundary).
 */
export function isUnderperforming(
  actuals: MonthlyActual[],
  projectedCashFlow: number
): boolean {
  if (actuals.length < 2) return false;

  const sorted = [...actuals].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  let consecutiveCount = 0;
  let prevWasUnder = false;

  for (let i = 0; i < sorted.length; i++) {
    const actual = sorted[i];
    const actualCashFlow = actual.actual_rent - actual.actual_expenses;
    const isUnder = actualCashFlow < projectedCashFlow * 0.8;

    if (!isUnder) {
      consecutiveCount = 0;
      prevWasUnder = false;
      continue;
    }

    if (i > 0 && prevWasUnder) {
      const prev = sorted[i - 1];
      const directlyConsecutive =
        (actual.year === prev.year && actual.month === prev.month + 1) ||
        (actual.year === prev.year + 1 && prev.month === 12 && actual.month === 1);
      consecutiveCount = directlyConsecutive ? consecutiveCount + 1 : 1;
    } else {
      consecutiveCount = 1;
    }

    prevWasUnder = true;
    if (consecutiveCount >= 2) return true;
  }

  return false;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ActualsComparisonViewProps {
  property: Property;
  /** Increment this in the parent after a new actual is logged to trigger re-fetch. */
  refreshKey: number;
}

export default function ActualsComparisonView({
  property,
  refreshKey,
}: ActualsComparisonViewProps) {
  const [actuals, setActuals] = useState<MonthlyActual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchActuals = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}/actuals`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as { actuals?: MonthlyActual[]; error?: string };
      if (!res.ok) {
        setFetchError(payload.error ?? "Failed to load actuals.");
        return;
      }
      setActuals(payload.actuals ?? []);
    } catch {
      setFetchError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [property.id]);

  useEffect(() => {
    void fetchActuals();
  }, [fetchActuals, refreshKey]);

  const handleDelete = async (actualId: string) => {
    const ok = window.confirm("Delete this monthly actual? This cannot be undone.");
    if (!ok) return;

    setDeletingId(actualId);
    try {
      const res = await fetch(
        `/api/properties/${property.id}/actuals?actualId=${actualId}`,
        { method: "DELETE" }
      );
      const payload = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !payload.success) {
        toast.error(payload.error ?? "Failed to delete actual.");
        return;
      }
      setActuals((prev) => prev.filter((a) => a.id !== actualId));
      toast.success("Actual deleted.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const projectedCashFlow = property.monthly_cash_flow;
  const underperforming = isUnderperforming(actuals, projectedCashFlow);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    );
  }

  // ─── Fetch error ─────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <p className="py-3 text-center text-sm text-red-600">{fetchError}</p>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (actuals.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-gray-400">
        No actuals logged yet.{" "}
        <span className="font-medium text-gray-500">Click &ldquo;Log Actuals&rdquo;</span>{" "}
        to start tracking real performance.
      </p>
    );
  }

  // ─── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Underperformance alert */}
      {underperforming && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm">
          <TrendingDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div>
            <span className="font-semibold text-red-700">Underperforming</span>
            <span className="ml-1 text-red-600">
              — actual cash flow below 80% of projected for 2+ consecutive months.
            </span>
          </div>
        </div>
      )}

      {/* Actuals table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                Month
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Proj. CF
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Act. Rent
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Act. Exp
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Act. CF
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Variance
              </th>
              <th className="w-8 px-2 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {actuals.map((actual) => {
              const actualCashFlow = actual.actual_rent - actual.actual_expenses;
              const variance = actualCashFlow - projectedCashFlow;
              const isDeleting = deletingId === actual.id;
              const monthLabel = MONTH_NAMES[actual.month - 1] ?? String(actual.month);

              return (
                <tr
                  key={actual.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="px-3 py-2.5 font-medium text-gray-900">
                    {monthLabel} {actual.year}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-gray-400">
                    {formatCurrency(projectedCashFlow)}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                    {formatCurrency(actual.actual_rent)}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                    {formatCurrency(actual.actual_expenses)}
                  </td>

                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-mono font-semibold",
                      actualCashFlow >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(actualCashFlow)}
                  </td>

                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-mono font-semibold",
                      variance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {variance >= 0 ? "+" : ""}
                    {formatCurrency(variance)}
                  </td>

                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => void handleDelete(actual.id)}
                      disabled={isDeleting}
                      aria-label={`Delete actual for ${monthLabel} ${actual.year}`}
                      className="rounded p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes (only shown when at least one actual has notes) */}
      {(() => {
        const notedActuals = actuals.filter((a) => a.notes);
        return notedActuals.length > 0 ? (
          <div className="space-y-1">
            {notedActuals.map((a) => {
              const monthLabel = MONTH_NAMES[a.month - 1] ?? String(a.month);
              return (
                <p key={a.id} className="text-xs text-gray-400">
                  <span className="font-medium text-gray-500">
                    {monthLabel} {a.year}:
                  </span>{" "}
                  {a.notes}
                </p>
              );
            })}
          </div>
        ) : null;
      })()}
    </div>
  );
}
