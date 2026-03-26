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

import { POST } from "@/app/api/listing-import/route";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function authUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@test.com" } } });
}

function anonUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/listing-import", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockIsRateLimitingEnabled.mockReturnValue(false);
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    authUser(); // default: authenticated
  });

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/listing-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 for unauthenticated requests", async () => {
    anonUser();
    const response = await POST(makeRequest({ url: "https://zillow.com/homes/123" }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/listing-import", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body.");
  });

  it("returns 400 when url is missing", async () => {
    const response = await POST(makeRequest({ notUrl: "whatever" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("A valid URL is required.");
  });

  it("returns 400 for non-HTTP protocol URL", async () => {
    const response = await POST(makeRequest({ url: "ftp://evil.com/listing" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("HTTP/HTTPS");
  });

  it("returns 400 when URL is not from an allowed listing domain", async () => {
    const response = await POST(makeRequest({ url: "https://evil.com/listing" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("supported real-estate listing site");
  });

  it("returns 400 when fetch returns a redirect to an off-allowlist host", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, {
        status: 301,
        headers: { location: "https://evil.com/malicious" },
      })
    );

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/redirect" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("supported real-estate listing site");
  });

  it("returns 400 when fetch returns a redirect with no location header", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 302 })
    );

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/redirect-no-loc" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("redirect");
  });

  it("returns 400 when content-length exceeds 2MB", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("<html></html>", {
        status: 200,
        headers: { "content-length": "3000000" },
      })
    );

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/huge" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("too large");
  });

  it("returns 400 when the listing URL fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 404 })
    );

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/404" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("404");
  });

  it("returns extracted data from HTML with JSON-LD", async () => {
    const mockHtml = `
      <html><body>
      <script type="application/ld+json">
      {
        "@type": "SingleFamilyResidence",
        "offers": { "price": "350000" },
        "address": { "streetAddress": "123 Main St", "addressLocality": "Austin", "addressRegion": "TX" }
      }
      </script>
      </body></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(mockHtml, { status: 200 })
    );

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/123" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sourceUrl).toBe("https://www.zillow.com/homedetails/123");
    expect(body.extracted.propertyPrice).toBe(350000);
    expect(body.extracted.address).toContain("123 Main St");
  });

  it("returns empty extracted data and notes when no JSON-LD found", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("<html><body>No JSON-LD here</body></html>", { status: 200 })
    );

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/no-jsonld" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.extracted).toEqual({});
    expect(body.notes).toContain("No JSON-LD data found on the page.");
  });

  it("handles JSON-LD that is an array of objects", async () => {
    // Covers the Array.isArray branch in extractJsonLdBlocks
    const mockHtml = `
      <html><body>
      <script type="application/ld+json">
      [
        { "@type": "WebPage" },
        { "@type": "SingleFamilyResidence", "offers": { "price": 425000 } }
      ]
      </script>
      </body></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(mockHtml, { status: 200 }));

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/array" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.extracted.propertyPrice).toBe(425000);
  });

  it("handles @type as an array of strings for listing type detection", async () => {
    // Covers the Array.isArray branch in isListingType + findListingLikeObject
    const mockHtml = `
      <html><body>
      <script type="application/ld+json">
      {
        "@type": ["Product", "SingleFamilyResidence"],
        "offers": { "price": 375000 },
        "address": {
          "streetAddress": "456 Oak Ave",
          "addressLocality": "Seattle",
          "addressRegion": "WA",
          "postalCode": "98101"
        }
      }
      </script>
      </body></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(mockHtml, { status: 200 }));

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/arraytype" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.extracted.propertyPrice).toBe(375000);
    // Address with multiple parts joined
    expect(body.extracted.address).toContain("456 Oak Ave");
    expect(body.extracted.address).toContain("Seattle");
  });

  it("extracts address as a plain string when provided directly", async () => {
    const mockHtml = `
      <html><body>
      <script type="application/ld+json">
      {
        "@type": "SingleFamilyResidence",
        "address": "789 Pine Rd, Denver, CO 80202",
        "offers": { "price": 299000 }
      }
      </script>
      </body></html>
    `;
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(mockHtml, { status: 200 }));

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/straddr" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.extracted.address).toBe("789 Pine Rd, Denver, CO 80202");
  });

  it("returns 500 when fetch throws unexpectedly", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/listing" }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Import failed");
  });

  it("returns 500 when external fetch times out", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(
      new DOMException("The operation was aborted.", "AbortError")
    );

    const response = await POST(makeRequest({ url: "https://zillow.com/homes/slow-listing" }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Import failed");
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(true);
      mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

      const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/listing" }));
      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).not.toBeNull();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it("passes through when rate limiting is disabled (isRateLimitingEnabled returns false)", async () => {
      mockIsRateLimitingEnabled.mockReturnValue(false);
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response("<html><body>No JSON-LD here</body></html>", { status: 200 })
      );

      const response = await POST(makeRequest({ url: "https://www.zillow.com/homedetails/listing" }));
      expect(response.status).not.toBe(429);
    });
  });
});
