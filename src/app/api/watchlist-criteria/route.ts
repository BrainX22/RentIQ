import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { watchlistCriteriaSchema } from "@/lib/validations";
import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function isMissingWatchlistTableError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (message.includes("watchlist_criteria") && message.includes("schema cache"))
  );
}


export async function GET(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/watchlist-criteria", "GET");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("watchlist_criteria")
    .select("id, user_id, city, max_price, min_target_return, email_digest")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isMissingWatchlistTableError(error)) {
    // Soft-fail so dashboard remains usable until DB schema is applied.
    return NextResponse.json({ criteria: null });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const criteria = data
    ? {
        city: data.city,
        maxPrice: data.max_price,
        minTargetReturn: data.min_target_return,
        emailDigest: data.email_digest,
      }
    : null;

  return NextResponse.json({ criteria });
}

export async function PUT(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/watchlist-criteria", "PUT");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = watchlistCriteriaSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const city = parsed.data.city?.trim() || null;
  const maxPrice = parsed.data.maxPrice ?? null;
  const minTargetReturn = parsed.data.minTargetReturn ?? null;
  const emailDigest = parsed.data.emailDigest ?? false;

  if (!city && maxPrice === null && minTargetReturn === null) {
    return NextResponse.json(
      { error: "Provide at least one watchlist criterion to save." },
      { status: 400 }
    );
  }

  const payload = {
    user_id: user.id,
    city,
    max_price: maxPrice,
    min_target_return: minTargetReturn,
    email_digest: emailDigest,
  };

  // Single atomic upsert — eliminates the SELECT-then-INSERT/UPDATE race condition (TOCTOU).
  const { data: row, error: upsertError } = await supabase
    .from("watchlist_criteria")
    .upsert(payload, { onConflict: "user_id" })
    .select("id, user_id, city, max_price, min_target_return, email_digest")
    .single();

  if (isMissingWatchlistTableError(upsertError)) {
    return NextResponse.json(
      {
        error:
          "watchlist_criteria table is missing in Supabase. Run the schema SQL, then retry.",
      },
      { status: 503 }
    );
  }

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  return NextResponse.json({
    criteria: {
      city: row.city,
      maxPrice: row.max_price,
      minTargetReturn: row.min_target_return,
      emailDigest: row.email_digest,
    },
  });
}
