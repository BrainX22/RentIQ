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
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
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

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/deal-matches/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = "user-abc-123";
const MATCH_ID = "550e8400-e29b-41d4-a716-446655440000";

const DEAL_MATCH = {
  id: MATCH_ID,
  user_id: USER_ID,
  property_id: "prop-uuid-001",
  property_name: "123 Main St",
  property_price: 350000,
  est_monthly_cash_flow: 450,
  est_cash_on_cash_return: 8.2,
  deal_score_value: 82,
  deal_grade: "B",
  matched_at: "2026-03-20T12:00:00Z",
  dismissed_at: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest() {
  return new Request("http://localhost/api/deal-matches");
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/deal-matches", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Sets up the mock chain for GET (two .from() calls):
 *   1st call → subscriptions (plan gate)
 *   2nd call → deal_matches (query)
 *
 * Uses mockImplementation with a counter so clearAllMocks() in beforeEach
 * doesn't leave stale queued values (avoids mockReturnValueOnce pitfalls).
 */
function setupGetAuth(planType = "max", status = "active", matches = [DEAL_MATCH]) {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });

  const subChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { plan_type: planType, status },
      error: null,
    }),
  };

  const matchesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: matches, error: null }),
  };

  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    return callCount === 1 ? subChain : matchesChain;
  });

  return { subChain, matchesChain };
}

/**
 * Sets up the mock chain for PATCH (two .from() calls):
 *   1st call → subscriptions (plan gate)
 *   2nd call → deal_matches (update)
 *
 * The update chain: .update(payload).eq(id).eq(user_id) — the last awaited
 * expression is the second .eq() call, which resolves to { data, error }.
 */
function setupPatchAuth(planType = "max", status = "active") {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });

  const subChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { plan_type: planType, status },
      error: null,
    }),
  };

  // .update().eq(id).eq(user_id) — second .eq() must be thenable
  const innerEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const outerEq = vi.fn().mockReturnValue({ eq: innerEq });
  const updateChain = {
    update: vi.fn().mockReturnValue({ eq: outerEq }),
  };

  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    return callCount === 1 ? subChain : updateChain;
  });

  return { subChain, updateChain, outerEq, innerEq };
}

// ─── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/deal-matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimitingEnabled.mockReturnValue(false);
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  // ── Plan gate ─────────────────────────────────────────────────────────────

  it("returns 403 for Free plan users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { plan_type: "free", status: "active" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(subChain);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Max/i);
  });

  it("returns 403 for Pro plan users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { plan_type: "pro", status: "active" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(subChain);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("returns 403 for cancelled Max users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { plan_type: "max", status: "canceled" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(subChain);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it("returns matches array for active Max users", async () => {
    setupGetAuth("max", "active", [DEAL_MATCH]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { matches: typeof DEAL_MATCH[] } };
    expect(body.data.matches).toHaveLength(1);
    expect(body.data.matches[0].id).toBe(MATCH_ID);
    expect(body.data.matches[0].deal_grade).toBe("B");
  });

  it("returns matches array for trialing Max users", async () => {
    setupGetAuth("max", "trialing", [DEAL_MATCH]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { matches: typeof DEAL_MATCH[] } };
    expect(body.data.matches).toHaveLength(1);
  });

  // ── Query filters ─────────────────────────────────────────────────────────

  it("excludes matches where dismissed_at IS NOT NULL", async () => {
    const { matchesChain } = setupGetAuth("max", "active", [DEAL_MATCH]);
    await GET(makeGetRequest());
    // The query chain must call .is("dismissed_at", null) to exclude dismissed matches
    expect(matchesChain.is).toHaveBeenCalledWith("dismissed_at", null);
    expect(matchesChain.gt).toHaveBeenCalledWith("matched_at", expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 503 when rate limiter throws (Redis error)", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockRejectedValueOnce(new Error("Redis connection refused"));
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/temporarily unavailable/i);
  });
});

// ─── PATCH tests ──────────────────────────────────────────────────────────────

describe("PATCH /api/deal-matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimitingEnabled.mockReturnValue(false);
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatchRequest({ matchId: MATCH_ID }));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  // ── Plan gate ─────────────────────────────────────────────────────────────

  it("returns 403 for Free plan users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    const subChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { plan_type: "free", status: "active" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(subChain);
    const res = await PATCH(makePatchRequest({ matchId: MATCH_ID }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Max/i);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 for invalid matchId (non-UUID string)", async () => {
    setupPatchAuth("max", "active");
    const res = await PATCH(makePatchRequest({ matchId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 for missing matchId", async () => {
    setupPatchAuth("max", "active");
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid request body");
  });

  it("does not expose Zod field errors in validation response", async () => {
    setupPatchAuth("max", "active");
    const res = await PATCH(makePatchRequest({ matchId: "bad" }));
    const body = await res.json() as { error: string };
    expect(body.error).not.toMatch(/ZodError/i);
    expect(body.error).not.toMatch(/fieldErrors/i);
    expect(body.error).not.toMatch(/uuid/i);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it("successfully dismisses a match", async () => {
    setupPatchAuth("max", "active");
    const res = await PATCH(makePatchRequest({ matchId: MATCH_ID }));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { dismissed: boolean } };
    expect(body.data.dismissed).toBe(true);
  });
});
