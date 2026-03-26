import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessMaxFeature } from "@/lib/feature-gates";
import {
  resolveRateLimiter,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/rate-limit";
import { compsQuerySchema } from "@/lib/validations";
import { lookupFmr } from "@/lib/comps/fmr-lookup";

export async function GET(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/comps", "GET");
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
      { error: "Rental comps require a Max subscription." },
      { status: 403 }
    );
  }

  // ── Validate query params ──────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  // Use undefined (not null) when bedrooms is absent so the schema default of 2 applies.
  const rawBedrooms = searchParams.get("bedrooms");
  const parsed = compsQuerySchema.safeParse({
    zip_code: searchParams.get("zip_code"),
    bedrooms: rawBedrooms !== null ? rawBedrooms : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters: zip_code must be 5 digits, bedrooms must be 0–5." },
      { status: 400 }
    );
  }

  const { zip_code, bedrooms } = parsed.data;

  // ── Cache lookup ───────────────────────────────────────────────────────────
  const comps = await lookupFmr(zip_code, bedrooms);

  if (!comps) {
    return NextResponse.json({
      available: false,
      zip_code,
      bedrooms,
      message:
        "No market data available for this ZIP code. Run the seed script to populate HUD FMR data.",
    });
  }

  return NextResponse.json(comps);
}
