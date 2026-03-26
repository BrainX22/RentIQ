"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, ClipboardList, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateDealScore } from "@/lib/calculations";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { Property } from "@/types";
import ActualsComparisonView from "@/components/dashboard/ActualsComparisonView";
import LogActualsModal from "@/components/dashboard/LogActualsModal";

interface PropertyCardProps {
  property: Property;
  onDelete?: (id: string) => Promise<void> | void;
  /** Plan tier of the current user. Defaults to 'free'. Used to gate Portfolio Tracking. */
  planType?: "free" | "pro" | "max";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function PropertyCard({
  property,
  onDelete,
  planType = "free",
}: PropertyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogActualsOpen, setIsLogActualsOpen] = useState(false);
  const [actualsRefreshKey, setActualsRefreshKey] = useState(0);

  const cashFlowPositive = property.monthly_cash_flow >= 0;
  const isMaxUser = planType === "max";

  const dealScore = useMemo(
    () =>
      calculateDealScore({
        monthlyCashFlow: property.monthly_cash_flow,
        cashOnCashReturn: property.cash_on_cash_return,
        capRate: property.property_price > 0 ? (property.noi / property.property_price) * 100 : 0,
      }),
    [property]
  );

  const handleDelete = async () => {
    const ok = window.confirm(`Delete "${property.property_name}"? This action cannot be undone.`);
    if (!ok || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(property.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* ── Card header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{property.property_name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Added {formatDate(property.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              cashFlowPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}
          >
            {cashFlowPositive ? "Cash Flow +" : "Cash Flow -"}
          </div>
          <div className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
            Score {dealScore.grade}
          </div>
        </div>
      </div>

      {/* ── Key metrics grid ─────────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Monthly Cash Flow</p>
          <p
            className={cn(
              "mt-1 font-mono text-base font-semibold",
              cashFlowPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {formatCurrency(property.monthly_cash_flow)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Cash-on-Cash</p>
          <p className="mt-1 font-mono text-base font-semibold text-gray-900">
            {property.cash_on_cash_return === null
              ? "N/A"
              : formatPercent(property.cash_on_cash_return)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Monthly Rent</p>
          <p className="mt-1 font-mono text-base font-semibold text-gray-900">
            {formatCurrency(property.monthly_rent)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Property Price</p>
          <p className="mt-1 font-mono text-base font-semibold text-gray-900">
            {formatCurrency(property.property_price)}
          </p>
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-1"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? "Hide Details" : "View Details"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
          disabled={!onDelete || isDeleting}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      {/* ── Expanded section ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Financial detail metrics */}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <div>
              <dt className="text-gray-400">Annual Cash Flow</dt>
              <dd className="font-mono text-gray-900">{formatCurrency(property.annual_cash_flow)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">NOI (Annual)</dt>
              <dd className="font-mono text-gray-900">{formatCurrency(property.noi)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Down Payment %</dt>
              <dd className="font-mono text-gray-900">{formatPercent(property.down_payment_percent)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Interest Rate</dt>
              <dd className="font-mono text-gray-900">{formatPercent(property.interest_rate)}</dd>
            </div>
          </dl>

          {/* Portfolio Tracking — Max users only */}
          {isMaxUser && (
            <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-violet-600" />
                  <h4 className="text-sm font-semibold text-gray-800">Monthly Actuals</h4>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 border-violet-200 px-2.5 text-xs text-violet-700 hover:bg-violet-50"
                  onClick={() => setIsLogActualsOpen(true)}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Log Actuals
                </Button>
              </div>

              <ActualsComparisonView
                property={property}
                refreshKey={actualsRefreshKey}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Log Actuals Modal (Max only, rendered outside expanded guard) ────── */}
      {isMaxUser && (
        <LogActualsModal
          open={isLogActualsOpen}
          onOpenChange={setIsLogActualsOpen}
          propertyId={property.id}
          onSuccess={() => setActualsRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
