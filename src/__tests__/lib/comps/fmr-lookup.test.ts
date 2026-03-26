import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted — must precede imports) ───────────────────────────────────

const { mockFrom, mockAdminClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockAdminClient = { from: mockFrom };
  return { mockFrom, mockAdminClient };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(mockAdminClient),
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { lookupFmr } from "@/lib/comps/fmr-lookup";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FUTURE_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
const PAST_DATE   = new Date(Date.now() - 1000).toISOString();

function mockCacheRow(overrides?: Partial<{ comps_json: object; expires_at: string }>) {
  return {
    comps_json: {
      source: "hud_fmr",
      marketMedian: 1450,
      comps: [{ beds: 2, rent: 1450, source: "HUD FMR FY2024" }],
      fetchedAt: "2024-01-01T00:00:00Z",
    },
    expires_at: FUTURE_DATE,
    ...overrides,
  };
}

function buildFromChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValueOnce(chain);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("lookupFmr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no cache entry exists for the given ZIP/bedrooms", async () => {
    buildFromChain({ data: null, error: null });
    const result = await lookupFmr("94102", 2);
    expect(result).toBeNull();
  });

  it("returns null when Supabase returns an error", async () => {
    buildFromChain({ data: null, error: { message: "connection refused" } });
    const result = await lookupFmr("94102", 2);
    expect(result).toBeNull();
  });

  it("returns CompsResponse when a valid non-expired cache entry exists", async () => {
    buildFromChain({ data: mockCacheRow(), error: null });
    const result = await lookupFmr("94102", 2);
    expect(result).not.toBeNull();
    expect(result?.available).toBe(true);
    expect(result?.source).toBe("cache");
    expect(result?.marketMedian).toBe(1450);
    expect(result?.comps).toHaveLength(1);
    expect(result?.comps[0].beds).toBe(2);
    expect(result?.comps[0].rent).toBe(1450);
    expect(result?.fetchedAt).toBe("2024-01-01T00:00:00Z");
  });

  it("queries the rental_comps_cache table with correct zip and bedrooms", async () => {
    const chain = buildFromChain({ data: mockCacheRow(), error: null });
    await lookupFmr("10001", 3);
    expect(mockFrom).toHaveBeenCalledWith("rental_comps_cache");
    // eq() should be called for both zip_code and bedrooms
    const eqCalls = chain.eq.mock.calls;
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        ["zip_code", "10001"],
        ["bedrooms", 3],
      ])
    );
  });

  it("applies a gt() filter on expires_at to skip expired entries", async () => {
    const chain = buildFromChain({ data: null, error: null });
    await lookupFmr("94102", 1);
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("returns null for a zero-bedroom (studio) query when no data exists", async () => {
    buildFromChain({ data: null, error: null });
    const result = await lookupFmr("90210", 0);
    expect(result).toBeNull();
  });

  it("correctly maps comps from cache with studio (0 bedrooms)", async () => {
    buildFromChain({
      data: mockCacheRow({
        comps_json: {
          source: "hud_fmr",
          marketMedian: 900,
          comps: [{ beds: 0, rent: 900, source: "HUD FMR FY2024" }],
          fetchedAt: "2024-01-01T00:00:00Z",
        },
      }),
      error: null,
    });
    const result = await lookupFmr("90210", 0);
    expect(result?.marketMedian).toBe(900);
    expect(result?.comps[0].beds).toBe(0);
  });
});
