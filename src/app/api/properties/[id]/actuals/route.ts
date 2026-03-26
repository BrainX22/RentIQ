import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema, monthlyActualSchema } from "@/lib/validations";
import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";
import { canAccessMaxFeature } from "@/lib/feature-gates";

const ACTUALS_SELECT =
  "id, property_id, user_id, month, year, actual_rent, actual_expenses, notes, created_at";

// ─── Shared rate-limit helper ────────────────────────────────────────────────

async function applyRateLimit(
  request: Request,
  method: string
): Promise<NextResponse | null> {
  if (!isRateLimitingEnabled()) return null;
  try {
    const limiter = resolveRateLimiter("/api/properties/[id]/actuals", method);
    const ip = getClientIp(request.headers);
    const { success, reset } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
          },
        }
      );
    }
  } catch (rlErr) {
    console.error("[rate-limit] Redis error — failing open:", rlErr);
  }
  return null;
}

// ─── GET /api/properties/[id]/actuals ───────────────────────────────────────

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request, "GET");
  if (rateLimitResponse) return rateLimitResponse;

  const { id: propertyId } = await context.params;

  if (!uuidSchema.safeParse(propertyId).success) {
    return NextResponse.json({ error: "Invalid property ID." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canAccessMaxFeature(subscription?.plan_type ?? "free")) {
    return NextResponse.json(
      { error: "Max subscription required." },
      { status: 403 }
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("monthly_actuals")
    .select(ACTUALS_SELECT)
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(120);

  if (error) {
    console.error("[GET /api/properties/[id]/actuals] query error:", error.message);
    return NextResponse.json({ error: "Failed to load actuals." }, { status: 500 });
  }

  return NextResponse.json({ actuals: data ?? [] });
}

// ─── POST /api/properties/[id]/actuals ──────────────────────────────────────

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request, "POST");
  if (rateLimitResponse) return rateLimitResponse;

  const { id: propertyId } = await context.params;

  if (!uuidSchema.safeParse(propertyId).success) {
    return NextResponse.json({ error: "Invalid property ID." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = monthlyActualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canAccessMaxFeature(subscription?.plan_type ?? "free")) {
    return NextResponse.json(
      { error: "Max subscription required." },
      { status: 403 }
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const { month, year, actual_rent, actual_expenses, notes } = parsed.data;

  const { data: actual, error: insertError } = await supabase
    .from("monthly_actuals")
    .insert({
      property_id: propertyId,
      user_id: user.id,
      month,
      year,
      actual_rent,
      actual_expenses,
      notes: notes ?? null,
    })
    .select(ACTUALS_SELECT)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Actuals for this month and year already exist. Delete the existing entry first.",
        },
        { status: 409 }
      );
    }
    console.error("[POST /api/properties/[id]/actuals] insert error:", insertError.message);
    return NextResponse.json({ error: "Failed to save actuals." }, { status: 500 });
  }

  return NextResponse.json({ actual }, { status: 201 });
}

// ─── DELETE /api/properties/[id]/actuals?actualId=... ───────────────────────

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request, "DELETE");
  if (rateLimitResponse) return rateLimitResponse;

  const { id: propertyId } = await context.params;

  if (!uuidSchema.safeParse(propertyId).success) {
    return NextResponse.json({ error: "Invalid property ID." }, { status: 400 });
  }

  const actualId = new URL(request.url).searchParams.get("actualId") ?? "";

  if (!uuidSchema.safeParse(actualId).success) {
    return NextResponse.json({ error: "Invalid actual ID." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canAccessMaxFeature(subscription?.plan_type ?? "free")) {
    return NextResponse.json(
      { error: "Max subscription required." },
      { status: 403 }
    );
  }

  const { error: deleteError } = await supabase
    .from("monthly_actuals")
    .delete()
    .eq("id", actualId)
    .eq("user_id", user.id)
    .eq("property_id", propertyId);

  if (deleteError) {
    console.error("[DELETE /api/properties/[id]/actuals] delete error:", deleteError.message);
    return NextResponse.json({ error: "Failed to delete actual." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
