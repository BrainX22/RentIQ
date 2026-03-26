import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted — must precede imports) ───────────────────────────────────

const {
  mockAdminFrom,
  mockAdminClient,
  mockFetchFhfa,
  mockFetchCrimeGrade,
  mockFetchCensus,
} = vi.hoisted(() => {
  const mockAdminFrom = vi.fn();
  const mockAdminClient = { from: mockAdminFrom };
  const mockFetchFhfa = vi.fn();
  const mockFetchCrimeGrade = vi.fn();
  const mockFetchCensus = vi.fn();
  return {
    mockAdminFrom,
    mockAdminClient,
    mockFetchFhfa,
    mockFetchCrimeGrade,
    mockFetchCensus,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(mockAdminClient),
}));

vi.mock("@/lib/neighborhood/fhfa", () => ({ fetchFhfaScore: mockFetchFhfa }));
vi.mock("@/lib/neighborhood/crimegrade", () => ({ fetchCrimeGradeScore: mockFetchCrimeGrade }));
vi.mock("@/lib/neighborhood/census", () => ({ fetchCensusIncomeScore: mockFetchCensus }));

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { lookupNeighborhood } from "@/lib/neighborhood/lookup";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FUTURE_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
const ZIP = "90210";

function buildReadChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  mockAdminFrom.mockReturnValueOnce(chain);
  return chain;
}

function buildUpsertChain(result: { error: unknown }) {
  const chain = { upsert: vi.fn().mockResolvedValue(result) };
  mockAdminFrom.mockReturnValue(chain);
  return chain;
}

