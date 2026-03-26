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

import { GET, PUT } from "@/app/api/watchlist-criteria/route";

function authUser(id = "user-123") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}
function anonUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

describe("GET /api/watchlist-criteria", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    anonUser();
    const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
    expect(response.status).toBe(401);
  });

  it("returns null criteria when user has no watchlist saved", async () => {
    authUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria).toBeNull();
  });

  it("returns criteria when found", async () => {
    authUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "crit-1", user_id: "user-123", city: "Austin", max_price: 500000, min_target_return: 8 },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.city).toBe("Austin");
    expect(body.criteria.maxPrice).toBe(500000);
  });

  it("soft-fails when watchlist_criteria table is missing", async () => {
    authUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "42P01", message: "relation watchlist_criteria does not exist" },
              }),
            }),
          }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
    expect(response.status).toBe(200); // soft-fail, not 400
    const body = await response.json();
    expect(body.criteria).toBeNull();
  });

  it("returns emailDigest: false when stored value is false", async () => {
    authUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "crit-1",
                  user_id: "user-123",
                  city: "Austin",
                  max_price: 500000,
                  min_target_return: 8,
                  email_digest: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.emailDigest).toBe(false);
  });

  it("returns emailDigest: true when stored value is true", async () => {
    authUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "crit-2",
                  user_id: "user-123",
                  city: "Denver",
                  max_price: null,
                  min_target_return: null,
                  email_digest: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.emailDigest).toBe(true);
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      authUser();
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      const response = await GET(new Request("http://localhost/api/watchlist-criteria"));
      expect(response.status).not.toBe(429);
    });
  });
});

describe("PUT /api/watchlist-criteria", () => {
  beforeEach(() => vi.clearAllMocks());

  function makePutRequest(body: unknown) {
    return new Request("http://localhost/api/watchlist-criteria", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 for unauthenticated requests", async () => {
    anonUser();
    const response = await PUT(makePutRequest({ city: "Austin" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    authUser();
    const response = await PUT(
      new Request("http://localhost/api/watchlist-criteria", {
        method: "PUT",
        body: "bad-json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when all criteria fields are empty", async () => {
    authUser();
    // All nulls/empty — should require at least one criterion
    const response = await PUT(makePutRequest({ city: "" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("at least one");
  });

  it("upserts criteria atomically (no TOCTOU — no prior select needed)", async () => {
    authUser();
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "new-1", user_id: "user-123", city: "Austin", max_price: null, min_target_return: 8 },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const response = await PUT(makePutRequest({ city: "Austin", minTargetReturn: 8 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.city).toBe("Austin");
    // Confirm upsert was called with onConflict: "user_id"
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123", city: "Austin" }),
      { onConflict: "user_id" }
    );
  });

  it("inserts new criteria when none exist for user", async () => {
    authUser();
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "new-1", user_id: "user-123", city: "Austin", max_price: null, min_target_return: 8 },
            error: null,
          }),
        }),
      }),
    });

    const response = await PUT(makePutRequest({ city: "Austin", minTargetReturn: 8 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.city).toBe("Austin");
  });

  it("updates existing criteria when user already has a record", async () => {
    authUser();
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "existing-1", user_id: "user-123", city: "Dallas", max_price: 300000, min_target_return: null },
            error: null,
          }),
        }),
      }),
    });

    const response = await PUT(makePutRequest({ city: "Dallas", maxPrice: 300000 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.city).toBe("Dallas");
    expect(body.criteria.maxPrice).toBe(300000);
  });

  it("persists emailDigest: true when provided", async () => {
    authUser();
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "new-1",
            user_id: "user-123",
            city: "Austin",
            max_price: null,
            min_target_return: 8,
            email_digest: true,
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const response = await PUT(makePutRequest({ city: "Austin", minTargetReturn: 8, emailDigest: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.emailDigest).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ email_digest: true }),
      { onConflict: "user_id" }
    );
  });

  it("persists emailDigest: false when provided as false", async () => {
    authUser();
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "new-1",
            user_id: "user-123",
            city: "Austin",
            max_price: null,
            min_target_return: null,
            email_digest: false,
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const response = await PUT(makePutRequest({ city: "Austin", emailDigest: false }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.criteria.emailDigest).toBe(false);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ email_digest: false }),
      { onConflict: "user_id" }
    );
  });

  it("defaults emailDigest to false when not provided", async () => {
    authUser();
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "new-1",
            user_id: "user-123",
            city: "Austin",
            max_price: null,
            min_target_return: null,
            email_digest: false,
          },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const response = await PUT(makePutRequest({ city: "Austin" }));
    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ email_digest: false }),
      { onConflict: "user_id" }
    );
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await PUT(makePutRequest({ city: "Austin" }));
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      authUser();
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "new-1", user_id: "user-123", city: "Austin", max_price: null, min_target_return: null },
              error: null,
            }),
          }),
        }),
      });

      const response = await PUT(makePutRequest({ city: "Austin" }));
      expect(response.status).not.toBe(429);
    });
  });
});
