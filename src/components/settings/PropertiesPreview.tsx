"use client";

import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewProperty {
  id: string;
  property_name: string;
  monthly_cash_flow: number;
  created_at: string;
}

interface PropertiesPreviewProps {
  properties: PreviewProperty[];
  totalCount: number;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCashFlow(value: number): string {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function PropertiesPreview({
  properties,
  totalCount,
}: PropertiesPreviewProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Your Properties
      </h2>

      {properties.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-gray-500">No properties saved yet.</p>
          <Link
            href="/calculator"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            <Calculator className="h-4 w-4" />
            Analyze your first deal
          </Link>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {properties.map((prop) => {
              const isPositive = prop.monthly_cash_flow >= 0;
              return (
                <Link
                  key={prop.id}
                  href="/dashboard"
                  className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <span className="min-w-0 truncate text-sm text-gray-900">
                    {prop.property_name}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "font-mono text-sm font-medium",
                        isPositive ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {formatCashFlow(prop.monthly_cash_flow)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatShortDate(prop.created_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalCount > properties.length && (
            <Link
              href="/dashboard"
              className="mt-3 flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              View all {totalCount} properties
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
