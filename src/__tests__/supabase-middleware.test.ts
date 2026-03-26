import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetUser } = vi.hoisted(() => {
  const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
  return { mockGetUser };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: { getUser: mockGetUser },
  }),
}));

import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const url = `http://localhost:3001${path}`;
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const headers = new Headers({
    // Supabase env vars must be present or updateSession returns early
    "x-forwarded-host": "localhost:3001",
  });
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest(url, { headers });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("E2E auth bypass (updateSession)", () => {
  const SECRET = "super-secret-test-value-xyz";

  afterEach(() => {
    delete process.env.E2E_AUTH_BYPASS_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.clearAllMocks();
  });

  function setupSupabaseEnv() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  }

  it("bypasses redirect when E2E_AUTH_BYPASS_SECRET matches cookie on /dashboard", async () => {
    setupSupabaseEnv();
    process.env.E2E_AUTH_BYPASS_SECRET = SECRET;
    mockGetUser.mockResolvedValue({ data: { user: null } }); // unauthenticated

    const request = makeRequest("/dashboard", { "e2e-auth-bypass": SECRET });
    const response = await updateSession(request);

    // Bypass allows through with 200 (not a redirect)
    expect(response.status).toBe(200);
  });

  it("redirects to login when cookie value does not match secret", async () => {
    setupSupabaseEnv();
    process.env.E2E_AUTH_BYPASS_SECRET = SECRET;
    mockGetUser.mockResolvedValue({ data: { user: null } }); // unauthenticated

    const request = makeRequest("/dashboard", { "e2e-auth-bypass": "wrong-value" });
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("redirects to login when E2E_AUTH_BYPASS_SECRET env var is not set", async () => {
    setupSupabaseEnv();
    // E2E_AUTH_BYPASS_SECRET intentionally not set
    mockGetUser.mockResolvedValue({ data: { user: null } }); // unauthenticated

    const request = makeRequest("/dashboard", { "e2e-auth-bypass": "any-value" });
    const response = await updateSession(request);

    expect(response.status).toBe(307);
  });

  it("does not bypass for non-dashboard routes even with valid secret", async () => {
    setupSupabaseEnv();
    process.env.E2E_AUTH_BYPASS_SECRET = SECRET;
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = makeRequest("/api/properties", { "e2e-auth-bypass": SECRET });
    const response = await updateSession(request);

    // /api/properties is not a dashboard route — no redirect regardless
    expect(response.status).not.toBe(307);
  });
});
