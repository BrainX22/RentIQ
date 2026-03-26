import { describe, it, expect, beforeEach } from "vitest";
import nextConfig from "../../next.config";

// Helper: flatten all headers across all route groups into a lookup map
async function getHeaders(): Promise<Map<string, string>> {
  const groups = await nextConfig.headers!();
  const map = new Map<string, string>();
  for (const group of groups) {
    for (const h of group.headers) {
      map.set(h.key, h.value);
    }
  }
  return map;
}

describe("next.config.ts — Security Headers", () => {
  it("exports a headers() function", () => {
    expect(typeof nextConfig.headers).toBe("function");
  });

  it("applies headers to all routes (/(.*) source)", async () => {
    const groups = await nextConfig.headers!();
    const sources = groups.map((g) => g.source);
    expect(sources).toContain("/(.*)");
  });

  // ── Standard browser security headers ────────────────────────────────────

  it("X-Frame-Options is SAMEORIGIN", async () => {
    const h = await getHeaders();
    expect(h.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("X-Content-Type-Options is nosniff", async () => {
    const h = await getHeaders();
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("Referrer-Policy is strict-origin-when-cross-origin", async () => {
    const h = await getHeaders();
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("Strict-Transport-Security has max-age >= 1 year and includeSubDomains", async () => {
    const h = await getHeaders();
    const hsts = h.get("Strict-Transport-Security") ?? "";
    const match = hsts.match(/max-age=(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1])).toBeGreaterThanOrEqual(31_536_000);
    expect(hsts).toContain("includeSubDomains");
  });

  it("Cross-Origin-Opener-Policy is same-origin (closes XSLeaks/Spectre side-channels)", async () => {
    const h = await getHeaders();
    expect(h.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("Permissions-Policy denies camera, microphone, geolocation", async () => {
    const h = await getHeaders();
    const pp = h.get("Permissions-Policy") ?? "";
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  // ── Content-Security-Policy ───────────────────────────────────────────────

  describe("Content-Security-Policy", () => {
    let csp: string;

    beforeEach(async () => {
      const h = await getHeaders();
      csp = h.get("Content-Security-Policy") ?? "";
    });

    it("is present and non-empty", () => {
      expect(csp.length).toBeGreaterThan(0);
    });

    it("script-src includes 'self' and Stripe.js", () => {
      expect(csp).toMatch(/script-src[^;]*https:\/\/js\.stripe\.com/);
    });

    it("connect-src includes Supabase REST and Realtime (wss)", () => {
      expect(csp).toMatch(/connect-src[^;]*\.supabase\.co/);
      expect(csp).toMatch(/connect-src[^;]*wss:\/\/\*\.supabase\.co/);
    });

    it("connect-src includes Stripe API", () => {
      expect(csp).toMatch(/connect-src[^;]*https:\/\/api\.stripe\.com/);
    });

    it("connect-src includes Stripe fraud/Link endpoints (m.stripe.com, m.stripe.network, q.stripe.com)", () => {
      expect(csp).toMatch(/connect-src[^;]*https:\/\/m\.stripe\.com/);
      expect(csp).toMatch(/connect-src[^;]*https:\/\/m\.stripe\.network/);
      expect(csp).toMatch(/connect-src[^;]*https:\/\/q\.stripe\.com/);
    });

    it("frame-src includes Stripe iframes (js.stripe.com and hooks.stripe.com)", () => {
      expect(csp).toMatch(/frame-src[^;]*https:\/\/js\.stripe\.com/);
      expect(csp).toMatch(/frame-src[^;]*https:\/\/hooks\.stripe\.com/);
    });

    it("object-src is 'none' (blocks plugins/Flash)", () => {
      expect(csp).toContain("object-src 'none'");
    });

    it("base-uri is 'self' (prevents base tag injection)", () => {
      expect(csp).toContain("base-uri 'self'");
    });

    it("form-action is 'self' (prevents form hijacking)", () => {
      expect(csp).toContain("form-action 'self'");
    });

    it("frame-ancestors is 'self' (CSP-native clickjacking protection)", () => {
      expect(csp).toContain("frame-ancestors 'self'");
    });

    it("font-src includes 'self' (next/font/google self-hosts fonts)", () => {
      expect(csp).toMatch(/font-src[^;]*'self'/);
    });
  });
});
