import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  return { mockGetUser, mockFrom, mockSupabase, mockIsRateLimitingEnabled, mockLimit, mockGetClientIp };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimitingEnabled: mockIsRateLimitingEnabled,
  resolveRateLimiter: vi.fn().mockReturnValue({ limit: mockLimit }),
  getClientIp: mockGetClientIp,
}));

import { GET } from "@/app/api/daily-digest/route";

function authUser(id = "user-123") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function mockDigestData({
  criteria = null as null | { city: string | null; max_price: number | null; min_target_return: number | null },
  criteriaError = null as null | { code?: string; message?: string },
  properties = [] as object[],
  propertiesError = null as null | { message: string },
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "watchlist_criteria") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: criteria, error: criteriaError }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "properties") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: properties, error: propertiesError }),
              }),
            }),
          }),
        }),
      };
    }
    return {};
  });
}

describe("GET /api/daily-digest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await GET(new Request("http://localhost/api/daily-digest"));
    expect(response.status).toBe(401);
  });

  it("returns empty digest with note when user has no watchlist criteria", async () => {
    authUser();
    mockDigestData({ criteria: null, properties: [] });

    const response = await GET(new Request("http://localhost/api/daily-digest"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches).toHaveLength(0);
    expect(body.criteria).toBeNull();
    expect(body.notes).toContain("Save watchlist criteria to enable daily matching.");
  });

  it("soft-fails when watchlist_criteria table is missing", async () => {
    authUser();
    mockDigestData({
      criteria: null,
      criteriaError: { code: "42P01", message: "relation watchlist_criteria does not exist" },
      properties: [],
    });

    const response = await GET(new Request("http://localhost/api/daily-digest"));
    expect(response.status).toBe(200); // not 400
    const body = await response.json();
    expect(body.criteria).toBeNull();
  });

  it("returns 400 when properties query fails", async () => {
    authUser();
    mockDigestData({
      criteria: { city: "Austin", max_price: null, min_target_return: null },
      propertiesError: { message: "DB error" },
    });

    const response = await GET(new Request("http://localhost/api/daily-digest"));
    expect(response.status).toBe(400);
  });

  it("filters properties by criteria and returns matches with deal grade", async () => {
    authUser();
    const properties = [
      {
        id: "prop-1",
        property_name: "Austin House",
        property_price: 300_000,
        monthly_cash_flow: 500,
        cash_on_cash_return: 10,
        noi: 15_000,
        created_at: new Date().toISOString(),
      },
      {
        id: "prop-2",
        property_name: "Dallas Condo",  // won't match "Austin" city filter
        property_price: 200_000,
        monthly_cash_flow: 300,
        cash_on_cash_return: 8,
        noi: 12_000,
        created_at: new Date().toISOString(),
      },
    ];
    mockDigestData({
      criteria: { city: "Austin", max_price: 500_000, min_target_return: 5 },
      properties,
    });

    const response = await GET(new Request("http://localhost/api/daily-digest"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].propertyName).toBe("Austin House");
    expect(body.matches[0].dealGrade).toMatch(/^[ABCD]$/);
    expect(body.matches[0].dealScore).toBeGreaterThanOrEqual(0);
  });

  it("returns all properties when no filters are set (null criteria fields)", async () => {
    authUser();
    const properties = [
      {
        id: "prop-1",
        property_name: "House A",
        property_price: 300_000,
        monthly_cash_flow: 200,
        cash_on_cash_return: 7,
        noi: 14_000,
        created_at: new Date().toISOString(),
      },
    ];
    mockDigestData({
      criteria: { city: null, max_price: null, min_target_return: null },
      properties,
    });

    const response = await GET(new Request("http://localhost/api/daily-digest"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches).toHaveLength(1);
    expect(body.totalNewProperties).toBe(1);
  });

  it("response includes generatedAt timestamp and windowHours", async () => {
    authUser();
    mockDigestData({ criteria: null });

    const response = await GET(new Request("http://localhost/api/daily-digest"));
    const body = await response.json();
    expect(body.generatedAt).toBeDefined();
    expect(body.windowHours).toBe(24);
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await GET(new Request("http://localhost/api/daily-digest"));
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      authUser();
      mockDigestData({ criteria: null, properties: [] });

      const response = await GET(new Request("http://localhost/api/daily-digest"));
      expect(response.status).not.toBe(429);
    });
  });
});
