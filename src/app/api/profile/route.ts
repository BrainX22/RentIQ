import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  resolveRateLimiter,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/rate-limit";
import { displayNameSchema } from "@/lib/validations";
import { deriveDisplayName, detectAuthProvider } from "@/lib/profile-utils";

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

function getCurrentMonthYear(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/profile", "GET");
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

  // ── Fetch or lazy-create profile ──────────────────────────────────────────
  const { data: existingProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError) {
    console.error("[profile] Fetch error:", profileError.message);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500 }
    );
  }

  let displayName: string;
  let profileCreatedAt: string = user.created_at;

  if (existingProfile) {
    displayName = existingProfile.display_name;
    profileCreatedAt = existingProfile.created_at;
  } else {
    // Lazy create
    displayName = deriveDisplayName(user.email ?? "");
    const { data: newProfile, error: insertError } = await supabase
      .from("user_profiles")
      .insert({ user_id: user.id, display_name: displayName })
      .select("display_name, created_at")
      .single();

    if (insertError || !newProfile) {
      console.error("[profile] Insert error:", insertError?.message);
      return NextResponse.json(
        { error: "Could not create profile." },
        { status: 500 }
      );
    }

    displayName = newProfile.display_name;
    profileCreatedAt = newProfile.created_at;

    // Sync to user_metadata for Navbar access
    await supabase.auth.updateUser({ data: { display_name: displayName } });
  }

  // ── Fetch subscription, usage, properties in parallel ─────────────────────
  const monthYear = getCurrentMonthYear();

  const [subResult, usageResult, recentResult, countResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "plan_type, status, current_period_end, cancel_at_period_end, cancel_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("usage_tracking")
      .select("calculation_count")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .maybeSingle(),
    supabase
      .from("properties")
      .select("id, property_name, monthly_cash_flow, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (subResult.error) {
    console.error(
      "[profile] Subscription fetch error:",
      subResult.error.message
    );
  }
  if (usageResult.error) {
    console.error("[profile] Usage fetch error:", usageResult.error.message);
  }

  const sub = subResult.data;
  const authProvider = detectAuthProvider(
    user.app_metadata as Record<string, unknown> | undefined
  );

  return NextResponse.json(
    {
      profile: {
        display_name: displayName,
        email: user.email ?? "",
        created_at: profileCreatedAt ?? user.created_at,
        auth_provider: authProvider,
      },
      subscription: {
        plan_type: sub?.plan_type ?? "free",
        status: sub?.status ?? "active",
        current_period_end: sub?.current_period_end ?? null,
        cancel_at_period_end: sub?.cancel_at_period_end ?? false,
        cancel_at: sub?.cancel_at ?? null,
      },
      usage: {
        saves_this_month: usageResult.data?.calculation_count ?? 0,
        total_properties: countResult.count ?? 0,
      },
      recent_properties: recentResult.data ?? [],
    },
    {
      headers: { "Cache-Control": "no-store, private" },
    }
  );
}

export async function PATCH(request: Request): Promise<NextResponse> {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/profile", "PATCH");
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

  const parsed = displayNameSchema.safeParse(body);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid display name.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { display_name } = parsed.data;

  // ── Update profile ─────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ display_name })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (updateError) {
    console.error("[profile] Update error:", updateError.message);
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 }
    );
  }

  // Sync to user_metadata for instant Navbar access
  await supabase.auth.updateUser({ data: { display_name } });

  return NextResponse.json({ profile: { display_name } });
}
