import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessMaxFeature } from "@/lib/feature-gates";
import {
  resolveRateLimiter,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/rate-limit";
import { neighborhoodQuerySchema } from "@/lib/validations";
import { lookupNeighborhood } from "@/lib/neighborhood/lookup";

export async function GET(request: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/neighborhood", "GET");
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
      { error: "Neighborhood scoring requires a Max subscription." },
      { status: 403 }
    );
  }

  // ── Validate query params ──────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const zipCodeParam = searchParams.get("zip_code");

  if (!zipCodeParam) {
    return NextResponse.json(
      { error: "zip_code is required." },
      { status: 400 }
    );
  }

  const parsed = neighborhoodQuerySchema.safeParse({ zip_code: zipCodeParam });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters: zip_code must be exactly 5 digits." },
      { status: 400 }
    );
  }

  const { zip_code } = parsed.data;

  // ── Neighborhood lookup ────────────────────────────────────────────────────
  const result = await lookupNeighborhood(zip_code);

  if (!result) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json(result);
}
