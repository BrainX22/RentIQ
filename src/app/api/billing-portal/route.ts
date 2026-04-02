import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import { resolveRateLimiter, isRateLimitingEnabled } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    .select("ls_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("[billing-portal] Subscription lookup error:", subscriptionError.message);
    return NextResponse.json({ error: "Could not retrieve subscription." }, { status: 400 });
  }

  const subscriptionId = subscription?.ls_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
  }

  try {
    const url = await getCustomerPortalUrl(subscriptionId);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[billing-portal] LemonSqueezy error:", error);
    return NextResponse.json({ error: "Could not create billing portal session." }, { status: 500 });
  }
}
