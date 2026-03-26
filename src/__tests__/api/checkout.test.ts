import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockSessionCreate,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  };
  const mockSessionCreate = vi.fn();
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  return { mockGetUser, mockFrom, mockSupabase, mockSessionCreate, mockIsRateLimitingEnabled, mockLimit, mockGetClientIp };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/stripe", () => ({
  default: {
    checkout: {
      sessions: { create: mockSessionCreate },
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimitingEnabled: mockIsRateLimitingEnabled,
  resolveRateLimiter: vi.fn().mockReturnValue({ limit: mockLimit }),
  getClientIp: mockGetClientIp,
}));

import { POST } from "@/app/api/checkout/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(tier?: "pro" | "max") {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "Content-Type": "application/json" },
    body: tier ? JSON.stringify({ tier }) : undefined,
  });
}

function mockAuthUser(userId = "user-123", email = "user@test.com") {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId, email } } });
}

function mockFreeUserNoCustomer() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  });
}

function mockProUser() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { plan_type: "pro", stripe_customer_id: "cus_existing" },
          error: null,
        }),
      }),
    }),
  });
}

function mockMaxUser() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { plan_type: "max", stripe_customer_id: "cus_max" },
          error: null,
        }),
      }),
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_ID = "price_test_pro_123";
    process.env.STRIPE_MAX_PRICE_ID = "price_test_max_123";
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 500 when STRIPE_PRICE_ID is not configured for pro tier", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    delete process.env.STRIPE_PRICE_ID;

    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Stripe price not configured.");
  });

  it("returns 500 when STRIPE_MAX_PRICE_ID is not configured for max tier", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    delete process.env.STRIPE_MAX_PRICE_ID;

    const response = await POST(makeRequest("max"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Stripe price not configured.");
  });

  it("returns 409 when user is already Pro (and requesting pro)", async () => {
    mockAuthUser();
    mockProUser();

    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already subscribed to Pro.");
  });

  it("returns 409 when user is already Max", async () => {
    mockAuthUser();
    mockMaxUser();

    const response = await POST(makeRequest("max"));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already subscribed to Max.");
  });

  it("returns 409 when Max user tries to checkout for pro (already highest tier)", async () => {
    mockAuthUser();
    mockMaxUser();

    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already subscribed to Max.");
  });

  it("allows Pro user to upgrade to Max", async () => {
    mockAuthUser();
    mockProUser();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/max_session" });

    const response = await POST(makeRequest("max"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://checkout.stripe.com/pay/max_session");

    // Should use the Max price ID
    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.line_items[0].price).toBe("price_test_max_123");
  });

  it("uses Max price ID when tier=max", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/max" });

    await POST(makeRequest("max"));

    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.line_items[0].price).toBe("price_test_max_123");
  });

  it("uses Pro price ID when tier=pro", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/pro" });

    await POST(makeRequest("pro"));

    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.line_items[0].price).toBe("price_test_pro_123");
  });

  it("defaults to pro tier when no body is provided", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/pro" });

    // makeRequest() with no arg sends no body
    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { origin: "http://localhost:3001" },
      })
    );

    expect(response.status).toBe(200);
    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.line_items[0].price).toBe("price_test_pro_123");
  });

  it("creates checkout session for free user and returns URL", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://checkout.stripe.com/pay/test");
  });

  it("passes customer_email (not customer ID) for new customers", async () => {
    mockAuthUser("user-123", "user@example.com");
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });

    await POST(makeRequest());

    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.customer_email).toBe("user@example.com");
    expect(callArgs.customer).toBeUndefined();
  });

  it("passes existing customer ID for returning users", async () => {
    mockAuthUser();
    // User has free plan but an existing stripe customer
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { plan_type: "free", stripe_customer_id: "cus_existing_123" },
            error: null,
          }),
        }),
      }),
    });
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });

    await POST(makeRequest());

    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.customer).toBe("cus_existing_123");
    expect(callArgs.customer_email).toBeUndefined();
  });

  it("includes user_id in session metadata", async () => {
    mockAuthUser("user-abc");
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });

    await POST(makeRequest());

    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.metadata?.user_id).toBe("user-abc");
    expect(callArgs.subscription_data?.metadata?.user_id).toBe("user-abc");
  });

  it("returns 500 when Stripe session has no URL", async () => {
    mockAuthUser();
    mockFreeUserNoCustomer();
    mockSessionCreate.mockResolvedValue({ url: null });

    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Could not create checkout session.");
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await POST(makeRequest());
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      mockAuthUser();
      mockFreeUserNoCustomer();
      mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });

      const response = await POST(makeRequest());
      expect(response.status).not.toBe(429);
    });
  });
});
