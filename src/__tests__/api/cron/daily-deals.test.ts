import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────

const {
  mockAdminFrom,
  mockGetUserById,
  mockAdminClient,
  mockCreateAdminClient,
  mockFilterMatchingProperties,
  mockSendDailyDigest,
} = vi.hoisted(() => {
  const mockAdminFrom = vi.fn();
  const mockGetUserById = vi.fn();
  const mockAdminClient = {
    from: mockAdminFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  };
  const mockCreateAdminClient = vi.fn().mockReturnValue(mockAdminClient);
  const mockFilterMatchingProperties = vi.fn();
  const mockSendDailyDigest = vi.fn();
  return {
    mockAdminFrom,
    mockGetUserById,
    mockAdminClient,
    mockCreateAdminClient,
    mockFilterMatchingProperties,
    mockSendDailyDigest,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/deal-finder/auto-calculator", () => ({
  filterMatchingProperties: mockFilterMatchingProperties,
  DEAL_FINDER_WINDOW_DAYS: 7,
}));

vi.mock("@/lib/email/daily-digest", () => ({
  sendDailyDigest: mockSendDailyDigest,
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { GET } from "@/app/api/cron/daily-deals/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CRON_SECRET = "test-cron-secret-abc";
const USER_ID = "user-max-001";
const USER_EMAIL = "investor@example.com";

const BASE_PROPERTY = {
  id: "prop-001",
  user_id: USER_ID,
  property_name: "123 Oak St, Austin",
  property_price: 350_000,
  down_payment_percent: 20,
  interest_rate: 7.0,
  loan_term_years: 30,
  monthly_rent: 2800,
  property_tax_yearly: 4200,
  insurance_monthly: 100,
  hoa_fees_monthly: 0,
  maintenance_percent: 5,
  vacancy_percent: 5,
  monthly_cash_flow: 600,
  annual_cash_flow: 7200,
  cash_on_cash_return: 10.5,
  noi: 25_200,
  monthly_mortgage: 1862,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PASSING_DEAL = {
  ...BASE_PROPERTY,
  dealScore: 82,
  dealGrade: "B" as const,
};

const ELIGIBLE_USER_ROW = {
  user_id: USER_ID,
  plan_type: "max",
  status: "active",
  watchlist_criteria: {
    city: "Austin",
    max_price: 500_000,
    min_target_return: 5,
    email_digest: true,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {
    host: "rpc.app",
  };
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new Request("http://localhost/api/cron/daily-deals", { headers });
}

function makeAuthedRequest(): Request {
  return makeRequest(`Bearer ${CRON_SECRET}`);
}

/**
 * Sets up the admin client mock for the main query path:
 *   from("subscriptions") → eligibleUsers
 *   from("properties") → properties for user
 *   from("deal_matches") → upsert (for each passing deal)
 */
function setupEligibleUsersQuery(rows: object[]) {
  const subChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return subChain;
}

function setupPropertiesQuery(properties: object[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: properties, error: null }),
  };
}

function setupUpsertChain() {
  return {
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/daily-deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    mockSendDailyDigest.mockResolvedValue({ success: true });
    mockFilterMatchingProperties.mockReturnValue([]);
    mockGetUserById.mockResolvedValue({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
    });
  });

  // ── Auth: CRON_SECRET env not set ─────────────────────────────────────────

  it("returns 500 when CRON_SECRET env var is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Server misconfiguration");
  });

  // ── Auth: missing Authorization header ───────────────────────────────────

  it("returns 401 when Authorization header is missing", async () => {
    const res = await GET(makeRequest(undefined));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  // ── Auth: wrong Authorization header value ───────────────────────────────

  it("returns 401 when Authorization header has wrong value", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  // ── Auth: correct format but wrong token value ───────────────────────────

  it("returns 401 when Bearer token is correct format but wrong value", async () => {
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}-extra`));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  // ── No eligible users ─────────────────────────────────────────────────────

  it("returns zero counts when no eligible users", async () => {
    const subChain = setupEligibleUsersQuery([]);
    mockAdminFrom.mockReturnValue(subChain);

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { processed: number; matched: number; emailed: number } };
    expect(body.data).toEqual({ processed: 0, matched: 0, emailed: 0 });
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
  });

  // ── One user with matching deals ──────────────────────────────────────────

  it("returns correct counts when one user has matching A/B deals", async () => {
    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      if (table === "properties") return setupPropertiesQuery([BASE_PROPERTY]);
      return setupUpsertChain(); // deal_matches upsert
    });

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { processed: number; matched: number; emailed: number } };
    expect(body.data.processed).toBe(1);
    expect(body.data.matched).toBe(1);
    expect(body.data.emailed).toBe(1);
  });

  // ── sendDailyDigest called with correct args ──────────────────────────────

  it("calls sendDailyDigest with correct to, matches, and appUrl", async () => {
    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      if (table === "properties") return setupPropertiesQuery([BASE_PROPERTY]);
      return setupUpsertChain();
    });

    await GET(makeAuthedRequest());

    expect(mockSendDailyDigest).toHaveBeenCalledOnce();
    const call = mockSendDailyDigest.mock.calls[0][0] as {
      to: string;
      matches: object[];
      appUrl: string;
    };
    expect(call.to).toBe(USER_EMAIL);
    expect(call.matches).toHaveLength(1);
    // appUrl derived from request host when NEXT_PUBLIC_APP_URL is not set
    expect(call.appUrl).toContain("rpc.app");
  });

  // ── No email when no passing deals ───────────────────────────────────────

  it("does NOT call sendDailyDigest when user has no passing deals", async () => {
    mockFilterMatchingProperties.mockReturnValue([]); // no A/B deals

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      return setupPropertiesQuery([BASE_PROPERTY]); // properties exist but none pass
    });

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    expect(mockSendDailyDigest).not.toHaveBeenCalled();
    const body = await res.json() as { data: { processed: number; matched: number; emailed: number } };
    expect(body.data.emailed).toBe(0);
  });

  // ── Error isolation: one user fails, others continue ─────────────────────

  it("continues processing other users when one user throws an error", async () => {
    const USER_2_ID = "user-max-002";
    const USER_2_EMAIL = "second@example.com";
    const user2Row = {
      ...ELIGIBLE_USER_ROW,
      user_id: USER_2_ID,
    };

    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL]);

    // Track properties query calls per user to route correctly
    const propertiesCallUsers: string[] = [];
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return setupEligibleUsersQuery([ELIGIBLE_USER_ROW, user2Row]);
      }
      if (table === "properties") {
        // First properties call (user-max-001) — throw to simulate error
        // Second properties call (user-max-002) — succeeds
        propertiesCallUsers.push("call");
        if (propertiesCallUsers.length === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            limit: vi.fn().mockRejectedValue(new Error("DB timeout")),
          };
        }
        return setupPropertiesQuery([BASE_PROPERTY]);
      }
      return setupUpsertChain();
    });

    // Second user has a valid email
    mockGetUserById.mockImplementation((id: string) => {
      if (id === USER_2_ID) {
        return Promise.resolve({ data: { user: { id: USER_2_ID, email: USER_2_EMAIL } } });
      }
      return Promise.resolve({ data: { user: { id, email: USER_EMAIL } } });
    });

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    // Second user should still have been processed
    expect(mockSendDailyDigest).toHaveBeenCalledOnce();
    const body = await res.json() as { data: { processed: number; emailed: number } };
    expect(body.data.emailed).toBe(1);
  });

  // ── filterMatchingProperties called with correct args ────────────────────

  it("calls filterMatchingProperties with correct property list and criteria", async () => {
    mockFilterMatchingProperties.mockReturnValue([]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      return setupPropertiesQuery([BASE_PROPERTY]);
    });

    await GET(makeAuthedRequest());

    expect(mockFilterMatchingProperties).toHaveBeenCalledOnce();
    const [propsArg, criteriaArg] = mockFilterMatchingProperties.mock.calls[0] as [
      object[],
      { city: string | null; max_price: number | null; min_target_return: number | null }
    ];
    expect(propsArg).toEqual([BASE_PROPERTY]);
    expect(criteriaArg).toEqual({
      city: "Austin",
      max_price: 500_000,
      min_target_return: 5,
    });
  });

  // ── deal_matches upsert called with correct fields ────────────────────────

  it("UPSERTs into deal_matches with correct fields", async () => {
    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL]);

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      if (table === "properties") return setupPropertiesQuery([BASE_PROPERTY]);
      return { upsert: upsertMock };
    });

    await GET(makeAuthedRequest());

    expect(upsertMock).toHaveBeenCalledOnce();
    const [payload, options] = upsertMock.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>
    ];
    expect(payload.user_id).toBe(USER_ID);
    expect(payload.property_id).toBe(BASE_PROPERTY.id);
    expect(payload.property_name).toBe(BASE_PROPERTY.property_name);
    expect(payload.property_price).toBe(BASE_PROPERTY.property_price);
    expect(payload.est_monthly_cash_flow).toBe(PASSING_DEAL.monthly_cash_flow);
    expect(payload.deal_score_value).toBe(PASSING_DEAL.dealScore);
    expect(payload.deal_grade).toBe(PASSING_DEAL.dealGrade);
    expect(payload.matched_at).toBeDefined();
    expect(options).toMatchObject({
      onConflict: "user_id,property_id",
      ignoreDuplicates: true,
    });
  });

  // ── Multiple passing deals — all upserted ─────────────────────────────────

  it("upserts all passing deals and counts them correctly", async () => {
    const deal2 = { ...PASSING_DEAL, id: "prop-002", property_name: "456 Elm Ave, Austin", dealScore: 90, dealGrade: "A" as const };
    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL, deal2]);

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      if (table === "properties") return setupPropertiesQuery([BASE_PROPERTY]);
      return { upsert: upsertMock };
    });

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { matched: number } };
    expect(body.data.matched).toBe(2);
    expect(upsertMock).toHaveBeenCalledTimes(2);
  });

  // ── Upsert error path: failed upserts are not counted ────────────────────

  it("continues but does not count failed upserts", async () => {
    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL]);

    const upsertMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "constraint violation" },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([ELIGIBLE_USER_ROW]);
      if (table === "properties") return setupPropertiesQuery([BASE_PROPERTY]);
      return { upsert: upsertMock };
    });

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { matched: number; processed: number; emailed: number } };
    // Upsert failed — matchedCount should not be incremented
    expect(body.data.matched).toBe(0);
    // processedCount still increments (user was processed)
    expect(body.data.processed).toBe(1);
  });

  // ── watchlist_criteria as array (Supabase !inner join variant) ───────────

  it("handles watchlist_criteria returned as array by Supabase", async () => {
    mockFilterMatchingProperties.mockReturnValue([PASSING_DEAL]);

    const userRowWithArrayWc = {
      ...ELIGIBLE_USER_ROW,
      watchlist_criteria: [ELIGIBLE_USER_ROW.watchlist_criteria],
    };

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return setupEligibleUsersQuery([userRowWithArrayWc]);
      if (table === "properties") return setupPropertiesQuery([BASE_PROPERTY]);
      return setupUpsertChain();
    });

    const res = await GET(makeAuthedRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { processed: number } };
    // Should process the user correctly even when wc is wrapped in array
    expect(body.data.processed).toBe(1);
  });
});
