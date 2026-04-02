import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockCancelLsSubscription,
  mockSignInWithPassword,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSignInWithPassword = vi.fn().mockResolvedValue({ error: null });
  const mockSupabase = {
    auth: { getUser: mockGetUser, signInWithPassword: mockSignInWithPassword },
    from: mockFrom,
  };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockCancelLsSubscription = vi.fn().mockResolvedValue(undefined);
  return {
    mockGetUser,
    mockFrom,
    mockSupabase,
    mockIsRateLimitingEnabled,
    mockCancelLsSubscription,
    mockSignInWithPassword,
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
  getAccountDeleteByUserLimiter: vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }),
  }),
}));

vi.mock("@/lib/lemonsqueezy", () => ({
  cancelLsSubscription: mockCancelLsSubscription,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }),
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
    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for wrong confirmation string", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    const res = await POST(makeRequest({ confirmation: "delete", currentPassword: "testpassword" }));
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

  it("returns 400 when currentPassword is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });

    const res = await POST(makeRequest({ confirmation: "DELETE" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when password is incorrect", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const { POST } = await import("@/app/api/account/delete/route");
    const req = new Request("http://localhost/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE", currentPassword: "wrongpass" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/incorrect password/i);
  });

  it("cancels LS subscription and soft-deletes account", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);

      if (table === "subscriptions") {
        const subCalls = calls.filter((c) => c === "subscriptions");
        if (subCalls.length === 1) {
          return mockSelectChain({
            ls_subscription_id: "2022684",
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

    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(mockCancelLsSubscription).toHaveBeenCalledWith("2022684");
  });

  it("soft-deletes account without LS cancel when no subscription", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain(null);
      }
      if (table === "user_profiles") {
        return mockUpdateChain();
      }
      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(mockCancelLsSubscription).not.toHaveBeenCalled();
  });

  it("skips LS cancel when subscription exists but is not active", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);

      if (table === "subscriptions") {
        const subCalls = calls.filter((c) => c === "subscriptions");
        if (subCalls.length === 1) {
          return mockSelectChain({
            ls_subscription_id: "2022684",
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

    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(200);
    expect(mockCancelLsSubscription).not.toHaveBeenCalled();
  });

  it("returns 500 when LS cancel fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain({
          ls_subscription_id: "2022684",
          status: "active",
        });
      }
      return mockSelectChain(null);
    });

    mockCancelLsSubscription.mockRejectedValue(new Error("LemonSqueezy cancel error"));

    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("cancel subscription");
  });

  it("returns 500 when profile soft-delete fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain(null);
      }
      if (table === "user_profiles") {
        return mockUpdateChain({ message: "DB error" });
      }
      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("delete account");
  });

  it("returns 500 when ls_subscription_id is malformed (non-numeric)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "test@example.com" } },
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return mockSelectChain({
          ls_subscription_id: "invalid-id",
          status: "active",
        });
      }
      return mockSelectChain(null);
    });

    const res = await POST(makeRequest({ confirmation: "DELETE", currentPassword: "testpassword" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("cancel subscription");
    expect(mockCancelLsSubscription).not.toHaveBeenCalled();
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
