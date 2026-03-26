import { NextResponse } from "next/server";
import { calculateDealScore } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";
import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";

interface DigestCriteria {
  city: string | null;
  max_price: number | null;
  min_target_return: number | null;
}

interface DigestProperty {
  id: string;
  property_name: string;
  property_price: number;
  monthly_cash_flow: number;
  cash_on_cash_return: number | null;
  noi: number;
  created_at: string;
}

const DIGEST_WINDOW_HOURS = 24;

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function isMissingWatchlistTableError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (message.includes("watchlist_criteria") && message.includes("schema cache"))
  );
}

function createdSinceIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export async function GET(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/daily-digest", "GET");
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

  const [{ data: criteria, error: criteriaError }, { data: recentProperties, error: propertiesError }] =
    await Promise.all([
      supabase
        .from("watchlist_criteria")
        .select("city, max_price, min_target_return")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<DigestCriteria>(),
      supabase
        .from("properties")
        .select(
          "id, property_name, property_price, monthly_cash_flow, cash_on_cash_return, noi, created_at"
        )
        .eq("user_id", user.id)
        .gte("created_at", createdSinceIso(DIGEST_WINDOW_HOURS))
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (criteriaError && !isMissingWatchlistTableError(criteriaError)) {
    return NextResponse.json({ error: criteriaError.message }, { status: 400 });
  }

  if (propertiesError) {
    return NextResponse.json({ error: propertiesError.message }, { status: 400 });
  }

  const properties = (recentProperties ?? []) as DigestProperty[];
  const notes: string[] = [];

  const normalizedCriteria = isMissingWatchlistTableError(criteriaError) ? null : criteria;

  if (!normalizedCriteria) {
    const notes = ["Save watchlist criteria to enable daily matching."];
    if (isMissingWatchlistTableError(criteriaError)) {
      notes.push("watchlist_criteria table is not set up yet in Supabase.");
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windowHours: DIGEST_WINDOW_HOURS,
      totalNewProperties: properties.length,
      matches: [],
      criteria: null,
      notes,
    });
  }

  if (normalizedCriteria.city) {
    notes.push("City filtering uses property name text matching in v1.");
  }

  const matches = properties
    .filter((property) => {
      const matchesPrice =
        normalizedCriteria.max_price === null || property.property_price <= normalizedCriteria.max_price;
      const matchesReturn =
        normalizedCriteria.min_target_return === null ||
        (property.cash_on_cash_return ?? 0) >= normalizedCriteria.min_target_return;
      const matchesCity =
        !normalizedCriteria.city ||
        property.property_name.toLowerCase().includes(normalizedCriteria.city.toLowerCase());

      return matchesPrice && matchesReturn && matchesCity;
    })
    .map((property) => {
      const capRate =
        property.property_price > 0 ? (property.noi / property.property_price) * 100 : 0;
      const score = calculateDealScore({
        monthlyCashFlow: property.monthly_cash_flow,
        cashOnCashReturn: property.cash_on_cash_return,
        capRate,
      });

      return {
        id: property.id,
        propertyName: property.property_name,
        createdAt: property.created_at,
        propertyPrice: property.property_price,
        monthlyCashFlow: property.monthly_cash_flow,
        cashOnCashReturn: property.cash_on_cash_return,
        dealGrade: score.grade,
        dealScore: score.score,
      };
    });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    windowHours: DIGEST_WINDOW_HOURS,
    totalNewProperties: properties.length,
    matches,
    criteria: {
      city: normalizedCriteria.city,
      maxPrice: normalizedCriteria.max_price,
      minTargetReturn: normalizedCriteria.min_target_return,
    },
    notes,
  });
}
