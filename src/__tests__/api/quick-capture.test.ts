import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup (must be before route imports) ────────────────────────────────

const {
  mockGetUser,
  mockSupabase,
  mockIsRateLimitingEnabled,
  mockLimit,
  mockGetClientIp,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockSupabase = { auth: { getUser: mockGetUser } };
  const mockIsRateLimitingEnabled = vi.fn().mockReturnValue(false);
  const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");
  return { mockGetUser, mockSupabase, mockIsRateLimitingEnabled, mockLimit, mockGetClientIp };
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

import { GET, POST } from "@/app/api/quick-capture/route";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function authUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
}

function anonUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/quick-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUser(); // default: authenticated
  });

  it("returns 401 for unauthenticated requests", async () => {
    anonUser();
    const listingUrl = "https://zillow.com/homes/12345_zpid";
    const response = await GET(
      new Request(`http://localhost:3001/api/quick-capture?url=${encodeURIComponent(listingUrl)}`)
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when url param is missing", async () => {
    const response = await GET(
      new Request("http://localhost:3001/api/quick-capture")
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("valid HTTP/HTTPS");
  });

  it("returns 400 for non-HTTP protocol", async () => {
    const response = await GET(
      new Request("http://localhost:3001/api/quick-capture?url=ftp://example.com")
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid URL", async () => {
    const response = await GET(
      new Request("http://localhost:3001/api/quick-capture?url=not-a-url")
    );
    expect(response.status).toBe(400);
  });

  it("redirects to calculator with valid listing URL", async () => {
    const listingUrl = "https://zillow.com/homes/12345_zpid";
    const response = await GET(
      new Request(`http://localhost:3001/api/quick-capture?url=${encodeURIComponent(listingUrl)}`)
    );
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/calculator");
    expect(location).toContain("importUrl=");
    expect(location).toContain("bookmarklet");
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const listingUrl = "https://zillow.com/homes/12345_zpid";
      const response = await GET(
        new Request(`http://localhost:3001/api/quick-capture?url=${encodeURIComponent(listingUrl)}`)
      );
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      const listingUrl = "https://zillow.com/homes/12345_zpid";
      const response = await GET(
        new Request(`http://localhost:3001/api/quick-capture?url=${encodeURIComponent(listingUrl)}`)
      );
      expect(response.status).not.toBe(429);
    });
  });
});

describe("POST /api/quick-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUser(); // default: authenticated
  });

  it("returns 401 for unauthenticated requests", async () => {
    anonUser();
    const response = await POST(
      new Request("http://localhost:3001/api/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://zillow.com/homes/123" }),
      })
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost:3001/api/quick-capture", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body.");
  });

  it("returns 400 for missing url field", async () => {
    const response = await POST(
      new Request("http://localhost:3001/api/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notUrl: "whatever" }),
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns redirect URL for valid listing URL", async () => {
    const listingUrl = "https://redfin.com/CA/San-Francisco/123-Main-St";
    const response = await POST(
      new Request("http://localhost:3001/api/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: listingUrl }),
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.redirectUrl).toContain("/calculator");
    expect(body.redirectUrl).toContain(encodeURIComponent(listingUrl));
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await POST(
        new Request("http://localhost:3001/api/quick-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://zillow.com/homes/123" }),
        })
      );
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      const listingUrl = "https://redfin.com/CA/San-Francisco/123-Main-St";
      const response = await POST(
        new Request("http://localhost:3001/api/quick-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: listingUrl }),
        })
      );
      expect(response.status).not.toBe(429);
    });
  });
});
