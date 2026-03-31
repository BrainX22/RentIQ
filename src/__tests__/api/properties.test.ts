import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup (must be before route imports) ────────────────────────────────

const {
  mockGetUser,
  mockFrom,
  mockRpc,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockRpc = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  return { mockGetUser, mockFrom, mockRpc, mockSupabase, mockIsRateLimitingEnabled, mockLimit, mockGetClientIp };
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

// ─── Import route handlers AFTER mocks ───────────────────────────────────────

import { GET, POST } from "@/app/api/properties/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_INPUTS = {
  propertyPrice: 200_000,
  downPaymentPercent: 20,
  interestRate: 6,
  loanTermYears: 30,
  monthlyRent: 1_500,
  propertyTaxYearly: 2_400,
  insuranceMonthly: 100,
  hoaFeesMonthly: 0,
  maintenancePercent: 10,
  vacancyPercent: 8,
  propertyManagementPercent: 0,
  closingCostsPercent: 0,
};

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthenticatedUser(userId = "user-123") {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: "test@test.com" } } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

/**
 * Free user: no subscription row.
 * save_property_atomic is the single RPC call (usage + insert in one transaction).
 */
function mockFreeUser() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }
    return {};
  });
  mockRpc.mockResolvedValue({
    data: { id: "prop-1", property_name: "Test Property" },
    error: null,
  });
}

/**
 * Pro user: subscription row with plan_type = "pro".
 * save_property_atomic is called with p_is_pro: true — usage tracking skipped inside the function.
 */
function mockProUser() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan_type: "pro" },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });
  mockRpc.mockResolvedValue({
    data: { id: "prop-2", property_name: "Pro Property" },
    error: null,
  });
}

/**
 * Max user: subscription row with plan_type = "max".
 * save_property_atomic is called with p_is_pro: true — usage tracking skipped (same as pro).
 */
function mockMaxUser() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan_type: "max" },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });
  mockRpc.mockResolvedValue({
    data: { id: "prop-3", property_name: "Max Property" },
    error: null,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockUnauthenticated();

    const response = await GET(new Request("http://localhost/api/properties"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns empty array when user has no properties", async () => {
    mockAuthenticatedUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/properties"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.properties).toEqual([]);
  });

  it("returns user's saved properties", async () => {
    mockAuthenticatedUser();
    const fakeProperties = [
      { id: "prop-1", property_name: "House A" },
      { id: "prop-2", property_name: "House B" },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: fakeProperties, error: null }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/properties"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.properties).toHaveLength(2);
    expect(body.properties[0].property_name).toBe("House A");
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await GET(new Request("http://localhost/api/properties"));
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      mockAuthenticatedUser();
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const response = await GET(new Request("http://localhost/api/properties"));
      expect(response.status).not.toBe(429);
    });
  });
});

