import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
  mockLookupNeighborhood,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  const mockLookupNeighborhood = vi.fn();
  return {
    mockGetUser,
    mockFrom,
    mockSupabase,
    mockIsRateLimitingEnabled,
    mockLimit,
    mockGetClientIp,
    mockLookupNeighborhood,
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

vi.mock("@/lib/neighborhood/lookup", () => ({
  lookupNeighborhood: mockLookupNeighborhood,
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { GET } from "@/app/api/neighborhood/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_ID = "user-abc-123";

const NEIGHBORHOOD_RESPONSE = {
  available: true as const,
  zip_code: "90210",
  scores: {
    composite: 78,
    safety: 80,
    income: 65,
    growth: 100,
    grade: "B" as const,
    sources: ["crimegrade", "census", "fhfa"],
  },
  fetchedAt: "2026-03-01T00:00:00Z",
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/neighborhood");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString());
}

function setupAuth(planType = "max", status = "active") {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  const subChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { plan_type: planType, status },
      error: null,
    }),
  };
  mockFrom.mockReturnValue(subChain);
  return subChain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/neighborhood", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLookupNeighborhood.mockResolvedValue(null);
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("does not expose internal details in 401 response", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest({ zip_code: "90210" }));
    const body = await res.json() as { error: string };
    expect(body.error).not.toMatch(/supabase/i);
    expect(body.error).not.toMatch(/token/i);
  });

  // ── Plan gate ─────────────────────────────────────────────────────────────

  it("returns 403 when user is on the free plan", async () => {
    setupAuth("free");
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Max subscription/i);
  });

  it("returns 403 when user is on the pro plan", async () => {
    setupAuth("pro");
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when Max user has a canceled subscription", async () => {
    setupAuth("max", "canceled");
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Max subscription/i);
  });

  it("returns 403 when Max user has past_due status", async () => {
    setupAuth("max", "past_due");
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(403);
  });

  it("allows Max user with active subscription", async () => {
    setupAuth("max", "active");
    mockLookupNeighborhood.mockResolvedValue(NEIGHBORHOOD_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(200);
  });

  it("allows Max user with trialing subscription", async () => {
    setupAuth("max", "trialing");
    mockLookupNeighborhood.mockResolvedValue(NEIGHBORHOOD_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(200);
  });

  it("returns 403 when no subscription row exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(subChain);
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(403);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when zip_code is missing", async () => {
    setupAuth();
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/zip/i);
  });

  it("returns 400 when zip_code is only 4 digits", async () => {
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "9021" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/5 digits/i);
  });

  it("returns 400 when zip_code is 6 digits", async () => {
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "902101" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when zip_code contains letters", async () => {
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "9021A" }));
    expect(res.status).toBe(400);
  });

  it("does not leak Zod error internals in validation error", async () => {
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "bad" }));
    const body = await res.json() as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toMatch(/ZodError/i);
  });

  // ── Lookup ────────────────────────────────────────────────────────────────

  it("returns 200 with neighborhood data when lookup succeeds", async () => {
    setupAuth();
    mockLookupNeighborhood.mockResolvedValue(NEIGHBORHOOD_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(200);
    const body = await res.json() as typeof NEIGHBORHOOD_RESPONSE;
    expect(body.available).toBe(true);
    expect(body.zip_code).toBe("90210");
    expect(body.scores.composite).toBe(78);
    expect(body.scores.grade).toBe("B");
    expect(body.scores.sources).toContain("crimegrade");
  });

  it("returns 200 with available:false when lookup returns null", async () => {
    setupAuth();
    mockLookupNeighborhood.mockResolvedValue(null);
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { available: boolean };
    expect(body.available).toBe(false);
  });

  it("passes the correct zip_code to lookupNeighborhood", async () => {
    setupAuth();
    mockLookupNeighborhood.mockResolvedValue(NEIGHBORHOOD_RESPONSE);
    await GET(makeRequest({ zip_code: "12345" }));
    expect(mockLookupNeighborhood).toHaveBeenCalledWith("12345");
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockResolvedValueOnce({ success: false, reset: Date.now() + 60000 });
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many requests/i);
  });

  it("includes Retry-After header when rate limited", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    const resetTs = Date.now() + 30000;
    mockLimit.mockResolvedValueOnce({ success: false, reset: resetTs });
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 503 when rate limiter itself throws (Redis error)", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockRejectedValueOnce(new Error("Redis connection refused"));
    setupAuth();
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/temporarily unavailable/i);
  });

  it("skips rate limiting when Redis is not configured", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(false);
    setupAuth();
    mockLookupNeighborhood.mockResolvedValue(NEIGHBORHOOD_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "90210" }));
    expect(res.status).toBe(200);
    expect(mockLimit).not.toHaveBeenCalled();
  });
});
