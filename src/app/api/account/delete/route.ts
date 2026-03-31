import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import {
  resolveRateLimiter,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/rate-limit";
import { deleteAccountSchema } from "@/lib/validations";

export async function POST(request: Request) {
  // ── Rate limiting (strict: 3/hour) ──────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/account/delete", "POST");
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

  // ── Validate body ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type DELETE to confirm." },
      { status: 400 }
    );
  }

  // ── Cancel Stripe subscription if active ───────────────────────────────────
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    subscription?.stripe_subscription_id &&
    subscription.status === "active"
  ) {
    const subId = subscription.stripe_subscription_id;
    if (!/^sub_[a-zA-Z0-9]+$/.test(subId)) {
      console.error("[account-delete] Malformed stripe_subscription_id:", subId);
      return NextResponse.json(
        { error: "Could not cancel subscription. Please try again." },
        { status: 500 }
      );
    }
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (stripeErr) {
      console.error("[account-delete] Stripe cancel error:", stripeErr);
      return NextResponse.json(
        { error: "Could not cancel subscription. Please try again." },
        { status: 500 }
      );
    }
  }

  // ── Update subscription to canceled + free ──────────────────────────────────
  if (subscription) {
    const { error: subUpdateError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", plan_type: "free" })
      .eq("user_id", user.id);

    if (subUpdateError) {
      console.error(
        "[account-delete] Subscription update error:",
        subUpdateError.message
      );
    }
  }

  // ── Soft-delete user profile ────────────────────────────────────────────────
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (profileError) {
    console.error(
      "[account-delete] Profile soft-delete error:",
      profileError.message
    );
    return NextResponse.json(
      { error: "Could not delete account. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
