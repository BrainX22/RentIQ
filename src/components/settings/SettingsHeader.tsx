"use client";

import { calculateDaysRemaining } from "@/lib/profile-utils";
import { cn } from "@/lib/utils";

type PlanType = "free" | "pro" | "max";

interface SettingsHeaderProps {
  displayName: string;
  planType: PlanType;
  currentPeriodEnd: string | null;
}

const TIER_STYLES: Record<PlanType, string> = {
  free: "border-orange-200 bg-orange-50 text-orange-600",
  pro: "border-indigo-200 bg-indigo-50 text-indigo-600",
  max: "border-violet-200 bg-violet-50 text-violet-700",
};

const TIER_LABELS: Record<PlanType, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};

export default function SettingsHeader({
  displayName,
  planType,
  currentPeriodEnd,
}: SettingsHeaderProps) {
  const daysRemaining = calculateDaysRemaining(currentPeriodEnd);
  const showDays = planType !== "free" && currentPeriodEnd !== null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {displayName}
      </h1>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
            TIER_STYLES[planType]
          )}
        >
          {TIER_LABELS[planType]}
        </span>
        {showDays && (
          <span className="font-mono text-sm text-gray-500">
            {daysRemaining} days
          </span>
        )}
      </div>
    </div>
  );
}
