import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { fetchCrimeGradeScore } from "@/lib/neighborhood/crimegrade";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal HTML page containing the given grade string. */
function makeHtml(gradeText: string): string {
  return `<html><body><div class="grade-badge"><h1>${gradeText}</h1></div></body></html>`;
}

function okHtml(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fetchCrimeGradeScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when response status is not 200", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Blocked", { status: 403 }));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBeNull();
  });

  it("returns null when HTML contains no recognisable grade", async () => {
    mockFetch.mockResolvedValueOnce(okHtml("<html><body>No grade here</body></html>"));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBeNull();
  });

  it("returns 100 for grade A+", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("A+")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(100);
  });

  it("returns 92 for grade A", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("A")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(92);
  });

  it("returns 85 for grade A-", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("A-")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(85);
  });

  it("returns 78 for grade B+", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("B+")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(78);
  });

  it("returns 72 for grade B", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("B")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(72);
  });

  it("returns 52 for grade C", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("C")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(52);
  });

  it("returns 32 for grade D", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("D")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(32);
  });

  it("returns 10 for grade F", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("F")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(10);
  });

  it("also returns the raw letter grade", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("B+")));
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBe(78);
  });

  it("sends an honest bot User-Agent header (not deceptive browser UA)", async () => {
    mockFetch.mockResolvedValueOnce(okHtml(makeHtml("A")));
    await fetchCrimeGradeScore("90210");
    const callArgs = mockFetch.mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const headers = new Headers(init?.headers as HeadersInit);
    const ua = headers.get("user-agent") ?? "";
    expect(ua).toBeTruthy();
    expect(ua).toContain("RPC-NeighborhoodBot");
    expect(ua).not.toContain("Mozilla");
  });

  it("returns null on fetch timeout (AbortError)", async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
    );
    const result = await fetchCrimeGradeScore("90210");
    expect(result).toBeNull();
  });
});
