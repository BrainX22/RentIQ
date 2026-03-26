"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ComparisonGrid from "@/components/compare/ComparisonGrid";
import VerdictRow from "@/components/compare/VerdictRow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Property } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SELECTIONS = 4;
const MIN_SELECTIONS = 2;

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyPropertyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm text-gray-500">You haven&apos;t saved any properties yet.</p>
      <Button variant="outline" className="mt-4" onClick={onNavigate}>
        Analyze Your First Property
      </Button>
    </div>
  );
}

function InsufficientPropertiesState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm text-gray-500">
        Save at least 2 properties to compare them side-by-side.
      </p>
      <Button variant="outline" className="mt-4" onClick={onNavigate}>
        Add Another Property
      </Button>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

interface CompareClientProps {
  /** Properties already fetched and authorised server-side. */
  properties: Property[];
}

export default function CompareClient({ properties }: CompareClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      if (prev.size >= MAX_SELECTIONS) {
        toast.error(`You can compare at most ${MAX_SELECTIONS} properties at once.`);
        return prev;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (properties.length === 0) {
    return <EmptyPropertyState onNavigate={() => router.push("/calculator")} />;
  }

  if (properties.length < MIN_SELECTIONS) {
    return <InsufficientPropertiesState onNavigate={() => router.push("/calculator")} />;
  }

  // Stable reference — avoids unnecessary re-renders of ComparisonGrid / VerdictRow
  const selectedProperties = useMemo(
    () => properties.filter((p) => selectedIds.has(p.id)),
    [properties, selectedIds]
  );
  const canCompare = selectedProperties.length >= MIN_SELECTIONS;
  const atMax = selectedIds.size >= MAX_SELECTIONS;

  return (
    <>
      {/* Selection status bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">
          {selectedIds.size === 0
            ? "Click a property below to start."
            : `${selectedIds.size} of ${Math.min(properties.length, MAX_SELECTIONS)} selected`}
        </span>

        {atMax && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Max {MAX_SELECTIONS} reached
          </span>
        )}

        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Property selector cards */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {properties.map((p) => {
          const isSelected = selectedIds.has(p.id);
          const isDisabled = atMax && !isSelected;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleSelection(p.id)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border p-4 text-left transition-all duration-150",
                isSelected
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-300"
                  : isDisabled
                  ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50"
                  : "border-gray-200 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-gray-900" title={p.property_name}>
                  {p.property_name}
                </p>
                {isSelected && (
                  // aria-hidden: selection is already communicated via aria-pressed on the button
                  <span aria-hidden="true" className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-mono text-xs text-gray-500">
                {formatCurrency(p.property_price)}
              </p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-xs font-medium",
                  p.monthly_cash_flow >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {formatCurrency(p.monthly_cash_flow)}/mo
              </p>
            </button>
          );
        })}
      </div>

      {/* Comparison grid — visible once ≥2 selected */}
      {canCompare ? (
        <div>
          <ComparisonGrid properties={selectedProperties} />
          <VerdictRow properties={selectedProperties} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-400">
            Select at least {MIN_SELECTIONS} properties above to see the comparison.
          </p>
        </div>
      )}
    </>
  );
}
