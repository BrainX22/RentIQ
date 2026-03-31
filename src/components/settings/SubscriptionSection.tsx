"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { calculateDaysRemaining } from "@/lib/profile-utils";

type PlanType = "free" | "pro" | "max";

interface SubscriptionSectionProps {
  planType: PlanType;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  savesThisMonth: number;
  totalProperties: number;
}

const PLAN_PRICES: Record<PlanType, string> = {
  free: "$0",
  pro: "$9/mo",
  max: "$19/mo",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function SubscriptionSection({
  planType,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  cancelAt,
  savesThisMonth,
  totalProperties,
}: SubscriptionSectionProps) {
  const [isOpening, setIsOpening] = useState(false);
  const daysRemaining = calculateDaysRemaining(currentPeriodEnd);
  const isCanceling = cancelAtPeriodEnd || !!cancelAt;
  const scheduledEnd = cancelAt ?? currentPeriodEnd;
  const isPaid = planType === "pro" || planType === "max";

  const handleManageSubscription = async () => {
    setIsOpening(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const payload = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !payload.url) {
        toast.error(payload.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = payload.url;
    } catch {
      toast.error("Could not open billing portal. Please try again.");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Subscription
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Plan</span>
          <span className="text-sm font-semibold text-gray-900">
            {planType.charAt(0).toUpperCase() + planType.slice(1)} — {PLAN_PRICES[planType]}
          </span>
        </div>

        {isPaid && scheduledEnd && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {isCanceling ? "Cancels on" : "Renews on"}
            </span>
            <span className={`font-mono text-sm ${isCanceling ? "text-red-600" : "text-gray-900"}`}>
              {formatDate(scheduledEnd)}{" "}
              <span className="text-gray-400">({daysRemaining} days)</span>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Saves this month</span>
          <span className="font-mono text-sm text-gray-900">
            {planType === "free" ? `${savesThisMonth} of 5` : savesThisMonth}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Properties</span>
          <span className="font-mono text-sm text-gray-900">
            {totalProperties} total properties
          </span>
        </div>

        <div className="pt-2">
          {isPaid ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleManageSubscription()}
              disabled={isOpening}
            >
              {isOpening ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          ) : (
            <Link
              href="/#pricing"
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Upgrade to Pro or Max
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
