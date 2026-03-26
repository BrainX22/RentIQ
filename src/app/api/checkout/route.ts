import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import { resolveRateLimiter, isRateLimitingEnabled } from "@/lib/rate-limit";

const checkoutSchema = z.object({
  tier: z.enum(["pro", "max"]).default("pro"),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit keyed on user.id — IP-keyed limits are trivially bypassed with
  // proxy rotation for financial endpoints; user-scoped limits are meaningful.
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

  // Parse optional tier from request body; default to 'pro'.
  let tier: "pro" | "max" = "pro";
  try {
    const body = (await request.json()) as unknown;
    const parsed = checkoutSchema.safeParse(body);
    if (parsed.success) {
      tier = parsed.data.tier;
    }
  } catch {
    // Empty body or non-JSON — default to 'pro'.
  }

  const priceId =
    tier === "max"
      ? process.env.STRIPE_MAX_PRICE_ID
      : process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured." },
      { status: 500 }
    );
  }

  // Derive base URL from the incoming request so success/cancel URLs work
  // correctly in both local dev and production without an extra env var.
  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  // Re-use an existing Stripe customer to avoid duplicate customer records.
  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentPlan = existingSubscription?.plan_type ?? "free";

  // Guard: Max is the highest tier — nothing to upgrade to.
  if (currentPlan === "max") {
    return NextResponse.json(
      { error: "Already subscribed to Max." },
      { status: 409 }
    );
  }

  // Guard: already on Pro and not upgrading to Max.
  if (currentPlan === "pro" && tier === "pro") {
    return NextResponse.json(
      { error: "Already subscribed to Pro." },
      { status: 409 }
    );
  }

  const existingCustomerId = existingSubscription?.stripe_customer_id ?? null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // Use existing customer to avoid duplicate records; otherwise pass email.
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: user.email ?? undefined }),
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/calculator?checkout=canceled`,
    // user_id in metadata lets the webhook handler link Stripe events to Supabase.
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
