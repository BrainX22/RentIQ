import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const {
  mockConstructEvent,
  mockSubscriptionsRetrieve,
  mockSessionsListLineItems,
  mockAdminFrom,
  mockUpsert,
  mockMaybySingle,
} = vi.hoisted(() => {
  const mockConstructEvent = vi.fn();
  const mockSubscriptionsRetrieve = vi.fn();
  const mockSessionsListLineItems = vi.fn();

  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockMaybySingle = vi.fn();

  const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybySingle,
          }),
        }),
        upsert: mockUpsert,
      };
    }
    return { upsert: mockUpsert };
  });

  return { mockConstructEvent, mockSubscriptionsRetrieve, mockSessionsListLineItems, mockAdminFrom, mockUpsert, mockMaybySingle };
});

vi.mock("@/lib/stripe", () => ({
  default: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    checkout: {
      sessions: { listLineItems: mockSessionsListLineItems },
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mockAdminFrom }),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWebhookRequest(body = "raw-payload", sig = "stripe-sig-valid") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": sig },
    body,
  });
}

const MOCK_SUBSCRIPTION = {
  id: "sub_123",
  customer: "cus_123",
  status: "active" as const,
  cancel_at_period_end: false,
  cancel_at: null,
  metadata: { user_id: "user-123" },
  items: {
    data: [{ current_period_end: 1735689600 }],
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_MAX_PRICE_ID = "price_max_test_123";
    // Default: listLineItems returns a pro price (not max)
    mockSessionsListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_pro_test_123" } }],
    });
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(makeWebhookRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Webhook handler unavailable.");
    expect(body.error).not.toContain("STRIPE_WEBHOOK_SECRET");
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "payload",
      // no stripe-signature header
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing Stripe signature.");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Webhook signature verification failed.");
    });

    const response = await POST(makeWebhookRequest("payload", "bad-sig"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid webhook signature.");
  });

  it("returns 200 for unknown event types (no-op)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    });

    const response = await POST(makeWebhookRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  describe("checkout.session.completed", () => {
    it("upserts subscription to Pro on successful checkout (pro price)", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { user_id: "user-123" },
            subscription: "sub_123",
            customer: "cus_123",
          },
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue(MOCK_SUBSCRIPTION);
      // listLineItems returns a non-max price → resolves to 'pro'
      mockSessionsListLineItems.mockResolvedValue({
        data: [{ price: { id: "price_pro_test_123" } }],
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          plan_type: "pro",
          status: "active",
        }),
        expect.anything()
      );
    });

    it("upserts subscription to Max when Max price was purchased", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { user_id: "user-123" },
            subscription: "sub_123",
            customer: "cus_123",
          },
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue(MOCK_SUBSCRIPTION);
      // listLineItems returns the Max price ID
      mockSessionsListLineItems.mockResolvedValue({
        data: [{ price: { id: "price_max_test_123" } }],
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          plan_type: "max",
          status: "active",
        }),
        expect.anything()
      );
    });

    it("defaults to pro plan when listLineItems returns no price data", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { user_id: "user-123" },
            subscription: "sub_123",
            customer: "cus_123",
          },
        },
      });
      mockSubscriptionsRetrieve.mockResolvedValue(MOCK_SUBSCRIPTION);
      mockSessionsListLineItems.mockResolvedValue({ data: [] }); // no line items

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_type: "pro" }),
        expect.anything()
      );
    });

    it("skips upsert when session has no user_id in metadata", async () => {
      mockConstructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {}, // no user_id
            subscription: "sub_123",
            customer: "cus_123",
          },
        },
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("downgrades subscription to free on deletion", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.deleted",
        data: {
          object: {
            ...MOCK_SUBSCRIPTION,
            status: "canceled",
          },
        },
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);

      // Verify upsert called with free plan + canceled status
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          plan_type: "free",
          status: "canceled",
        }),
        expect.anything()
      );
    });
  });

  describe("customer.subscription.updated", () => {
    it("upserts updated subscription state as pro when price is not max", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            ...MOCK_SUBSCRIPTION,
            status: "past_due",
            items: { data: [{ current_period_end: 1735689600, price: { id: "price_pro_test_123" } }] },
          },
        },
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          plan_type: "pro",
          status: "past_due",
        }),
        expect.anything()
      );
    });

    it("upserts subscription as max when subscription price is max price", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            ...MOCK_SUBSCRIPTION,
            status: "active",
            items: { data: [{ current_period_end: 1735689600, price: { id: "price_max_test_123" } }] },
          },
        },
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_type: "max",
          status: "active",
        }),
        expect.anything()
      );
    });
  });

  it("returns 500 when DB upsert fails during webhook processing", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          subscription: "sub_123",
          customer: "cus_123",
        },
      },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(MOCK_SUBSCRIPTION);
    mockUpsert.mockResolvedValue({ error: { message: "DB constraint violation" } });

    const response = await POST(makeWebhookRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Webhook processing failed.");
  });

  it("returns generic error message without leaking DB internals", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { user_id: "user-123" },
          subscription: "sub_123",
          customer: "cus_123",
        },
      },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(MOCK_SUBSCRIPTION);
    mockUpsert.mockResolvedValue({ error: { message: "pg: relation 'subscriptions' does not exist" } });

    const response = await POST(makeWebhookRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Webhook processing failed.");
    expect(body.error).not.toContain("pg:");
    expect(body.error).not.toContain("relation");
  });

  describe("subscription without metadata user_id (DB lookup path)", () => {
    beforeEach(() => {
      // Restore defaults cleared by outer vi.clearAllMocks()
      mockUpsert.mockResolvedValue({ error: null });
    });

    it("updated: looks up user by stripe subscription ID when no metadata", async () => {
      // No metadata.user_id — triggers resolveUserIdByStripeIds DB lookup
      const subWithoutMeta = { ...MOCK_SUBSCRIPTION, metadata: {} };
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: { object: subWithoutMeta },
      });
      mockMaybySingle.mockResolvedValue({ data: { user_id: "user-from-db" }, error: null });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-from-db", plan_type: "pro" }),
        expect.anything()
      );
    });

    it("updated: skips upsert when user cannot be resolved", async () => {
      const subWithoutMeta = { ...MOCK_SUBSCRIPTION, metadata: {} };
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: { object: subWithoutMeta },
      });
      // DB lookup returns null (user not found)
      mockMaybySingle.mockResolvedValue({ data: null, error: null });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("deleted: looks up user by stripe customer ID when no metadata", async () => {
      const subWithoutMeta = { ...MOCK_SUBSCRIPTION, metadata: {} };
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.deleted",
        data: { object: subWithoutMeta },
      });
      mockMaybySingle.mockResolvedValue({ data: { user_id: "user-from-db" }, error: null });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-from-db", plan_type: "free", status: "canceled" }),
        expect.anything()
      );
    });

    it("maps Stripe status 'incomplete' to 'past_due'", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: { ...MOCK_SUBSCRIPTION, status: "incomplete" },
        },
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "past_due" }),
        expect.anything()
      );
    });

    it("maps Stripe status 'trialing' to 'active'", async () => {
      mockConstructEvent.mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: { ...MOCK_SUBSCRIPTION, status: "trialing" },
        },
      });

      const response = await POST(makeWebhookRequest());
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active" }),
        expect.anything()
      );
    });
  });
});
