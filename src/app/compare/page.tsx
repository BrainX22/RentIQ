// ─── Server Component ─────────────────────────────────────────────────────────
// Auth check, plan-type gate, and data fetch ALL happen server-side so the Pro
// gate cannot be bypassed via React DevTools or a tampered client-side request.

import { redirect } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canAccessProFeature } from "@/lib/feature-gates";
import CompareClient from "@/components/compare/CompareClient";
import PaywallModalTrigger from "@/components/compare/PaywallModalTrigger";
import type { Property } from "@/types";

// ─── Pro upsell (rendered server-side — no property data served) ──────────────

function ProUpsellSection() {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-10 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
        <GitCompareArrows className="h-7 w-7 text-indigo-600" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">
        Property Comparison is a Pro Feature
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        Upgrade to Pro to compare up to 4 saved properties side-by-side with
        row-level winner highlighting and a weighted deal score.
      </p>
      {/* Thin client boundary — just triggers the PaywallModal on click */}
      <PaywallModalTrigger />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComparePage() {
  const supabase = await createClient();

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/compare");
  }

  // ── Plan gate (server-side — cannot be bypassed by the client) ───────────────
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle<{ plan_type: string }>();

  const isPro = canAccessProFeature(subscription?.plan_type ?? "free");

  if (!isPro) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Compare Properties</h1>
          <p className="mt-1.5 text-gray-500">Evaluate your saved deals side-by-side.</p>
        </div>
        <ProUpsellSection />
      </div>
    );
  }

  // ── Data fetch (only reached by Pro/Max users) ────────────────────────────────
  // Explicit column list — user_id excluded to avoid leaking it to the client
  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, property_name, property_price, down_payment_percent, interest_rate, loan_term_years, monthly_rent, property_tax_yearly, insurance_monthly, hoa_fees_monthly, maintenance_percent, vacancy_percent, monthly_cash_flow, annual_cash_flow, cash_on_cash_return, noi, monthly_mortgage, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Cast is safe: the explicit select matches every field on Property except user_id,
  // which is only needed server-side for the .eq() filter above.
  const safeProperties = (properties ?? []) as Property[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Compare Properties</h1>
        <p className="mt-1.5 text-gray-500">
          Select 2–4 saved properties to compare them side-by-side.
        </p>
      </div>
      <CompareClient properties={safeProperties} />
    </div>
  );
}
