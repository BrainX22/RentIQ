"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CalculatorInputs from "@/components/calculator/CalculatorInputs";
import CalculatorResults from "@/components/calculator/CalculatorResults";
import ExpenseBreakdown from "@/components/calculator/ExpenseBreakdown";
import ListingUrlImporter from "@/components/calculator/ListingUrlImporter";
import PropertyNameDialog from "@/components/calculator/PropertyNameDialog";
import RentalComps from "@/components/calculator/RentalComps";
import NeighborhoodScore from "@/components/calculator/NeighborhoodScore";
import PaywallModal from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { useCalculator } from "@/hooks/useCalculator";
import { useUser } from "@/hooks/useUser";
import { canAccessMaxFeature } from "@/lib/feature-gates";
import { createClient } from "@/lib/supabase/client";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PENDING_INPUTS_KEY = "rpc:pendingCalculatorInputs";

type PlanType = "free" | "pro" | "max";

export default function CalculatorPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const { inputs, setInput, setInputsBulk, results } = useCalculator();
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  /** Plan type — fetched once after auth resolves. Defaults to 'free'. */
  const [planType, setPlanType] = useState<PlanType>("free");
  /** Market median from RentalComps — passed to CalculatorResults annotation. */
  const [marketMedian, setMarketMedian] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_INPUTS_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<typeof inputs>;
      setInputsBulk(parsed);
      localStorage.removeItem(PENDING_INPUTS_KEY);
      toast.success("Restored your calculator inputs.");
    } catch {
      localStorage.removeItem(PENDING_INPUTS_KEY);
    }
  }, [setInputsBulk]);

  // Fetch the user's plan type once auth resolves so we can gate Max features.
  useEffect(() => {
    if (isUserLoading || !user) return;
    let isMounted = true;
    const supabase = createClient();
    supabase
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) console.error("[calculator] subscription fetch failed:", error.message);
        const raw = (data as { plan_type?: string } | null)?.plan_type;
        const resolved: PlanType =
          raw === "max" ? "max" : raw === "pro" ? "pro" : "free";
        setPlanType(resolved);
      });
    return () => { isMounted = false; };
  }, [user, isUserLoading]);

  const handleSaveClick = () => {
    if (!user) {
      localStorage.setItem(PENDING_INPUTS_KEY, JSON.stringify(inputs));
      router.push("/auth/login?next=/calculator");
      return;
    }
    setShowNameDialog(true);
  };

  const handleSaveProperty = async (propertyName: string) => {
    setIsSaving(true);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyName, inputs, results }),
      });

      const payload = (await res.json()) as { error?: string; code?: string };

      if (res.status === 403 && payload.code === "FREE_LIMIT_REACHED") {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) {
        toast.error(payload.error ?? "Could not save property.");
        return;
      }

      toast.success("Property saved successfully.");
      router.push("/dashboard");
    } catch {
      toast.error("Could not save property. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Rental Property Calculator
        </h1>
        <p className="mt-1.5 text-gray-500">
          Enter your property details below to instantly analyze your investment returns.
        </p>
      </div>

      <ListingUrlImporter onApply={setInputsBulk} />

      {/* Two-column layout */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <CalculatorInputs inputs={inputs} setInput={setInput} />
        </div>

        {/* Right: Results — sticky */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <CalculatorResults results={results} marketMedian={marketMedian} />
          <ExpenseBreakdown inputs={inputs} results={results} />

          {/* Rental Comps — Max tier only */}
          {canAccessMaxFeature(planType) && (
            <RentalComps
              monthlyRent={inputs.monthlyRent}
              onMedianFetched={setMarketMedian}
            />
          )}

          {/* Neighborhood Score — Max tier only */}
          {canAccessMaxFeature(planType) && (
            <NeighborhoodScore
              vacancyPercent={inputs.vacancyPercent}
              onApplySuggestion={(v) => setInput("vacancyPercent", v)}
            />
          )}

          <Button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="w-full gap-2 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Property"}
            {!user && <span className="ml-auto text-xs text-orange-200">(sign in to save)</span>}
          </Button>
        </div>
      </div>

      <PropertyNameDialog
        open={showNameDialog}
        onOpenChange={setShowNameDialog}
        onConfirm={handleSaveProperty}
      />
      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
