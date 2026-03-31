import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockStripeCancelSubscription,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockStripeCancelSubscription = vi.fn().mockResolvedValue({});
  return {
    mockGetUser,
    mockFrom,
    mockSupabase,
    mockIsRateLimitingEnabled,
    mockStripeCancelSubscription,
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
  resolveRateLimiter: vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/stripe", () => ({
  default: {
    subscriptions: { cancel: mockStripeCancelSubscription },
  },
}));

import { POST } from "@/app/api/account/delete/route";

const USER_ID = "user-abc-123";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Build a Supabase chain mock for .from(table).select().eq().maybeSingle() */
function mockSelectChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

/** Build a Supabase chain mock for .from(table).update().eq() */
function mockUpdateChain(error: unknown = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  };
}

describe("POST /api/account/delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for wrong confirmation string", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    // Need to provide a chain for any from() calls, but validation should fail first
    const res = await POST(makeRequest({ confirmation: "delete" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("DELETE");
  });

  it("returns 400 for missing confirmation field", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("DELETE");
  });

  it("cancels Stripe subscription and soft-deletes account", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    // Track from() call order to return different chains per table/call
    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);

      if (table === "subscriptions") {
        // First subscriptions call = SELECT, second = UPDATE
        const subCalls = calls.filter((c) => c === "subscriptions");
        if (subCalls.length === 1) {
          return mockSelectChain({
            stripe_subscription_id: "sub_123",
            status: "active",
          });
        }
        return mockUpdateChain();
      }

      if (table === "user_profiles") {
        return mockUpdateChain();
      }

      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(mockStripeCancelSubscription).toHaveBeenCalledWith("sub_123");
  });

  it("soft-deletes account without Stripe when no subscription", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain(null);
      }
      if (table === "user_profiles") {
        return mockUpdateChain();
      }
      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(mockStripeCancelSubscription).not.toHaveBeenCalled();
  });

  it("skips Stripe cancel when subscription exists but is not active", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);

      if (table === "subscriptions") {
        const subCalls = calls.filter((c) => c === "subscriptions");
        if (subCalls.length === 1) {
          return mockSelectChain({
            stripe_subscription_id: "sub_456",
            status: "canceled",
          });
        }
        return mockUpdateChain();
      }

      if (table === "user_profiles") {
        return mockUpdateChain();
      }

      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(200);
    expect(mockStripeCancelSubscription).not.toHaveBeenCalled();
  });

  it("returns 500 when Stripe cancel fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain({
          stripe_subscription_id: "sub_fail",
          status: "active",
        });
      }
      return mockSelectChain(null);
    });

    mockStripeCancelSubscription.mockRejectedValue(new Error("Stripe error"));

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("cancel subscription");
  });

  it("returns 500 when profile soft-delete fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain(null);
      }
      if (table === "user_profiles") {
        return mockUpdateChain({ message: "DB error" });
      }
      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("delete account");
  });

  it("returns 500 when stripe_subscription_id is malformed", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain({
          stripe_subscription_id: "not-a-valid-id!",
          status: "active",
        });
      }
      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("cancel subscription");
    expect(mockStripeCancelSubscription).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    const req = new Request("http://localhost/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
