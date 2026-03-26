import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock @upstash/redis and @upstash/ratelimit ───────────────────────────────
// These are mocked before any module that imports them is loaded.

vi.mock("@upstash/redis", () => ({
  // Must use `function` keyword — arrow functions cannot be `new`-ed
  Redis: vi.fn().mockImplementation(function (this: Record<string, unknown>) {}),
}));

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
    this.limit = vi.fn();
  });
  // @ts-ignore — attach static factory to the mock class
  Ratelimit.slidingWindow = vi.fn().mockReturnValue({ kind: "sliding" });
  return { Ratelimit };
});

import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";

// ─── resolveRateLimiter ───────────────────────────────────────────────────────

describe("resolveRateLimiter", () => {
  it("returns the checkout limiter for POST /api/checkout", () => {
    const a = resolveRateLimiter("/api/checkout", "POST");
    const b = resolveRateLimiter("/api/checkout", "POST");
    // Same instance on repeated calls (cached)
    expect(a).toBe(b);
    expect(a).toBeDefined();
  });

  it("returns the billing-portal limiter for POST /api/billing-portal", () => {
    const limiter = resolveRateLimiter("/api/billing-portal", "POST");
    expect(limiter).toBeDefined();
  });

  it("returns the listing-import limiter for POST /api/listing-import", () => {
    const limiter = resolveRateLimiter("/api/listing-import", "POST");
    expect(limiter).toBeDefined();
  });

  it("returns the propertiesRead limiter for GET /api/properties", () => {
    const get = resolveRateLimiter("/api/properties", "GET");
    expect(get).toBeDefined();
  });

  it("returns the propertiesMutate limiter for POST /api/properties", () => {
    const post = resolveRateLimiter("/api/properties", "POST");
    expect(post).toBeDefined();
  });

  it("returns different limiters for GET and POST /api/properties", () => {
    const get = resolveRateLimiter("/api/properties", "GET");
    const post = resolveRateLimiter("/api/properties", "POST");
    // Different cache keys → different instances
    expect(get).not.toBe(post);
  });

  it("returns the propertiesMutate limiter for DELETE /api/properties/[id]", () => {
    const del = resolveRateLimiter("/api/properties/abc-123", "DELETE");
    const post = resolveRateLimiter("/api/properties", "POST");
    // Both non-GET on /api/properties* → same cached 'prop:w' instance
    expect(del).toBe(post);
  });

  it("returns the propertiesRead limiter for GET /api/properties/[id]", () => {
    const idGet = resolveRateLimiter("/api/properties/abc-123", "GET");
    const listGet = resolveRateLimiter("/api/properties", "GET");
    expect(idGet).toBe(listGet);
  });

  it("returns the general limiter for /api/watchlist-criteria", () => {
    const limiter = resolveRateLimiter("/api/watchlist-criteria", "GET");
    expect(limiter).toBeDefined();
  });

  it("returns the general limiter for /api/daily-digest", () => {
    const limiter = resolveRateLimiter("/api/daily-digest", "GET");
    expect(limiter).toBeDefined();
  });

  it("returns the general limiter for /api/quick-capture", () => {
    const limiter = resolveRateLimiter("/api/quick-capture", "GET");
    expect(limiter).toBeDefined();
  });

  it("general limiter is the same instance for all general routes (cached)", () => {
    const a = resolveRateLimiter("/api/watchlist-criteria", "GET");
    const b = resolveRateLimiter("/api/daily-digest", "GET");
    const c = resolveRateLimiter("/api/quick-capture", "POST");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("checkout and billing-portal return different instances", () => {
    const checkout = resolveRateLimiter("/api/checkout", "POST");
    const billing = resolveRateLimiter("/api/billing-portal", "POST");
    expect(checkout).not.toBe(billing);
  });
});

// ─── getClientIp ─────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for (single IP)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("extracts last IP from x-forwarded-for (rightmost = proxy-appended, not client-controlled)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.16.0.1" });
    expect(getClientIp(headers)).toBe("172.16.0.1");
  });

  it("trims whitespace from x-forwarded-for last entry", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4,  10.0.0.1  " });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("extracts single IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-real-ip": "5.6.7.8" });
    expect(getClientIp(headers)).toBe("5.6.7.8");
  });

  it("trims whitespace from x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "  5.6.7.8  " });
    expect(getClientIp(headers)).toBe("5.6.7.8");
  });

  it("prefers x-real-ip over x-forwarded-for (x-real-ip is Vercel-verified, not client-controlled)", () => {
    const headers = new Headers({
      "x-forwarded-for": "evil.client.ip, 10.0.0.1",
      "x-real-ip": "9.9.9.9",
    });
    expect(getClientIp(headers)).toBe("9.9.9.9");
  });

  it("returns 127.0.0.1 when no IP header is present (local dev)", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("127.0.0.1");
  });
});

// ─── isRateLimitingEnabled ────────────────────────────────────────────────────

describe("isRateLimitingEnabled", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    // Restore env vars after each test
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  it("returns true when both env vars are present", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token_abc123";
    expect(isRateLimitingEnabled()).toBe(true);
  });

  it("returns false when URL is missing", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = "token_abc123";
    expect(isRateLimitingEnabled()).toBe(false);
  });

  it("returns false when TOKEN is missing", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isRateLimitingEnabled()).toBe(false);
  });

  it("returns false when both env vars are absent", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isRateLimitingEnabled()).toBe(false);
  });

  it("returns false when URL is an empty string", () => {
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token_abc123";
    expect(isRateLimitingEnabled()).toBe(false);
  });
});
