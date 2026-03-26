import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import { resolveRateLimiter, isRateLimitingEnabled } from "@/lib/rate-limit";

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
      const limiter = resolveRateLimiter("/api/billing-portal", "POST");
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

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 400 });
  }

  const customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer found for this account." },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not create billing portal session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
