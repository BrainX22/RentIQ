import Stripe from "stripe";
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

type AppSubscriptionStatus = "active" | "canceled" | "past_due";
type AppPlanType = "free" | "pro" | "max";

function mapStripeStatus(status: Stripe.Subscription.Status): AppSubscriptionStatus {
  if (status === "active" || status === "trialing") {
    return "active";
  }

  if (status === "past_due" || status === "incomplete" || status === "unpaid") {
    return "past_due";
  }

  return "canceled";
}

function toIsoDate(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const maxPeriodEnd = subscription.items.data.reduce((maxEnd, item) => {
    return Math.max(maxEnd, item.current_period_end ?? 0);
  }, 0);

  // Fallback to cancel_at when items are unavailable (defensive only).
  return toIsoDate(maxPeriodEnd || subscription.cancel_at);
}

/**
 * Determine plan type from a Stripe price ID.
 * Defaults to 'pro' if the price ID doesn't match the Max price.
 */
function resolvePlanTypeFromPrice(priceId: string | null | undefined): "pro" | "max" {
  const maxPriceId = process.env.STRIPE_MAX_PRICE_ID;
  if (maxPriceId && priceId && priceId === maxPriceId) return "max";
  return "pro";
}

async function resolveUserIdByStripeIds(
  stripeSubscriptionId: string | null,
  stripeCustomerId: string | null
): Promise<string | null> {
  const supabase = createAdminClient();

  if (stripeSubscriptionId) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.user_id) {
      return data.user_id;
    }
  }

  if (stripeCustomerId) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.user_id ?? null;
  }

  return null;
}

async function upsertSubscription(params: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planType: AppPlanType;
  status: AppSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  currentPeriodEnd: string | null;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      plan_type: params.planType,
      status: params.status,
      cancel_at_period_end: params.cancelAtPeriodEnd,
      cancel_at: params.cancelAt,
      current_period_end: params.currentPeriodEnd,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id ?? null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (!userId || !stripeSubscriptionId) {
    console.warn(
      "[webhook] checkout.session.completed missing user_id or subscription_id — subscription NOT saved.",
      { sessionId: session.id, userId, stripeSubscriptionId }
    );
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const stripeSubscription = subscription as unknown as Stripe.Subscription;

  // Determine tier from the price the user actually purchased.
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const purchasedPriceId = lineItems.data[0]?.price?.id ?? null;
  const planType = resolvePlanTypeFromPrice(purchasedPriceId);

  await upsertSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    planType,
    status: mapStripeStatus(stripeSubscription.status),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    cancelAt: toIsoDate(stripeSubscription.cancel_at),
    currentPeriodEnd: getCurrentPeriodEnd(stripeSubscription),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const metadataUserId = subscription.metadata?.user_id ?? null;
  const userId =
    metadataUserId ??
    (await resolveUserIdByStripeIds(stripeSubscriptionId, stripeCustomerId));

  if (!userId) {
    return;
  }

  // Determine tier from the subscription's current price.
  const currentPriceId = subscription.items.data[0]?.price?.id ?? null;
  const planType = resolvePlanTypeFromPrice(currentPriceId);

  await upsertSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    planType,
    status: mapStripeStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: toIsoDate(subscription.cancel_at),
    currentPeriodEnd: getCurrentPeriodEnd(subscription),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const metadataUserId = subscription.metadata?.user_id ?? null;
  const userId =
    metadataUserId ??
    (await resolveUserIdByStripeIds(stripeSubscriptionId, stripeCustomerId));

  if (!userId) {
    return;
  }

  await upsertSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    planType: "free",
    status: "canceled",
    cancelAtPeriodEnd: false,
    cancelAt: null,
    currentPeriodEnd: getCurrentPeriodEnd(subscription),
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook handler unavailable." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[webhook] Processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
