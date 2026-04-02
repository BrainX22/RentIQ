import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AppStatus = "active" | "past_due" | "canceled";
type AppPlanType = "free" | "pro" | "max";

// Supabase user IDs are UUID v4 — validate before trusting custom_data payload.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    attributes: {
      variant_id: number;
      customer_id: number;
      order_id: number;
      status: string;
      cancelled: boolean;
      renews_at: string | null;
      ends_at: string | null;
      user_email: string;
    };
  };
}

function resolvePlanType(variantId: number): AppPlanType {
  if (String(variantId) === process.env.LEMONSQUEEZY_MAX_VARIANT_ID) return "max";
  return "pro";
}

function mapLsStatus(lsStatus: string): AppStatus {
  if (lsStatus === "active" || lsStatus === "cancelled") return "active";
  if (lsStatus === "past_due" || lsStatus === "unpaid" || lsStatus === "paused") return "past_due";
  return "canceled";
}

async function resolveUserId(payload: LsWebhookPayload): Promise<string | null> {
  const fromCustomData = payload.meta.custom_data?.user_id ?? null;
  if (fromCustomData) {
    if (!UUID_RE.test(fromCustomData)) {
      console.warn("[ls-webhook] Ignoring malformed user_id in custom_data:", fromCustomData);
      return null;
    }
    return fromCustomData;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("ls_subscription_id", payload.data.id)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function upsertSubscription(params: {
  userId: string;
  lsSubscriptionId: string;
  lsCustomerId: string;
  lsOrderId: string;
  planType: AppPlanType;
  status: AppStatus;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  currentPeriodEnd: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: params.userId,
      ls_subscription_id: params.lsSubscriptionId,
      ls_customer_id: params.lsCustomerId,
      ls_order_id: params.lsOrderId,
      plan_type: params.planType,
      status: params.status,
      cancel_at_period_end: params.cancelAtPeriodEnd,
      cancel_at: params.cancelAt,
      current_period_end: params.currentPeriodEnd,
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}

async function handleSubscriptionCreated(payload: LsWebhookPayload) {
  const userId = await resolveUserId(payload);
  if (!userId) {
    console.warn("[ls-webhook] subscription_created: could not resolve user_id", {
      email: payload.data.attributes.user_email,
      subscriptionId: payload.data.id,
    });
    return;
  }
  await upsertSubscription({
    userId,
    lsSubscriptionId: payload.data.id,
    lsCustomerId: String(payload.data.attributes.customer_id),
    lsOrderId: String(payload.data.attributes.order_id),
    planType: resolvePlanType(payload.data.attributes.variant_id),
    status: "active",
    cancelAtPeriodEnd: false,
    cancelAt: null,
    currentPeriodEnd: payload.data.attributes.renews_at,
  });
}

async function handleSubscriptionUpdated(payload: LsWebhookPayload) {
  const userId = await resolveUserId(payload);
  if (!userId) return;
  const status = mapLsStatus(payload.data.attributes.status);
  await upsertSubscription({
    userId,
    lsSubscriptionId: payload.data.id,
    lsCustomerId: String(payload.data.attributes.customer_id),
    lsOrderId: String(payload.data.attributes.order_id),
    // Downgrade to free when the subscription has fully expired
    planType: status === "canceled" ? "free" : resolvePlanType(payload.data.attributes.variant_id),
    status,
    cancelAtPeriodEnd: payload.data.attributes.cancelled,
    cancelAt: payload.data.attributes.ends_at,
    currentPeriodEnd: payload.data.attributes.renews_at,
  });
}

async function handleSubscriptionCancelled(payload: LsWebhookPayload) {
  const userId = await resolveUserId(payload);
  if (!userId) return;
  await upsertSubscription({
    userId,
    lsSubscriptionId: payload.data.id,
    lsCustomerId: String(payload.data.attributes.customer_id),
    lsOrderId: String(payload.data.attributes.order_id),
    planType: resolvePlanType(payload.data.attributes.variant_id),
    status: "active", // Still has access until period end
    cancelAtPeriodEnd: true,
    cancelAt: payload.data.attributes.ends_at,
    currentPeriodEnd: payload.data.attributes.renews_at,
  });
}

async function handleSubscriptionExpired(payload: LsWebhookPayload) {
  const userId = await resolveUserId(payload);
  if (!userId) return;
  await upsertSubscription({
    userId,
    lsSubscriptionId: payload.data.id,
    lsCustomerId: String(payload.data.attributes.customer_id),
    lsOrderId: String(payload.data.attributes.order_id),
    planType: "free",
    status: "canceled",
    cancelAtPeriodEnd: false,
    cancelAt: null,
    currentPeriodEnd: payload.data.attributes.ends_at,
  });
}

async function handleSubscriptionPaymentFailed(payload: LsWebhookPayload) {
  const userId = await resolveUserId(payload);
  if (!userId) return;
  await upsertSubscription({
    userId,
    lsSubscriptionId: payload.data.id,
    lsCustomerId: String(payload.data.attributes.customer_id),
    lsOrderId: String(payload.data.attributes.order_id),
    planType: resolvePlanType(payload.data.attributes.variant_id),
    status: "past_due",
    cancelAtPeriodEnd: payload.data.attributes.cancelled,
    cancelAt: payload.data.attributes.ends_at,
    currentPeriodEnd: payload.data.attributes.renews_at,
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[ls-webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook handler unavailable." }, { status: 500 });
  }

  // Read raw body BEFORE JSON parse — signature is over the raw bytes
  const rawBody = await request.text();

  const signature = request.headers.get("x-signature") ?? "";
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const hmac = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  // Always compare fixed-length buffers to prevent timing oracle.
  // If the provided signature has a different byte length, the padded buffer
  // will not match — but timingSafeEqual always runs (no throw, no fast path).
  const hmacBuf = Buffer.from(hmac, "hex"); // always 32 bytes
  const providedBuf = Buffer.from(signature, "hex"); // hex decoding; invalid chars become 0
  const sigBuf = Buffer.alloc(hmacBuf.length, 0);
  providedBuf.copy(sigBuf, 0, 0, Math.min(providedBuf.length, sigBuf.length));

  // Length check AFTER constant-time comparison — never before — to avoid early exit.
  const isValid = crypto.timingSafeEqual(hmacBuf, sigBuf) &&
                  providedBuf.length === hmacBuf.length;

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LsWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    switch (payload.meta.event_name) {
      case "subscription_created":
        await handleSubscriptionCreated(payload);
        break;
      case "subscription_updated":
        await handleSubscriptionUpdated(payload);
        break;
      case "subscription_cancelled":
        await handleSubscriptionCancelled(payload);
        break;
      case "subscription_expired":
        await handleSubscriptionExpired(payload);
        break;
      case "subscription_payment_failed":
        await handleSubscriptionPaymentFailed(payload);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("[ls-webhook] Processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
