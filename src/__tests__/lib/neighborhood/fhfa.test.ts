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

import { fetchFhfaScore } from "@/lib/neighborhood/fhfa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFromChain(result: { data: { hpi_1yr_pct_chg: number | string } | null; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValueOnce(chain);
  return chain;
}

function dbRow(pct: number) {
  return { data: { hpi_1yr_pct_chg: pct }, error: null };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fetchFhfaScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when ZIP3 is not found in the table (data is null)", async () => {
    buildFromChain({ data: null, error: null });
    expect(await fetchFhfaScore("90210")).toBeNull();
  });

  it("returns null when the DB returns an error", async () => {
    buildFromChain({ data: null, error: { message: "DB error" } });
    expect(await fetchFhfaScore("90210")).toBeNull();
  });

  it("returns null when createAdminClient throws", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockImplementationOnce(() => { throw new Error("no client"); });
    expect(await fetchFhfaScore("90210")).toBeNull();
  });

  it("returns 0 for 0% annual appreciation", async () => {
    buildFromChain(dbRow(0));
    expect(await fetchFhfaScore("90210")).toBe(0);
  });

  it("returns 50 for 3% annual appreciation", async () => {
    buildFromChain(dbRow(3));
    expect(await fetchFhfaScore("90210")).toBe(50);
  });

  it("returns 100 for 6% annual appreciation", async () => {
    buildFromChain(dbRow(6));
    expect(await fetchFhfaScore("90210")).toBe(100);
  });

  it("returns 100 for appreciation above 6% (clamped)", async () => {
    buildFromChain(dbRow(9.5));
    expect(await fetchFhfaScore("90210")).toBe(100);
  });

  it("returns 0 for negative appreciation (clamped)", async () => {
    buildFromChain(dbRow(-1.5));
    expect(await fetchFhfaScore("90210")).toBe(0);
  });

  it("returns 75 for 4.5% appreciation", async () => {
    buildFromChain(dbRow(4.5));
    expect(await fetchFhfaScore("12345")).toBe(75);
  });

  it("queries using the first 3 digits of the ZIP code", async () => {
    const chain = buildFromChain(dbRow(3));
    await fetchFhfaScore("90210");
    expect(chain.eq).toHaveBeenCalledWith("zip3", "902");
  });

  it("returns null when hpi_1yr_pct_chg is not a valid number", async () => {
    buildFromChain({ data: { hpi_1yr_pct_chg: "N/A" }, error: null });
    expect(await fetchFhfaScore("90210")).toBeNull();
  });

  it("returns approximately 58 for 3.5% appreciation", async () => {
    buildFromChain(dbRow(3.5));
    expect(await fetchFhfaScore("90210")).toBeCloseTo(58, 0);
  });
});
