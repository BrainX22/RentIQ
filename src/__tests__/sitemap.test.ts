import { describe, it, expect, afterEach, vi } from "vitest";

// sitemap() is a pure function — no mocks needed beyond env vars

describe("sitemap()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_APP_URL as base URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries.every((e) => e.url.startsWith("https://myapp.com"))).toBe(true);
  });

  it("falls back to https://tryrentiq.com when NEXT_PUBLIC_APP_URL is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries.every((e) => e.url.startsWith("https://tryrentiq.com"))).toBe(true);
  });

  it("returns exactly 8 URLs (homepage, calculator, compare, login, signup, privacy, terms, changelog)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries).toHaveLength(8);
  });

  it("includes /compare with priority 0.7 and monthly changeFrequency", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const compare = entries.find((e) => e.url === "https://myapp.com/compare");
    expect(compare).toBeDefined();
    expect(compare?.priority).toBe(0.7);
    expect(compare?.changeFrequency).toBe("monthly");
  });

  it("includes homepage with priority 1.0 and monthly changeFrequency", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const home = entries.find((e) => e.url === "https://myapp.com/");
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changeFrequency).toBe("monthly");
  });

  it("includes /calculator with priority 0.9 and monthly changeFrequency", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const calc = entries.find((e) => e.url === "https://myapp.com/calculator");
    expect(calc).toBeDefined();
    expect(calc?.priority).toBe(0.9);
    expect(calc?.changeFrequency).toBe("monthly");
  });

  it("includes /auth/login and /auth/signup with priority 0.3", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const login = entries.find((e) => e.url === "https://myapp.com/auth/login");
    const signup = entries.find((e) => e.url === "https://myapp.com/auth/signup");
    expect(login).toBeDefined();
    expect(signup).toBeDefined();
    expect(login?.priority).toBe(0.3);
    expect(signup?.priority).toBe(0.3);
    expect(login?.changeFrequency).toBe("yearly");
    expect(signup?.changeFrequency).toBe("yearly");
  });

  it("includes /privacy, /terms, /changelog", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries.some((e) => e.url === "https://myapp.com/privacy")).toBe(true);
    expect(entries.some((e) => e.url === "https://myapp.com/terms")).toBe(true);
    expect(entries.some((e) => e.url === "https://myapp.com/changelog")).toBe(true);
  });

  it("does NOT include /dashboard (protected route)", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries.some((e) => e.url.includes("/dashboard"))).toBe(false);
  });

  it("each entry has a valid lastModified date", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});
