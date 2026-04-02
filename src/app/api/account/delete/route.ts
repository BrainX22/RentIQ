import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelLsSubscription } from "@/lib/lemonsqueezy";
import {
  resolveRateLimiter,
  getClientIp,
  isRateLimitingEnabled,
  getAccountDeleteByUserLimiter,
} from "@/lib/rate-limit";
import { deleteAccountSchema } from "@/lib/validations";

/** Belt-and-suspenders CSRF check: Origin header must match Host.
 *  Supabase SameSite=Lax cookies already prevent most CSRF, but this
 *  adds an extra layer for mutation endpoints. */
function isCsrfSafe(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin) return true; // Same-origin browser requests omit Origin
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // ── Rate limiting (strict: 3/hour, IP-keyed) ────────────────────────────────
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

  // ── CSRF check ─────────────────────────────────────────────────────────────
  if (!isCsrfSafe(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Secondary rate limit: user-ID-keyed (1/24h) ────────────────────────────
  // Prevents IP rotation bypassing the per-IP limit for destructive endpoints.
  if (isRateLimitingEnabled()) {
    try {
      const userLimiter = getAccountDeleteByUserLimiter();
      const { success: userSuccess, reset: userReset } = await userLimiter.limit(user.id);
      if (!userSuccess) {
        return NextResponse.json(
          { error: "Too many deletion attempts. Please try again in 24 hours." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.max(0, Math.ceil((userReset - Date.now()) / 1000))
              ),
            },
          }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error on user-scoped check:", rlErr);
      // Fail open: don't block the request if Redis is unavailable
    }
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
      { error: "Type DELETE to confirm and provide your password." },
      { status: 400 }
    );
  }

  // ── Verify current password (H-1: re-auth before destructive action) ───────
  // Uses signInWithPassword to confirm identity before proceeding.
  // Magic link users without a password will see an error directing them to
  // set a password in Security Settings first.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: parsed.data.currentPassword,
  });

  if (authError) {
    return NextResponse.json(
      {
        error:
          "Incorrect password. If you sign in with magic links, set a password in Security Settings first.",
      },
      { status: 401 }
    );
  }

  // ── Cancel LemonSqueezy subscription if active ────────────────────────────
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("ls_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscription?.ls_subscription_id && subscription.status === "active") {
    const subId = subscription.ls_subscription_id;
    if (!/^\d+$/.test(subId)) {
      console.error("[account-delete] Malformed ls_subscription_id:", subId);
      return NextResponse.json(
        { error: "Could not cancel subscription. Please try again." },
        { status: 500 }
      );
    }
    try {
      await cancelLsSubscription(subId);
    } catch (lsErr) {
      console.error("[account-delete] LemonSqueezy cancel error:", lsErr);
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

  // ── Invalidate all sessions (H-1b) ─────────────────────────────────────────
  // Signs out all sessions for this user so stolen tokens can't be reused.
  // Hard-delete cleanup (after 30-day grace period) requires a cron job — TODO post-launch.
  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.deleteUser(user.id, true); // true = soft-delete (preserves auth record, revokes tokens)
  } catch (signOutErr) {
    // Non-fatal: profile is already soft-deleted. Log and continue.
    console.error("[account-delete] Session invalidation error:", signOutErr);
  }

  return NextResponse.json({ deleted: true });
}
