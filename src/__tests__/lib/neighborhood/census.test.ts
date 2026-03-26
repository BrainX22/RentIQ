import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { fetchCensusIncomeScore } from "@/lib/neighborhood/census";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Census ACS5 returns a 2-row array: header row + data row.
 * Example: [["B19013_001E","zip code tabulation area"],["65000","90210"]]
 */
function makeCensusResponse(income: number | string): Response {
  const body = JSON.stringify([
    ["B19013_001E", "zip code tabulation area"],
    [String(income), "90210"],
  ]);
  return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fetchCensusIncomeScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when response is not ok (4xx)", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when response is not ok (5xx)", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Error", { status: 500 }));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when income value is -666666666 (Census not-available sentinel)", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(-666666666));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when income value is null", async () => {
    const body = JSON.stringify([
      ["B19013_001E", "zip code tabulation area"],
      [null, "90210"],
    ]);
    mockFetch.mockResolvedValueOnce(
      new Response(body, { status: 200 })
    );
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when response JSON is malformed", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("not json", { status: 200 })
    );
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when response array has no data row", async () => {
    const body = JSON.stringify([["B19013_001E", "zip code tabulation area"]]);
    mockFetch.mockResolvedValueOnce(new Response(body, { status: 200 }));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBeNull();
  });

  it("returns 0 for income at or below $30,000 (floor)", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(30000));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBe(0);
  });

  it("returns 0 for income below $30,000 (clamped)", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(20000));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBe(0);
  });

  it("returns 100 for income at or above $100,000 (ceiling)", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(100000));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBe(100);
  });

  it("returns 100 for income above $100,000 (clamped)", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(150000));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBe(100);
  });

  it("returns 50 for income at the midpoint ($65,000)", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(65000));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBe(50);
  });

  it("correctly normalises income between floor and ceiling", async () => {
    // ($80k - $30k) / ($100k - $30k) = 50/70 ≈ 71.43 → 71
    mockFetch.mockResolvedValueOnce(makeCensusResponse(80000));
    const result = await fetchCensusIncomeScore("90210");
    expect(result).toBe(71);
  });

  it("includes ZIP code in request URL", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(65000));
    await fetchCensusIncomeScore("12345");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("12345");
  });

  it("requests the median household income variable B19013_001E", async () => {
    mockFetch.mockResolvedValueOnce(makeCensusResponse(65000));
    await fetchCensusIncomeScore("90210");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("B19013_001E");
  });
});
