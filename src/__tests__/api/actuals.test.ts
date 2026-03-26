import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup (must be before route imports) ────────────────────────────────

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

// ─── Import route handlers AFTER mocks ───────────────────────────────────────

import { GET, POST, DELETE } from "@/app/api/properties/[id]/actuals/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ACTUAL_UUID = "660e8400-e29b-41d4-a716-446655440001";
const INVALID_ID = "not-a-uuid";
const USER_ID = "user-123";

const VALID_BODY = {
  month: 3,
  year: 2026,
  actual_rent: 2100,
  actual_expenses: 1400,
};

// ─── Request factories ────────────────────────────────────────────────────────

function makeGetRequest(propertyId: string) {
  return new Request(`http://localhost/api/properties/${propertyId}/actuals`);
}

function makePostRequest(propertyId: string, body: unknown) {
  return new Request(`http://localhost/api/properties/${propertyId}/actuals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(propertyId: string, actualId?: string) {
  const url = actualId
    ? `http://localhost/api/properties/${propertyId}/actuals?actualId=${actualId}`
    : `http://localhost/api/properties/${propertyId}/actuals`;
  return new Request(url, { method: "DELETE" });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function mockAuthUser(userId = USER_ID) {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
}

function mockAnon() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ─── Subscription + property mock factories ───────────────────────────────────

function buildSubscriptionMock(planType: string | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: planType !== null ? { plan_type: planType } : null,
          error: null,
        }),
      }),
    }),
  };
}

function buildPropertyFoundMock(propertyId = VALID_UUID) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: propertyId },
            error: null,
          }),
        }),
      }),
    }),
  };
}

function buildPropertyNotFoundMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  };
}

// ─── Full mockFrom implementations ────────────────────────────────────────────

/**
 * Sets up mockFrom for authenticated Max user who owns the property,
 * with a custom monthly_actuals handler.
 */
function mockMaxUserWithProperty(
  actualsTableMock: () => Record<string, unknown>
): void {
  mockFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") return buildSubscriptionMock("max");
    if (table === "properties") return buildPropertyFoundMock();
    return actualsTableMock();
  });
}

// ─── GET /api/properties/[id]/actuals ─────────────────────────────────────────

describe("GET /api/properties/[id]/actuals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID property id", async () => {
    const response = await GET(makeGetRequest(INVALID_ID), makeContext(INVALID_ID));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid property ID.");
  });

  it("returns 401 for unauthenticated user", async () => {
    mockAnon();

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for free plan user", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock(null);
      return {};
    });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Max subscription required.");
  });

  it("returns 403 for pro plan user", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("pro");
      return {};
    });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Max subscription required.");
  });

  it("returns 404 when property not found or does not belong to user", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyNotFoundMock();
      return {};
    });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Property not found.");
  });

  it("returns actuals sorted descending for authenticated Max user who owns the property", async () => {
    mockAuthUser();
    const fakeActuals = [
      {
        id: ACTUAL_UUID,
        property_id: VALID_UUID,
        user_id: USER_ID,
        month: 12,
        year: 2026,
        actual_rent: 2200,
        actual_expenses: 1500,
        notes: null,
        created_at: "2026-12-01T00:00:00Z",
      },
      {
        id: "770e8400-e29b-41d4-a716-446655440002",
        property_id: VALID_UUID,
        user_id: USER_ID,
        month: 11,
        year: 2026,
        actual_rent: 2100,
        actual_expenses: 1400,
        notes: "November entry",
        created_at: "2026-11-01T00:00:00Z",
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      // monthly_actuals
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: fakeActuals, error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.actuals).toHaveLength(2);
    expect(body.actuals[0].month).toBe(12);
    expect(body.actuals[1].month).toBe(11);
  });

  it("returns empty array when no actuals exist", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.actuals).toEqual([]);
  });

  it("returns 500 on DB error when querying monthly_actuals", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "connection timeout" },
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to load actuals.");
  });
});

// ─── POST /api/properties/[id]/actuals ────────────────────────────────────────

