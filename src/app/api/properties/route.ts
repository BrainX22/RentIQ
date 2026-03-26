import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateAll } from "@/lib/calculations";
import { savePropertySchema } from "@/lib/validations";
import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";
import { canAccessProFeature, PLAN_LIMITS } from "@/lib/feature-gates";

function getCurrentMonthYear() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export async function GET(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/properties", "GET");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))) } }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error — failing open:", rlErr);
    }
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Explicit column list — user_id excluded (not needed by any client consumer)
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, property_name, property_price, down_payment_percent, interest_rate, loan_term_years, monthly_rent, property_tax_yearly, insurance_monthly, hoa_fees_monthly, maintenance_percent, vacancy_percent, monthly_cash_flow, annual_cash_flow, cash_on_cash_return, noi, monthly_mortgage, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Log full error server-side; return a generic message to the client
    console.error("[GET /api/properties] query error:", error.message);
    return NextResponse.json({ error: "Failed to load properties." }, { status: 400 });
  }

  return NextResponse.json({ properties: data ?? [] });
}

export async function POST(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/properties", "POST");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))) } }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error — failing open:", rlErr);
    }
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = savePropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { propertyName, inputs } = parsed.data;

  // Server-side recalculation — never trust client-sent results
  const results = calculateAll(inputs);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPro = canAccessProFeature(subscription?.plan_type ?? "free");
  const monthYear = getCurrentMonthYear();

  // Single atomic RPC: usage check + increment + property insert in one transaction.
  // If the insert fails for any reason, the usage increment rolls back automatically —
  // the user never loses a free save (eliminates the TOCTOU race condition).
  const { data: savedProperty, error: saveError } = await supabase.rpc(
    "save_property_atomic",
    {
      p_user_id: user.id,
      p_month_year: monthYear,
      p_max_count: PLAN_LIMITS.free.savesPerMonth,
      p_is_pro: isPro,
      p_property_name: propertyName,
      p_property_price: inputs.propertyPrice,
      p_down_payment_percent: inputs.downPaymentPercent,
      p_interest_rate: inputs.interestRate,
      p_loan_term_years: inputs.loanTermYears,
      p_monthly_rent: inputs.monthlyRent,
      p_property_tax_yearly: inputs.propertyTaxYearly,
      p_insurance_monthly: inputs.insuranceMonthly,
      p_hoa_fees_monthly: inputs.hoaFeesMonthly,
      p_maintenance_percent: inputs.maintenancePercent,
      p_vacancy_percent: inputs.vacancyPercent,
      p_monthly_cash_flow: results.monthlyCashFlow,
      p_annual_cash_flow: results.annualCashFlow,
      p_cash_on_cash_return: results.cashOnCashReturn,
      p_noi: results.noi,
      p_monthly_mortgage: results.monthlyMortgage,
    }
  );

  if (saveError) {
    if (saveError.message.includes("FREE_LIMIT_REACHED")) {
      return NextResponse.json(
        { error: "Free limit reached.", code: "FREE_LIMIT_REACHED" },
        { status: 403 }
      );
    }
    // Log full error server-side; return a generic message to the client
    console.error("[POST /api/properties] save error:", saveError.message);
    return NextResponse.json({ error: "Failed to save property." }, { status: 500 });
  }

  return NextResponse.json({ property: savedProperty }, { status: 201 });
}
