import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutUrl } from "@/lib/lemonsqueezy";
import { resolveRateLimiter, isRateLimitingEnabled } from "@/lib/rate-limit";

const checkoutSchema = z.object({
  tier: z.enum(["pro", "max"]).default("pro"),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/checkout", "POST");
      const { success, reset } = await limiter.limit(user.id);
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

  let tier: "pro" | "max" = "pro";
  try {
    const body = (await request.json()) as unknown;
    const parsed = checkoutSchema.safeParse(body);
    if (parsed.success) tier = parsed.data.tier;
  } catch {
    // Empty body or non-JSON — default to 'pro'
  }

  const variantId = tier === "max"
    ? process.env.LEMONSQUEEZY_MAX_VARIANT_ID
    : process.env.LEMONSQUEEZY_PRO_VARIANT_ID;

  if (!variantId) {
    return NextResponse.json({ error: "Payment configuration error." }, { status: 500 });
  }

  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentPlan = existingSubscription?.plan_type ?? "free";

  if (currentPlan === "max") {
    return NextResponse.json({ error: "Already subscribed to Max." }, { status: 409 });
  }
  if (currentPlan === "pro" && tier === "pro") {
    return NextResponse.json({ error: "Already subscribed to Pro." }, { status: 409 });
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  try {
    const url = await createCheckoutUrl(variantId, user.email ?? "", user.id, origin);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[checkout] LemonSqueezy error:", error);
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }
}