describe("POST /api/properties/[id]/actuals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID property id", async () => {
    const response = await POST(
      makePostRequest(INVALID_ID, VALID_BODY),
      makeContext(INVALID_ID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid property ID.");
  });

  it("returns 400 for invalid JSON body", async () => {
    mockAuthUser();
    const request = new Request(
      `http://localhost/api/properties/${VALID_UUID}/actuals`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json{{{",
      }
    );

    const response = await POST(request, makeContext(VALID_UUID));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body.");
  });

  it("returns 400 for missing required field (no month)", async () => {
    mockAuthUser();
    const { month: _month, ...bodyWithoutMonth } = VALID_BODY;

    const response = await POST(
      makePostRequest(VALID_UUID, bodyWithoutMonth),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
    expect(body.details).toBeDefined();
  });

  it("returns 400 for invalid month (0 — below minimum)", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, month: 0 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for invalid month (13 — above maximum)", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, month: 13 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for invalid year (2019 — below minimum)", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, year: 2019 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for invalid year (far future — above rolling maximum)", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, year: 9999 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for negative actual_rent", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, actual_rent: -1 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for actual_rent above max (10,000,001)", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, actual_rent: 10_000_001 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 400 for actual_expenses above max (10,000,001)", async () => {
    mockAuthUser();

    const response = await POST(
      makePostRequest(VALID_UUID, { ...VALID_BODY, actual_expenses: 10_000_001 }),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input.");
  });

  it("returns 401 for unauthenticated user", async () => {
    mockAnon();

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-Max user (free plan)", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock(null);
      return {};
    });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Max subscription required.");
  });

  it("returns 403 for non-Max user (pro plan)", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("pro");
      return {};
    });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Max subscription required.");
  });

  it("returns 404 when property not found", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyNotFoundMock();
      return {};
    });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Property not found.");
  });

  it("returns 409 on unique violation (month+year already exists)", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      // monthly_actuals — unique constraint violation
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23505", message: "duplicate key value" },
            }),
          }),
        }),
      };
    });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe(
      "Actuals for this month and year already exist. Delete the existing entry first."
    );
  });

  it("returns 201 with actual on success (including optional notes)", async () => {
    mockAuthUser();
    const bodyWithNotes = { ...VALID_BODY, notes: "Good month" };
    const savedActual = {
      id: ACTUAL_UUID,
      property_id: VALID_UUID,
      user_id: USER_ID,
      month: VALID_BODY.month,
      year: VALID_BODY.year,
      actual_rent: VALID_BODY.actual_rent,
      actual_expenses: VALID_BODY.actual_expenses,
      notes: "Good month",
      created_at: "2026-03-20T00:00:00Z",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: savedActual, error: null }),
          }),
        }),
      };
    });

    const response = await POST(
      makePostRequest(VALID_UUID, bodyWithNotes),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.actual).toBeDefined();
    expect(body.actual.id).toBe(ACTUAL_UUID);
    expect(body.actual.month).toBe(VALID_BODY.month);
    expect(body.actual.year).toBe(VALID_BODY.year);
    expect(body.actual.actual_rent).toBe(VALID_BODY.actual_rent);
    expect(body.actual.notes).toBe("Good month");
  });

  it("returns 201 with null notes when notes omitted from request", async () => {
    mockAuthUser();
    const savedActual = {
      id: ACTUAL_UUID,
      property_id: VALID_UUID,
      user_id: USER_ID,
      month: VALID_BODY.month,
      year: VALID_BODY.year,
      actual_rent: VALID_BODY.actual_rent,
      actual_expenses: VALID_BODY.actual_expenses,
      notes: null,
      created_at: "2026-03-20T00:00:00Z",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: savedActual, error: null }),
          }),
        }),
      };
    });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.actual.notes).toBeNull();
  });

  it("returns 500 on non-unique DB error", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      if (table === "properties") return buildPropertyFoundMock();
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "42501", message: "permission denied" },
            }),
          }),
        }),
      };
    });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to save actuals.");
  });
});

// ─── DELETE /api/properties/[id]/actuals?actualId=... ─────────────────────────

describe("DELETE /api/properties/[id]/actuals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID property id", async () => {
    const response = await DELETE(
      makeDeleteRequest(INVALID_ID, ACTUAL_UUID),
      makeContext(INVALID_ID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid property ID.");
  });

  it("returns 400 when actualId query param is missing", async () => {
    mockAnon();
    const response = await DELETE(
      makeDeleteRequest(VALID_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid actual ID.");
  });

  it("returns 400 for invalid actualId UUID", async () => {
    mockAnon();
    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, "not-a-uuid"),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid actual ID.");
  });

  it("returns 401 for unauthenticated user", async () => {
    mockAnon();

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-Max user (free plan)", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock(null);
      return {};
    });

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Max subscription required.");
  });

  it("returns 403 for non-Max user (pro plan)", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("pro");
      return {};
    });

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Max subscription required.");
  });

  it("returns 500 on DB error during delete", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      // monthly_actuals delete fails
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: "foreign key violation" },
              }),
            }),
          }),
        }),
      };
    });

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to delete actual.");
  });

  it("returns 200 success on valid delete for Max user", async () => {
    mockAuthUser();
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      };
    });

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("does not query properties table — uses RLS triple-eq for ownership check in single delete statement", async () => {
    mockAuthUser();
    let deleteTableCalled = false;
    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return buildSubscriptionMock("max");
      // Only monthly_actuals should be touched — properties table is NOT queried in DELETE
      if (table === "monthly_actuals") {
        deleteTableCalled = true;
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
        };
      }
      // Fail if properties is accessed — DELETE handler doesn't need to verify ownership separately
      return {};
    });

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(200);
    expect(deleteTableCalled).toBe(true);
  });
});

// ─── Shared: rate limiting ────────────────────────────────────────────────────

describe("rate limiting across all handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 429 with Retry-After header when rate limit exceeded", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).toBe(429);
    const retryAfter = response.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("POST returns 429 with Retry-After header when rate limit exceeded", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

    const response = await POST(
      makePostRequest(VALID_UUID, VALID_BODY),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(429);
    const retryAfter = response.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("DELETE returns 429 with Retry-After header when rate limit exceeded", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(true);
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

    const response = await DELETE(
      makeDeleteRequest(VALID_UUID, ACTUAL_UUID),
      makeContext(VALID_UUID)
    );

    expect(response.status).toBe(429);
    const retryAfter = response.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("passes through when rate limiting is disabled", async () => {
    mockIsRateLimitingEnabled.mockReturnValue(false);
    mockAnon();

    // Even unauthenticated — it should NOT be 429
    const response = await GET(makeGetRequest(VALID_UUID), makeContext(VALID_UUID));

    expect(response.status).not.toBe(429);
  });
});
