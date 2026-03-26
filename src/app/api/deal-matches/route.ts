import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessMaxFeature } from "@/lib/feature-gates";
import {
  resolveRateLimiter,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/rate-limit";
import { dismissMatchSchema } from "@/lib/validations";
import type { DealMatch } from "@/types";

export async function GET(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/deal-matches", "GET");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.max(0, Math.ceil((reset - Date.now()) / 1000))
              ),
            },
          }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error:", rlErr);
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Plan gate — Max only ───────────────────────────────────────────────────
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";

  if (
    !isActiveSubscription ||
    !canAccessMaxFeature(subscription?.plan_type ?? "free")
  ) {
    return NextResponse.json(
      { error: "Deal Finder requires a Max subscription." },
      { status: 403 }
    );
  }

  // ── Query deal_matches ─────────────────────────────────────────────────────
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: matches, error: queryError } = await supabase
    .from("deal_matches")
    .select("id, user_id, property_id, property_name, property_price, est_monthly_cash_flow, est_cash_on_cash_return, deal_score_value, deal_grade, matched_at, dismissed_at")
    .eq("user_id", user.id)
    .is("dismissed_at", null)
    .gt("matched_at", thirtyDaysAgo)
    .order("matched_at", { ascending: false })
    .limit(50);

  if (queryError) {
    console.error("[deal-matches] Query error:", queryError.code);
    return NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }

  return NextResponse.json({ data: { matches: (matches ?? []) as DealMatch[] } });
}

export async function PATCH(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/deal-matches", "PATCH");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.max(0, Math.ceil((reset - Date.now()) / 1000))
              ),
            },
          }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error:", rlErr);
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Plan gate — Max only ───────────────────────────────────────────────────
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";

  if (
    !isActiveSubscription ||
    !canAccessMaxFeature(subscription?.plan_type ?? "free")
  ) {
    return NextResponse.json(
      { error: "Deal Finder requires a Max subscription." },
      { status: 403 }
    );
  }

  // ── Validate body ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = dismissMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { matchId } = parsed.data;

  // ── Update dismissed_at ────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("deal_matches")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[deal-matches] Update error:", updateError.code);
    return NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }

  return NextResponse.json({ data: { dismissed: true } });
}
