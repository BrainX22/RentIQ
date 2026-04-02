import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockCreateCheckoutUrl,
  mockIsRateLimitingEnabled,
  mockLimit,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom };
  const mockCreateCheckoutUrl = vi.fn();
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  return { mockGetUser, mockFrom, mockSupabase, mockCreateCheckoutUrl, mockIsRateLimitingEnabled, mockLimit };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}));

vi.mock("@/lib/lemonsqueezy", () => ({
  createCheckoutUrl: mockCreateCheckoutUrl,
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimitingEnabled: mockIsRateLimitingEnabled,
  resolveRateLimiter: vi.fn().mockReturnValue({ limit: mockLimit }),
}));

import { POST } from "@/app/api/checkout/route";

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

function mockFreeUser() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { plan_type: "free" }, error: null }),
      }),
    }),
  });
}

function mockProUser() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { plan_type: "pro" }, error: null }),
      }),
    }),
  });
}

function mockMaxUser() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { plan_type: "max" }, error: null }),
      }),
    }),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LEMONSQUEEZY_PRO_VARIANT_ID = "1477889";
    process.env.LEMONSQUEEZY_MAX_VARIANT_ID = "1477891";
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 500 when LEMONSQUEEZY_PRO_VARIANT_ID is not configured", async () => {
    mockAuthUser();
    mockFreeUser();
    delete process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Payment configuration error.");
  });

  it("returns 500 when LEMONSQUEEZY_MAX_VARIANT_ID is not configured", async () => {
    mockAuthUser();
    mockFreeUser();
    delete process.env.LEMONSQUEEZY_MAX_VARIANT_ID;
    const response = await POST(makeRequest("max"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Payment configuration error.");
  });

  it("returns 409 when already on Pro (requesting pro)", async () => {
    mockAuthUser();
    mockProUser();
    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Already subscribed to Pro.");
  });

  it("returns 409 when already on Max", async () => {
    mockAuthUser();
    mockMaxUser();
    const response = await POST(makeRequest("max"));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Already subscribed to Max.");
  });

  it("returns 409 when Max user tries to checkout for pro", async () => {
    mockAuthUser();
    mockMaxUser();
    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(409);
  });

  it("allows Pro user to upgrade to Max", async () => {
    mockAuthUser();
    mockProUser();
    mockCreateCheckoutUrl.mockResolvedValue("https://checkout.lemonsqueezy.com/buy/max");
    const response = await POST(makeRequest("max"));
    expect(response.status).toBe(200);
    expect((await response.json()).url).toBe("https://checkout.lemonsqueezy.com/buy/max");
    expect(mockCreateCheckoutUrl).toHaveBeenCalledWith(
      "1477891", "user@test.com", "user-123", "http://localhost:3001"
    );
  });

  it("creates checkout with Pro variant for free user", async () => {
    mockAuthUser();
    mockFreeUser();
    mockCreateCheckoutUrl.mockResolvedValue("https://checkout.lemonsqueezy.com/buy/pro");
    const response = await POST(makeRequest("pro"));
    expect(response.status).toBe(200);
    expect(mockCreateCheckoutUrl).toHaveBeenCalledWith(
      "1477889", "user@test.com", "user-123", "http://localhost:3001"
    );
  });

  it("defaults to pro when no tier in body", async () => {
    mockAuthUser();
    mockFreeUser();
    mockCreateCheckoutUrl.mockResolvedValue("https://checkout.lemonsqueezy.com/buy/pro");
    await POST(new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { origin: "http://localhost:3001" },
    }));
    expect(mockCreateCheckoutUrl).toHaveBeenCalledWith(
      "1477889", expect.any(String), expect.any(String), expect.any(String)
    );
  });

  it("returns 500 when createCheckoutUrl throws", async () => {
    mockAuthUser();
    mockFreeUser();
    mockCreateCheckoutUrl.mockRejectedValue(new Error("LS API error"));
    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });
      const response = await POST(makeRequest());
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).not.toBeNull();
    });

    it("passes through when rate limiting disabled", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      mockAuthUser();
      mockFreeUser();
      mockCreateCheckoutUrl.mockResolvedValue("https://checkout.lemonsqueezy.com/buy/pro");
      const response = await POST(makeRequest());
      expect(response.status).not.toBe(429);
    });
  });
});