function makeCachedRow(overrides?: Partial<{
  safety_score: string | null;
  school_rating: number | null;
  growth_score: number | null;
  fetched_at: string;
  expires_at: string;
}>) {
  return {
    safety_score: "B+",        // letter grade → 78
    school_rating: 65,         // census income score 0-100
    growth_score: 3.0,         // raw FHFA % → normalised to 50
    raw_json: {},
    fetched_at: "2026-03-01T00:00:00Z",
    expires_at: FUTURE_DATE,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("lookupNeighborhood", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildUpsertChain({ error: null }); // default no-op upsert
  });

  // ── Cache hit ──────────────────────────────────────────────────────────────

  it("returns NeighborhoodResponse from cache when a valid non-expired entry exists", async () => {
    buildReadChain({ data: makeCachedRow(), error: null });

    const result = await lookupNeighborhood(ZIP);

    expect(result?.available).toBe(true);
    expect(result?.zip_code).toBe(ZIP);
    expect(result?.scores.safety).toBe(78);    // letterGradeToScore("B+")
    expect(result?.scores.income).toBe(65);    // stored as school_rating
    expect(result?.scores.growth).toBe(50);    // normalizeGrowthPct(3.0)
    expect(result?.scores.composite).toBeGreaterThan(0);
    expect(result?.scores.grade).toBeTruthy();
  });

  it("uses exact numeric scores from raw_json on cache hit (no lossy round-trip)", async () => {
    // raw_json carries the precise 0-100 scores; safety_score letter grade is a fallback.
    buildReadChain({
      data: {
        ...makeCachedRow(),
        // Inject an exact value that differs from what letter-grade reconstruction yields
        // (e.g. 74 → stored as "B+" → letter-grade round-trip would give 78).
        raw_json: { safetyScore: 74, incomeScore: 65, growthScore: 50 },
      },
      error: null,
    });

    const result = await lookupNeighborhood(ZIP);

    expect(result?.scores.safety).toBe(74);   // raw_json value, not 78 from letter grade
    expect(result?.scores.income).toBe(65);
    expect(result?.scores.growth).toBe(50);
  });

  it("does NOT call external APIs on cache hit", async () => {
    buildReadChain({ data: makeCachedRow(), error: null });

    await lookupNeighborhood(ZIP);

    expect(mockFetchFhfa).not.toHaveBeenCalled();
    expect(mockFetchCrimeGrade).not.toHaveBeenCalled();
    expect(mockFetchCensus).not.toHaveBeenCalled();
  });

  it("queries neighborhood_cache table with zip_code and gt(expires_at)", async () => {
    const chain = buildReadChain({ data: makeCachedRow(), error: null });

    await lookupNeighborhood(ZIP);

    expect(mockAdminFrom).toHaveBeenCalledWith("neighborhood_cache");
    expect(chain.eq).toHaveBeenCalledWith("zip_code", ZIP);
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("handles cache row with null safety_score gracefully", async () => {
    buildReadChain({ data: makeCachedRow({ safety_score: null }), error: null });

    const result = await lookupNeighborhood(ZIP);

    expect(result?.scores.safety).toBeNull();
    expect(result?.scores.sources).not.toContain("crimegrade");
  });

  it("handles cache row with null school_rating gracefully", async () => {
    buildReadChain({ data: makeCachedRow({ school_rating: null }), error: null });

    const result = await lookupNeighborhood(ZIP);

    expect(result?.scores.income).toBeNull();
    expect(result?.scores.sources).not.toContain("census");
  });

  it("handles cache row with null growth_score gracefully", async () => {
    buildReadChain({ data: makeCachedRow({ growth_score: null }), error: null });

    const result = await lookupNeighborhood(ZIP);

    expect(result?.scores.growth).toBeNull();
    expect(result?.scores.sources).not.toContain("fhfa");
  });

  // ── Cache miss → API fetch ─────────────────────────────────────────────────

  it("calls all 3 external APIs in parallel on cache miss", async () => {
    buildReadChain({ data: null, error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(78);
    mockFetchCensus.mockResolvedValueOnce(65);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    expect(mockFetchCrimeGrade).toHaveBeenCalledWith(ZIP);
    expect(mockFetchCensus).toHaveBeenCalledWith(ZIP);
    expect(mockFetchFhfa).toHaveBeenCalledWith(ZIP);
  });

  it("upserts result into neighborhood_cache after API fetch", async () => {
    buildReadChain({ data: null, error: null });
    const upsertChain = buildUpsertChain({ error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(78);
    mockFetchCensus.mockResolvedValueOnce(65);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    expect(mockAdminFrom).toHaveBeenCalledWith("neighborhood_cache");
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ zip_code: ZIP }),
      expect.objectContaining({ onConflict: "zip_code" })
    );
  });

  it("sets expires_at to 7 days in the future when upserting", async () => {
    buildReadChain({ data: null, error: null });
    const upsertChain = buildUpsertChain({ error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(78);
    mockFetchCensus.mockResolvedValueOnce(65);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    const upsertPayload = upsertChain.upsert.mock.calls[0][0];
    const expiresAt = new Date(upsertPayload.expires_at);
    const sevenDaysFromNow = Date.now() + 6.9 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThan(sevenDaysFromNow);
  });

  it("returns NeighborhoodResponse with correct scores after cache miss", async () => {
    buildReadChain({ data: null, error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(80);
    mockFetchCensus.mockResolvedValueOnce(60);
    mockFetchFhfa.mockResolvedValueOnce(100);

    const result = await lookupNeighborhood(ZIP);

    expect(result?.available).toBe(true);
    expect(result?.zip_code).toBe(ZIP);
    expect(result?.scores.safety).toBe(80);
    expect(result?.scores.income).toBe(60);
    expect(result?.scores.growth).toBe(100);
    // 80*0.4 + 60*0.35 + 100*0.25 = 32 + 21 + 25 = 78
    expect(result?.scores.composite).toBe(78);
  });

  it("returns NeighborhoodResponse with partial scores when some APIs fail", async () => {
    buildReadChain({ data: null, error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(null);   // safety unavailable
    mockFetchCensus.mockResolvedValueOnce(70);
    mockFetchFhfa.mockResolvedValueOnce(60);

    const result = await lookupNeighborhood(ZIP);

    expect(result?.scores.safety).toBeNull();
    expect(result?.scores.income).toBe(70);
    expect(result?.scores.growth).toBe(60);
    expect(result?.scores.sources).not.toContain("crimegrade");
  });

  it("returns available:true even when all 3 external APIs return null", async () => {
    buildReadChain({ data: null, error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(null);
    mockFetchCensus.mockResolvedValueOnce(null);
    mockFetchFhfa.mockResolvedValueOnce(null);

    const result = await lookupNeighborhood(ZIP);

    // Returns available:true even with all-null (composite defaults to 50, grade C)
    expect(result?.available).toBe(true);
    expect(result?.scores.composite).toBe(50);
    expect(result?.scores.grade).toBe("C");
    expect(result?.scores.sources).toEqual([]);
  });

  it("does not throw when upsert fails — returns data anyway", async () => {
    buildReadChain({ data: null, error: null });
    buildUpsertChain({ error: { message: "DB write error" } });
    mockFetchCrimeGrade.mockResolvedValueOnce(78);
    mockFetchCensus.mockResolvedValueOnce(65);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await expect(lookupNeighborhood(ZIP)).resolves.not.toThrow();
  });

  it("returns null when Supabase read throws unexpectedly", async () => {
    mockAdminFrom.mockImplementationOnce(() => { throw new Error("unexpected DB error"); });

    const result = await lookupNeighborhood(ZIP);
    expect(result).toBeNull();
  });

  it("proceeds to API fetch when cache read returns a DB error", async () => {
    buildReadChain({ data: null, error: { message: "DB read error" } });
    mockFetchCrimeGrade.mockResolvedValueOnce(72);
    mockFetchCensus.mockResolvedValueOnce(50);
    mockFetchFhfa.mockResolvedValueOnce(40);

    const result = await lookupNeighborhood(ZIP);

    expect(mockFetchCrimeGrade).toHaveBeenCalled();
    expect(result?.scores.safety).toBe(72);
  });

  // ── scoreToLetter coverage: lower grade branches ───────────────────────────

  it("upserts correct letter grade for B- score (61-67)", async () => {
    buildReadChain({ data: null, error: null });
    const upsertChain = buildUpsertChain({ error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(63);  // B-
    mockFetchCensus.mockResolvedValueOnce(50);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    const payload = upsertChain.upsert.mock.calls[0][0];
    expect(payload.safety_score).toBe("B-");
  });

  it("upserts correct letter grade for C range (48-60)", async () => {
    buildReadChain({ data: null, error: null });
    const upsertChain = buildUpsertChain({ error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(50);  // C
    mockFetchCensus.mockResolvedValueOnce(50);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    const payload = upsertChain.upsert.mock.calls[0][0];
    expect(payload.safety_score).toBe("C");
  });

  it("upserts correct letter grade for D range (28-34)", async () => {
    buildReadChain({ data: null, error: null });
    const upsertChain = buildUpsertChain({ error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(30);  // D
    mockFetchCensus.mockResolvedValueOnce(50);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    const payload = upsertChain.upsert.mock.calls[0][0];
    expect(payload.safety_score).toBe("D");
  });

  it("upserts F letter grade for very low score", async () => {
    buildReadChain({ data: null, error: null });
    const upsertChain = buildUpsertChain({ error: null });
    mockFetchCrimeGrade.mockResolvedValueOnce(10);  // F
    mockFetchCensus.mockResolvedValueOnce(50);
    mockFetchFhfa.mockResolvedValueOnce(50);

    await lookupNeighborhood(ZIP);

    const payload = upsertChain.upsert.mock.calls[0][0];
    expect(payload.safety_score).toBe("F");
  });
});
