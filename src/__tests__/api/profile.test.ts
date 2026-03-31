import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser, updateUser: mockUpdateUser },
    from: mockFrom,
  };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  return {
    mockGetUser,
    mockFrom,
    mockSupabase,
    mockIsRateLimitingEnabled,
    mockLimit,
    mockGetClientIp,
  };
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

vi.mock("@/lib/rate-limit", () => ({
  isRateLimitingEnabled: mockIsRateLimitingEnabled,
  resolveRateLimiter: vi.fn().mockReturnValue({ limit: mockLimit }),
  getClientIp: mockGetClientIp,
}));

// ─── Import SUT after mocks ─────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/profile/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = "user-abc-123";
const USER_EMAIL = "alex.johnson@gmail.com";

function makeGetRequest() {
  return new Request("http://localhost/api/profile");
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: USER_ID,
        email: USER_EMAIL,
        created_at: "2026-03-15T10:00:00Z",
        app_metadata: { providers: ["email"], provider: "email" },
      },
    },
  });
}

// ─── GET tests ───────────────────────────────────────────────────────────────

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimitingEnabled.mockReturnValue(false);
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns profile with lazy creation when no profile exists", async () => {
    setupAuthenticatedUser();

    // 1st from("user_profiles") → maybeSingle returns null (no profile)
    const profileSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // 2nd from("user_profiles") → insert().select().single() returns new profile
    const profileInsertChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { display_name: "Alex", created_at: "2026-03-15T10:00:00Z" },
            error: null,
          }),
        }),
      }),
    };

    // from("subscriptions")
    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { plan_type: "free", status: "active", current_period_end: null, cancel_at_period_end: false, cancel_at: null },
        error: null,
      }),
    };

    // from("usage_tracking")
    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { calculation_count: 3 },
        error: null,
      }),
    };

    // from("properties") — used twice: once for recent (order+limit), once for count
    const propertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: "p1", property_name: "123 Oak St", monthly_cash_flow: 340, created_at: "2026-03-27T00:00:00Z" }],
              error: null,
            }),
          }),
          // This handles the count call — select("id", { count: "exact", head: true })
          // which doesn't chain order/limit but resolves directly
        }),
      }),
    };

    const propertiesCountChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
      }),
    };

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        callCount++;
        return callCount === 1 ? profileSelectChain : profileInsertChain;
      }
      if (table === "subscriptions") return subChain;
      if (table === "usage_tracking") return usageChain;
      if (table === "properties") {
        callCount++;
        // First properties call is for recent (Promise.all), second is for count
        return callCount <= 5 ? propertiesChain : propertiesCountChain;
      }
      return profileSelectChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.display_name).toBe("Alex");
    expect(json.profile.auth_provider).toBe("email");
    expect(json.profile.email).toBe(USER_EMAIL);
  });

  it("returns existing profile without creating a new one", async () => {
    setupAuthenticatedUser();

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { display_name: "Alexander", created_at: "2026-03-15T10:00:00Z" },
        error: null,
      }),
    };

    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { plan_type: "max", status: "active", current_period_end: "2026-04-12T00:00:00Z", cancel_at_period_end: false, cancel_at: null },
        error: null,
      }),
    };

    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { calculation_count: 12 },
        error: null,
      }),
    };

    const propertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    const propertiesCountChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 8, error: null }),
      }),
    };

    let propertiesCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") return profileChain;
      if (table === "subscriptions") return subChain;
      if (table === "usage_tracking") return usageChain;
      if (table === "properties") {
        propertiesCallCount++;
        return propertiesCallCount === 1 ? propertiesChain : propertiesCountChain;
      }
      return profileChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.display_name).toBe("Alexander");
    expect(json.subscription.plan_type).toBe("max");
    expect(json.subscription.current_period_end).toBe("2026-04-12T00:00:00Z");
    expect(json.usage.saves_this_month).toBe(12);
  });

  it("returns 503 when rate limiter throws (Redis error)", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockRejectedValueOnce(new Error("Redis connection refused"));
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/temporarily unavailable/i);
  });

  it("returns default subscription when no subscription row exists", async () => {
    setupAuthenticatedUser();

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { display_name: "Alex", created_at: "2026-03-15T10:00:00Z" },
        error: null,
      }),
    };

    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const usageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const propertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    const propertiesCountChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    };

    let propertiesCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_profiles") return profileChain;
      if (table === "subscriptions") return subChain;
      if (table === "usage_tracking") return usageChain;
      if (table === "properties") {
        propertiesCallCount++;
        return propertiesCallCount === 1 ? propertiesChain : propertiesCountChain;
      }
      return profileChain;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subscription.plan_type).toBe("free");
    expect(json.subscription.status).toBe("active");
    expect(json.subscription.current_period_end).toBeNull();
    expect(json.usage.saves_this_month).toBe(0);
    expect(json.usage.total_properties).toBe(0);
  });
});

// ─── PATCH tests ─────────────────────────────────────────────────────────────

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimitingEnabled.mockReturnValue(false);
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatchRequest({ display_name: "Test" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("updates display name and syncs to user_metadata", async () => {
    setupAuthenticatedUser();

    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    mockFrom.mockReturnValue(updateChain);

    const res = await PATCH(makePatchRequest({ display_name: "Alexander" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.display_name).toBe("Alexander");
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { display_name: "Alexander" },
    });
  });

  it("rejects empty display name", async () => {
    setupAuthenticatedUser();
    const res = await PATCH(makePatchRequest({ display_name: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects display name over 50 chars", async () => {
    setupAuthenticatedUser();
    const res = await PATCH(makePatchRequest({ display_name: "A".repeat(51) }));
    expect(res.status).toBe(400);
  });

  it("rejects whitespace-only display name", async () => {
    setupAuthenticatedUser();
    const res = await PATCH(makePatchRequest({ display_name: "   " }));
    expect(res.status).toBe(400);
  });

  it("trims whitespace from display name", async () => {
    setupAuthenticatedUser();

    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    mockFrom.mockReturnValue(updateChain);

    const res = await PATCH(makePatchRequest({ display_name: "  Alex  " }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.display_name).toBe("Alex");
  });

  it("returns 400 for invalid JSON body", async () => {
    setupAuthenticatedUser();
    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when database update fails", async () => {
    setupAuthenticatedUser();

    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
        }),
      }),
    };

    mockFrom.mockReturnValue(updateChain);

    const res = await PATCH(makePatchRequest({ display_name: "Alex" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/could not update/i);
  });

  it("returns 503 when rate limiter throws (Redis error)", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockRejectedValueOnce(new Error("Redis connection refused"));
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const res = await PATCH(makePatchRequest({ display_name: "Test" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/temporarily unavailable/i);
  });
});
