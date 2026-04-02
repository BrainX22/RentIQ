import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  updateSubscription,
} from "@lemonsqueezy/lemonsqueezy.js";

// Lazy initialization — deferred to first call so the build succeeds without
// env vars present. Re-initializes if the API key changes (e.g., key rotation).
let configuredApiKey: string | null = null;

function ensureConfigured(): string {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!apiKey) throw new Error("Missing LEMONSQUEEZY_API_KEY");
  if (!storeId) throw new Error("Missing LEMONSQUEEZY_STORE_ID");
  if (configuredApiKey !== apiKey) {
    lemonSqueezySetup({ apiKey });
    configuredApiKey = apiKey;
  }
  return storeId;
}

export async function createCheckoutUrl(
  variantId: string,
  userEmail: string,
  userId: string,
  origin: string
): Promise<string> {
  const storeId = ensureConfigured();
  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutData: {
      email: userEmail,
      custom: { user_id: userId },
    },
    productOptions: {
      redirectUrl: `${origin}/dashboard?checkout=success`,
    },
  });

  if (error || !data?.data?.attributes?.url) {
    throw new Error("Failed to create LemonSqueezy checkout");
  }

  return data.data.attributes.url;
}

export async function getCustomerPortalUrl(subscriptionId: string): Promise<string> {
  ensureConfigured();
  const { data, error } = await getSubscription(subscriptionId);

  if (error || !data?.data?.attributes?.urls?.customer_portal) {
    throw new Error("Failed to get customer portal URL");
  }

  return data.data.attributes.urls.customer_portal;
}

export async function cancelLsSubscription(subscriptionId: string): Promise<void> {
  ensureConfigured();
  const { error } = await updateSubscription(subscriptionId, { cancelled: true });

  if (error) {
    throw new Error("Failed to cancel LemonSqueezy subscription");
  }
}
