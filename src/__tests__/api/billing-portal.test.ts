import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockBillingPortalCreate,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom };
  const mockBillingPortalCreate = vi.fn();
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  return { mockGetUser, mockFrom, mockSupabase, mockBillingPortalCreate, mockIsRateLimitingEnabled, mockLimit, mockGetClientIp };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}));

vi.mock("@/lib/stripe", () => ({
  default: {
    billingPortal: { sessions: { create: mockBillingPortalCreate } },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimitingEnabled: mockIsRateLimitingEnabled,
  resolveRateLimiter: vi.fn().mockReturnValue({ limit: mockLimit }),
  getClientIp: mockGetClientIp,
}));

import { POST } from "@/app/api/billing-portal/route";

function makeRequest() {
  return new Request("http://localhost/api/billing-portal", {
    method: "POST",
    headers: { origin: "http://localhost:3001" },
  });
}

describe("POST /api/billing-portal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no Stripe customer", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No Stripe customer");
  });

  it("returns billing portal URL for valid customer", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { stripe_customer_id: "cus_123" },
            error: null,
          }),
        }),
      }),
    });
    mockBillingPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/123" });

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://billing.stripe.com/session/123");
  });

  it("returns 400 when subscription query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        }),
      }),
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(400);
  });

  it("returns 500 when billing portal session has no URL", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { stripe_customer_id: "cus_123" },
            error: null,
          }),
        }),
      }),
    });
    mockBillingPortalCreate.mockResolvedValue({ url: null });

    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
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
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: "cus_123" },
              error: null,
            }),
          }),
        }),
      });
      mockBillingPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/ok" });

      const response = await POST(makeRequest());
      expect(response.status).not.toBe(429);
    });
  });
});
