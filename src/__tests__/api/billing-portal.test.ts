import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockGetCustomerPortalUrl,
  mockIsRateLimitingEnabled,
  mockLimit,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom };
  const mockGetCustomerPortalUrl = vi.fn();
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  return { mockGetUser, mockFrom, mockSupabase, mockGetCustomerPortalUrl, mockIsRateLimitingEnabled, mockLimit };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}));

vi.mock("@/lib/lemonsqueezy", () => ({
  getCustomerPortalUrl: mockGetCustomerPortalUrl,
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimitingEnabled: mockIsRateLimitingEnabled,
  resolveRateLimiter: vi.fn().mockReturnValue({ limit: mockLimit }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST } from "@/app/api/billing-portal/route";

function makeRequest() {
  return new Request("http://localhost/api/billing-portal", {
    method: "POST",
    headers: { origin: "http://localhost:3001" },
  });
}

function mockUserWithSubscription(lsSubscriptionId = "2022684") {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ls_subscription_id: lsSubscriptionId },
          error: null,
        }),
      }),
    }),
  });
}

describe("POST /api/billing-portal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(makeRequest())).status).toBe(401);
  });

  it("returns 400 when user has no LS subscription", async () => {
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
    expect((await response.json()).error).toBe("No active subscription found.");
  });

  it("returns portal URL for valid subscription", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockUserWithSubscription("2022684");
    mockGetCustomerPortalUrl.mockResolvedValue(
      "https://rentalpropertycalculator.lemonsqueezy.com/billing?sig=abc"
    );
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect((await response.json()).url).toBe(
      "https://rentalpropertycalculator.lemonsqueezy.com/billing?sig=abc"
    );
    expect(mockGetCustomerPortalUrl).toHaveBeenCalledWith("2022684");
  });

  it("returns 400 when subscription query fails (generic message, no DB leak)", async () => {
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
    const body = await response.json();
    expect(body.error).toBe("Could not retrieve subscription.");
    expect(body.error).not.toContain("DB error");
  });

  it("returns 500 when getCustomerPortalUrl throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockUserWithSubscription();
    mockGetCustomerPortalUrl.mockRejectedValue(new Error("LS API error"));
    expect((await POST(makeRequest())).status).toBe(500);
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });
      const response = await POST(makeRequest());
      expect(response.status).toBe(429);
    });
  });
});