describe("POST /api/properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockUnauthenticated();

    const response = await POST(
      makePostRequest({ propertyName: "Test", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    mockAuthenticatedUser();

    const response = await POST(
      new Request("http://localhost/api/properties", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body.");
  });

  it("returns 400 when Zod validation fails (missing propertyName)", async () => {
    mockAuthenticatedUser();

    const response = await POST(
      makePostRequest({ inputs: VALID_INPUTS }) // missing propertyName
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 when Zod validation fails (invalid inputs)", async () => {
    mockAuthenticatedUser();

    const response = await POST(
      makePostRequest({
        propertyName: "Test",
        inputs: { ...VALID_INPUTS, propertyPrice: -1 }, // negative price invalid
      })
    );
    expect(response.status).toBe(400);
  });

  it("free user saves property successfully (under limit)", async () => {
    mockAuthenticatedUser();
    mockFreeUser();

    const response = await POST(
      makePostRequest({ propertyName: "My House", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.property).toBeDefined();
    expect(body.property.property_name).toBe("Test Property");
  });

  it("free user blocked on 4th save (FREE_LIMIT_REACHED)", async () => {
    mockAuthenticatedUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    // Atomic function raises FREE_LIMIT_REACHED exception — Supabase surfaces it as an error
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "FREE_LIMIT_REACHED" },
    });

    const response = await POST(
      makePostRequest({ propertyName: "4th Property", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FREE_LIMIT_REACHED");
  });

  it("pro user saves with p_is_pro: true (usage tracking skipped inside atomic function)", async () => {
    mockAuthenticatedUser();
    mockProUser();

    const response = await POST(
      makePostRequest({ propertyName: "Pro Property", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(201);
    // save_property_atomic is called — but with p_is_pro: true so no usage charge
    expect(mockRpc).toHaveBeenCalledWith(
      "save_property_atomic",
      expect.objectContaining({ p_is_pro: true })
    );
  });

  it("max user saves with p_is_pro: true (usage tracking skipped — same as pro)", async () => {
    mockAuthenticatedUser();
    mockMaxUser();

    const response = await POST(
      makePostRequest({ propertyName: "Max Property", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(201);
    // Max users bypass usage tracking — canAccessProFeature('max') returns true
    expect(mockRpc).toHaveBeenCalledWith(
      "save_property_atomic",
      expect.objectContaining({ p_is_pro: true })
    );
  });

  it("free user save uses limit of 5 (not 3)", async () => {
    mockAuthenticatedUser();
    mockFreeUser();

    await POST(makePostRequest({ propertyName: "Test", inputs: VALID_INPUTS }));

    expect(mockRpc).toHaveBeenCalledWith(
      "save_property_atomic",
      expect.objectContaining({ p_max_count: 5 })
    );
  });

  it("server recalculates results (atomic function receives server-computed values)", async () => {
    mockAuthenticatedUser();

    // Capture args passed to save_property_atomic
    let rpcArgs: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    mockRpc.mockImplementation((_fn: string, args: Record<string, unknown>) => {
      rpcArgs = args;
      return Promise.resolve({
        data: { id: "prop-1", ...args },
        error: null,
      });
    });

    const response = await POST(
      makePostRequest({ propertyName: "Test", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(201);

    // Server should have passed a plausible monthly_mortgage (not 0 or absent)
    expect(rpcArgs).not.toBeNull();
    const captured = rpcArgs!;
    expect(captured.p_monthly_mortgage).toBeTypeOf("number");
    expect(captured.p_monthly_mortgage as number).toBeGreaterThan(0);
    // Server-calculated monthly cash flow should be a real number
    expect(captured.p_monthly_cash_flow).toBeTypeOf("number");
  });

  it("returns 500 when atomic save fails (DB error)", async () => {
    mockAuthenticatedUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const response = await POST(
      makePostRequest({ propertyName: "Test", inputs: VALID_INPUTS })
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    // Generic error returned to client — raw DB message is logged server-side only
    expect(body.error).toBe("Failed to save property.");
  });

  it("strips client-provided results field and always uses server-recalculated values", async () => {
    mockAuthenticatedUser();
    mockFreeUser();

    const response = await POST(
      makePostRequest({
        propertyName: "My House",
        inputs: VALID_INPUTS,
        results: { monthlyCashFlow: 99999 }, // client-sent — must be ignored
      })
    );
    expect(response.status).toBe(201);
    // Server computes monthly_cash_flow — it will NOT be 99999
    expect(mockRpc).toHaveBeenCalledWith(
      "save_property_atomic",
      expect.not.objectContaining({ p_monthly_cash_flow: 99999 })
    );
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await POST(
        makePostRequest({ propertyName: "Test", inputs: VALID_INPUTS })
      );
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      mockAuthenticatedUser();
      mockFreeUser();

      const response = await POST(
        makePostRequest({ propertyName: "Test", inputs: VALID_INPUTS })
      );
      expect(response.status).not.toBe(429);
    });
  });
});
