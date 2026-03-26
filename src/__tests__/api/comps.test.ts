import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
  mockLookupFmr,
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
  const mockLookupFmr = vi.fn();
  return {
    mockGetUser,
    mockFrom,
    mockSupabase,
    mockIsRateLimitingEnabled,
    mockLimit,
    mockGetClientIp,
    mockLookupFmr,
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

vi.mock("@/lib/comps/fmr-lookup", () => ({
  lookupFmr: mockLookupFmr,
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { GET } from "@/app/api/comps/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_ID = "user-abc-123";

const COMPS_RESPONSE = {
  available: true as const,
  source: "cache" as const,
  comps: [{ beds: 2, rent: 1450, source: "HUD FMR FY2024" }],
  marketMedian: 1450,
  fetchedAt: "2024-01-01T00:00:00Z",
  zip_code: "94102",
  bedrooms: 2,
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/comps");
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

describe("GET /api/comps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLookupFmr.mockResolvedValue(null);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  // ── Plan gate ───────────────────────────────────────────────────────────────

  it("returns 403 when user is on the free plan", async () => {
    setupAuth("free");
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Max subscription/i);
  });

  it("returns 403 when user is on the pro plan", async () => {
    setupAuth("pro");
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(403);
  });

  it("allows access for max plan users with active subscription", async () => {
    setupAuth("max", "active");
    mockLookupFmr.mockResolvedValue(COMPS_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(200);
  });

  it("allows access for max plan users in trialing status", async () => {
    setupAuth("max", "trialing");
    mockLookupFmr.mockResolvedValue(COMPS_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(200);
  });

  it("blocks max plan users with cancelled subscription", async () => {
    setupAuth("max", "canceled");
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(403);
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it("returns 400 when zip_code is missing", async () => {
    setupAuth("max");
    const res = await GET(makeRequest({ bedrooms: "2" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Invalid parameters/i);
  });

  it("returns 400 when zip_code is not 5 digits", async () => {
    setupAuth("max");
    const res = await GET(makeRequest({ zip_code: "1234", bedrooms: "2" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Invalid parameters/i);
  });

  it("returns 400 when zip_code contains letters", async () => {
    setupAuth("max");
    const res = await GET(makeRequest({ zip_code: "abcde", bedrooms: "2" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when bedrooms is > 5", async () => {
    setupAuth("max");
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "6" }));
    expect(res.status).toBe(400);
  });

  it("defaults bedrooms to 2 when not supplied", async () => {
    setupAuth("max");
    mockLookupFmr.mockResolvedValue(COMPS_RESPONSE);
    await GET(makeRequest({ zip_code: "94102" }));
    expect(mockLookupFmr).toHaveBeenCalledWith("94102", 2);
  });

  // ── Cache hit / miss ────────────────────────────────────────────────────────

  it("returns available:false with message when no cache entry exists", async () => {
    setupAuth("max");
    mockLookupFmr.mockResolvedValue(null);
    const res = await GET(makeRequest({ zip_code: "00000", bedrooms: "2" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { available: boolean; message: string };
    expect(body.available).toBe(false);
    expect(body.message).toBeTruthy();
  });

  it("returns comps data when cache hit", async () => {
    setupAuth("max");
    mockLookupFmr.mockResolvedValue(COMPS_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(200);
    const body = await res.json() as typeof COMPS_RESPONSE;
    expect(body.available).toBe(true);
    expect(body.marketMedian).toBe(1450);
    expect(body.comps).toHaveLength(1);
    expect(body.zip_code).toBe("94102");
    expect(body.bedrooms).toBe(2);
  });

  it("calls lookupFmr with validated zip_code and bedrooms", async () => {
    setupAuth("max");
    mockLookupFmr.mockResolvedValue(COMPS_RESPONSE);
    await GET(makeRequest({ zip_code: "10001", bedrooms: "3" }));
    expect(mockLookupFmr).toHaveBeenCalledWith("10001", 3);
  });

  // ── Rate limiting ───────────────────────────────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 30000 });
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many requests/i);
  });

  it("proceeds when rate limiting is disabled (local dev)", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(false);
    setupAuth("max");
    mockLookupFmr.mockResolvedValue(COMPS_RESPONSE);
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "2" }));
    expect(res.status).toBe(200);
  });

  // ── Studio / 0 bedrooms ─────────────────────────────────────────────────────

  it("accepts bedrooms=0 (studio)", async () => {
    setupAuth("max");
    mockLookupFmr.mockResolvedValue({ ...COMPS_RESPONSE, bedrooms: 0 });
    const res = await GET(makeRequest({ zip_code: "94102", bedrooms: "0" }));
    expect(res.status).toBe(200);
    expect(mockLookupFmr).toHaveBeenCalledWith("94102", 0);
  });
});
