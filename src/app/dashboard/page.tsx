"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PropertyCard from "@/components/dashboard/PropertyCard";
import PropertyCardSkeleton from "@/components/dashboard/PropertyCardSkeleton";
import EmptyState from "@/components/dashboard/EmptyState";
import DashboardSummaryRow from "@/components/dashboard/DashboardSummaryRow";
import NewMatchesFeed from "@/components/dashboard/NewMatchesFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Property } from "@/types";

type PlanType = "free" | "pro" | "max";

interface SubscriptionSummary {
  plan_type: PlanType;
  cancel_at_period_end?: boolean;
  cancel_at?: string | null;
  current_period_end?: string | null;
}

function getCurrentMonthYear() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatCancelDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();

  const [properties, setProperties] = useState<Property[]>([]);
  const [planType, setPlanType] = useState<PlanType>("free");
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [watchlistCity, setWatchlistCity] = useState("");
  const [watchlistMaxPrice, setWatchlistMaxPrice] = useState("");
  const [watchlistMinTargetReturn, setWatchlistMinTargetReturn] = useState("");
  const [emailDigest, setEmailDigest] = useState(false);
  /** Mirrors what is actually persisted in DB — used to detect unsaved changes. */
  const [savedWatchlistCriteria, setSavedWatchlistCriteria] = useState<{
    city: string;
    maxPrice: string;
    minTargetReturn: string;
    emailDigest: boolean;
  } | null>(null);
  const [isSavingWatchlist, setIsSavingWatchlist] = useState(false);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

  const hasUnsavedChanges = useMemo(() => {
    if (!savedWatchlistCriteria) {
      // Nothing saved yet — enable Save only when at least one field has a value
      return (
        watchlistCity.trim() !== "" ||
        watchlistMaxPrice.trim() !== "" ||
        watchlistMinTargetReturn.trim() !== "" ||
        emailDigest   // allow saving email-only preference
      );
    }
    return (
      watchlistCity !== savedWatchlistCriteria.city ||
      watchlistMaxPrice !== savedWatchlistCriteria.maxPrice ||
      watchlistMinTargetReturn !== savedWatchlistCriteria.minTargetReturn ||
      emailDigest !== savedWatchlistCriteria.emailDigest
    );
  }, [watchlistCity, watchlistMaxPrice, watchlistMinTargetReturn, emailDigest, savedWatchlistCriteria]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Fire both API fetches concurrently
      const [res, criteriaRes] = await Promise.all([
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/watchlist-criteria", { cache: "no-store" }),
      ]);

      const payload = (await res.json()) as { error?: string; properties?: Property[] };

      if (res.status === 401) {
        router.replace("/auth/login?next=/dashboard");
        return;
      }

      if (!res.ok) {
        toast.error(payload.error ?? "Could not load dashboard properties.");
        return;
      }

      setProperties(payload.properties ?? []);

      const criteriaPayload = (await criteriaRes.json()) as {
        error?: string;
        criteria?: { city: string | null; maxPrice: number | null; minTargetReturn: number | null; emailDigest?: boolean } | null;
      };

      if (!criteriaRes.ok) {
        toast.error(criteriaPayload.error ?? "Could not load watchlist criteria.");
      } else if (criteriaPayload.criteria) {
        const city = criteriaPayload.criteria.city ?? "";
        const maxPrice =
          typeof criteriaPayload.criteria.maxPrice === "number"
            ? String(criteriaPayload.criteria.maxPrice)
            : "";
        const minTargetReturn =
          typeof criteriaPayload.criteria.minTargetReturn === "number"
            ? String(criteriaPayload.criteria.minTargetReturn)
            : "";
        const loadedEmailDigest = criteriaPayload.criteria.emailDigest ?? false;
        setWatchlistCity(city);
        setWatchlistMaxPrice(maxPrice);
        setWatchlistMinTargetReturn(minTargetReturn);
        setEmailDigest(loadedEmailDigest);
        setSavedWatchlistCriteria({ city, maxPrice, minTargetReturn, emailDigest: loadedEmailDigest });
      }

      const supabase = createClient();
      const monthYear = getCurrentMonthYear();

      const [{ data: subscription, error: subError }, { data: usage, error: usageError }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan_type, cancel_at_period_end, cancel_at, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle<SubscriptionSummary>(),
        supabase
          .from("usage_tracking")
          .select("calculation_count")
          .eq("user_id", user.id)
          .eq("month_year", monthYear)
          .maybeSingle(),
      ]);

      if (subError) {
        console.error("[dashboard] subscription fetch error:", subError.message);
        toast.error("Could not load subscription details.");
      }

      if (usageError) {
        console.error("[dashboard] usage fetch error:", usageError.message);
        toast.error("Could not load usage information.");
      }

      const rawPlan = subscription?.plan_type;
      const currentPlan: PlanType =
        rawPlan === "max" ? "max" : rawPlan === "pro" ? "pro" : "free";
      setPlanType(currentPlan);
      setCancelAtPeriodEnd(Boolean(subscription?.cancel_at_period_end));
      setCancelAt(subscription?.cancel_at ?? null);
      setCurrentPeriodEnd(subscription?.current_period_end ?? null);
      setUsageCount(usage?.calculation_count ?? 0);
    } catch {
      toast.error("Could not load dashboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router, user]);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.replace("/auth/login?next=/dashboard");
      return;
    }

    void loadDashboard();
  }, [isUserLoading, loadDashboard, router, user]);

  const handleDeleteProperty = async (id: string) => {
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok || !payload.success) {
        toast.error(payload.error ?? "Failed to delete property.");
        return;
      }

      setProperties((prev) => prev.filter((item) => item.id !== id));
      toast.success("Property deleted.");
    } catch {
      toast.error("Failed to delete property. Please try again.");
    }
  };

  const handleSaveWatchlist = async () => {
    setIsSavingWatchlist(true);

    try {
      const maxPriceValue = watchlistMaxPrice.trim() === "" ? null : Number(watchlistMaxPrice);
      const minTargetReturnValue =
        watchlistMinTargetReturn.trim() === "" ? null : Number(watchlistMinTargetReturn);

      if (
        (maxPriceValue !== null && !Number.isFinite(maxPriceValue)) ||
        (minTargetReturnValue !== null && !Number.isFinite(minTargetReturnValue))
      ) {
        toast.error("Enter valid numeric values for price and target return.");
        return;
      }

      const res = await fetch("/api/watchlist-criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: watchlistCity,
          maxPrice: maxPriceValue,
          minTargetReturn: minTargetReturnValue,
          emailDigest,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        criteria?: { city: string | null; maxPrice: number | null; minTargetReturn: number | null; emailDigest: boolean };
      };

      if (!res.ok) {
        toast.error(payload.error ?? "Could not save watchlist criteria.");
        return;
      }

      if (payload.criteria) {
        const city = payload.criteria.city ?? "";
        const maxPrice =
          typeof payload.criteria.maxPrice === "number" ? String(payload.criteria.maxPrice) : "";
        const minTargetReturn =
          typeof payload.criteria.minTargetReturn === "number"
            ? String(payload.criteria.minTargetReturn)
            : "";
        setWatchlistCity(city);
        setWatchlistMaxPrice(maxPrice);
        setWatchlistMinTargetReturn(minTargetReturn);
        setSavedWatchlistCriteria({
          city,
          maxPrice,
          minTargetReturn,
          emailDigest: payload.criteria?.emailDigest ?? emailDigest
        });
      }

      toast.success("Watchlist criteria saved.");
    } catch {
      toast.error("Could not save watchlist criteria. Please try again.");
    } finally {
      setIsSavingWatchlist(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningBillingPortal(true);

    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
      });

      const payload = (await res.json()) as { error?: string; url?: string };

      if (!res.ok || !payload.url) {
        toast.error(payload.error ?? "Could not open billing portal.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      toast.error("Could not open billing portal. Please try again.");
    } finally {
      setIsOpeningBillingPortal(false);
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-96 animate-pulse rounded-md bg-gray-100" />
        </div>
        {/* Property card skeletons */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const scheduledCancelDate = cancelAt ?? (cancelAtPeriodEnd ? currentPeriodEnd : null);
  const cancelDateLabel = formatCancelDate(scheduledCancelDate);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your Saved Properties</h1>
          <p className="mt-1.5 text-gray-500">
            Track your rental deals, compare outcomes, and prune underperforming properties.
          </p>
        </div>

        {planType === "pro" || planType === "max" ? (
          <div className="flex items-center gap-2">
            {planType === "max" ? (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700">
                {cancelDateLabel ? `Max - cancels on ${cancelDateLabel}` : "Max"}
              </span>
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                {cancelDateLabel ? `Pro - cancels on ${cancelDateLabel}` : "Pro"}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isOpeningBillingPortal}
            >
              {isOpeningBillingPortal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </div>
        ) : (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold tracking-wide text-orange-600">
            {usageCount} of 5 free saves used this month
          </span>
        )}
      </div>

      <NewMatchesFeed planType={planType} />

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Watchlist Criteria</h2>
          <p className="text-sm text-gray-500">
            Save your deal filters to quickly evaluate if a listing matches your target profile.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            This saves search criteria only. Property analyses are saved from the Calculator page.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="watchlist-city">City</Label>
            <Input
              id="watchlist-city"
              value={watchlistCity}
              onChange={(e) => setWatchlistCity(e.target.value)}
              placeholder="Austin"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchlist-max-price">Max Price</Label>
            <Input
              id="watchlist-max-price"
              type="number"
              min={0}
              value={watchlistMaxPrice}
              onChange={(e) => setWatchlistMaxPrice(e.target.value)}
              placeholder="400000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchlist-min-target-return">Min Target Return (%)</Label>
            <Input
              id="watchlist-min-target-return"
              type="number"
              min={0}
              step={0.1}
              value={watchlistMinTargetReturn}
              onChange={(e) => setWatchlistMinTargetReturn(e.target.value)}
              placeholder="10"
            />
          </div>
        </div>

        {planType === "max" && (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              id="email-digest"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="email-digest" className="text-sm text-gray-600">
              Email me daily when new A/B deals are found
            </label>
          </div>
        )}

        {/* Active filters summary — only shown when criteria are persisted in DB */}
        {savedWatchlistCriteria &&
          (savedWatchlistCriteria.city ||
            savedWatchlistCriteria.maxPrice ||
            savedWatchlistCriteria.minTargetReturn) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Active filters:</span>
              {savedWatchlistCriteria.city && (
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  {savedWatchlistCriteria.city}
                </span>
              )}
              {savedWatchlistCriteria.maxPrice && (
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  ≤ {formatCurrency(Number(savedWatchlistCriteria.maxPrice))}
                </span>
              )}
              {savedWatchlistCriteria.minTargetReturn && (
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  ≥ {savedWatchlistCriteria.minTargetReturn}% CoC
                </span>
              )}
            </div>
          )}

        <Button
          type="button"
          onClick={handleSaveWatchlist}
          disabled={isSavingWatchlist || !hasUnsavedChanges}
          className={cn(
            "mt-4 gap-1.5",
            hasUnsavedChanges
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "cursor-default bg-gray-100 text-gray-500 hover:bg-gray-100"
          )}
        >
          {isSavingWatchlist ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : hasUnsavedChanges ? (
            "Save Watchlist Filters"
          ) : (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          )}
        </Button>
      </section>

      {planType === "max" && properties.length > 0 && (
        <div className="mb-6">
          <DashboardSummaryRow properties={properties} />
        </div>
      )}

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onDelete={handleDeleteProperty}
              planType={planType}
            />
          ))}
        </div>
      )}
    </div>
  );
}
