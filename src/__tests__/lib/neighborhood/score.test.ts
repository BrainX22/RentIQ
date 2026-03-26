import { describe, it, expect } from "vitest";
import { computeCompositeScore, letterGradeToScore, normalizeGrowthPct } from "@/lib/neighborhood/score";

// ─── letterGradeToScore ────────────────────────────────────────────────────────

describe("letterGradeToScore", () => {
  it("maps A+ to 100", () => {
    expect(letterGradeToScore("A+")).toBe(100);
  });

  it("maps A to 92", () => {
    expect(letterGradeToScore("A")).toBe(92);
  });

  it("maps A- to 85", () => {
    expect(letterGradeToScore("A-")).toBe(85);
  });

  it("maps B+ to 78", () => {
    expect(letterGradeToScore("B+")).toBe(78);
  });

  it("maps B to 72", () => {
    expect(letterGradeToScore("B")).toBe(72);
  });

  it("maps B- to 65", () => {
    expect(letterGradeToScore("B-")).toBe(65);
  });

  it("maps C+ to 58", () => {
    expect(letterGradeToScore("C+")).toBe(58);
  });

  it("maps C to 52", () => {
    expect(letterGradeToScore("C")).toBe(52);
  });

  it("maps C- to 45", () => {
    expect(letterGradeToScore("C-")).toBe(45);
  });

  it("maps D+ to 38", () => {
    expect(letterGradeToScore("D+")).toBe(38);
  });

  it("maps D to 32", () => {
    expect(letterGradeToScore("D")).toBe(32);
  });

  it("maps D- to 25", () => {
    expect(letterGradeToScore("D-")).toBe(25);
  });

  it("maps F to 10", () => {
    expect(letterGradeToScore("F")).toBe(10);
  });

  it("returns null for unknown grade string", () => {
    expect(letterGradeToScore("X")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(letterGradeToScore("")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(letterGradeToScore("a+")).toBe(100);
    expect(letterGradeToScore("b")).toBe(72);
  });
});

// ─── normalizeGrowthPct ────────────────────────────────────────────────────────

describe("normalizeGrowthPct", () => {
  it("maps 0% appreciation to score 0", () => {
    expect(normalizeGrowthPct(0)).toBe(0);
  });

  it("maps 6% appreciation to score 100", () => {
    expect(normalizeGrowthPct(6)).toBe(100);
  });

  it("maps 3% appreciation to score 50", () => {
    expect(normalizeGrowthPct(3)).toBe(50);
  });

  it("clamps negative appreciation to 0", () => {
    expect(normalizeGrowthPct(-2)).toBe(0);
  });

  it("clamps appreciation above 6% to 100", () => {
    expect(normalizeGrowthPct(8)).toBe(100);
  });

  it("handles 1.5% correctly", () => {
    expect(normalizeGrowthPct(1.5)).toBe(25);
  });
});

// ─── computeCompositeScore ────────────────────────────────────────────────────

describe("computeCompositeScore", () => {
  it("computes correct weighted composite with all 3 sources", () => {
    // safety=80 (40%), income=60 (35%), growth=100 (25%)
    // composite = 80*0.4 + 60*0.35 + 100*0.25 = 32 + 21 + 25 = 78
    const result = computeCompositeScore(80, 60, 100);
    expect(result.composite).toBe(78);
    expect(result.safety).toBe(80);
    expect(result.income).toBe(60);
    expect(result.growth).toBe(100);
    expect(result.sources).toContain("crimegrade");
    expect(result.sources).toContain("census");
    expect(result.sources).toContain("fhfa");
  });

  it("assigns grade A when composite >= 85", () => {
    const result = computeCompositeScore(100, 100, 100);
    expect(result.composite).toBe(100);
    expect(result.grade).toBe("A");
  });

  it("assigns grade B when composite is 70–84", () => {
    const result = computeCompositeScore(80, 60, 100); // composite = 78
    expect(result.grade).toBe("B");
  });

  it("assigns grade C when composite is 55–69", () => {
    // safety=60 (40%), income=60 (35%), growth=50 (25%)
    // composite = 24 + 21 + 12.5 = 57.5 → 58
    const result = computeCompositeScore(60, 60, 50);
    expect(result.grade).toBe("C");
  });

  it("assigns grade D when composite is 40–54", () => {
    // safety=40 (40%), income=50 (35%), growth=50 (25%)
    // composite = 16 + 17.5 + 12.5 = 46 → 46
    const result = computeCompositeScore(40, 50, 50);
    expect(result.composite).toBe(46);
    expect(result.grade).toBe("D");
  });

  it("assigns grade F when composite < 40", () => {
    // safety=30 (40%), income=30 (35%), growth=30 (25%)
    // composite = 12 + 10.5 + 7.5 = 30
    const result = computeCompositeScore(30, 30, 30);
    expect(result.composite).toBe(30);
    expect(result.grade).toBe("F");
  });

  it("grade boundary: composite 85 → A", () => {
    const result = computeCompositeScore(100, 100, 40);
    // 40 + 35 + 10 = 85
    expect(result.composite).toBe(85);
    expect(result.grade).toBe("A");
  });

  it("grade boundary: composite 70 → B", () => {
    // safety=70 (40%), income=70 (35%), growth=70 (25%)
    // composite = 28 + 24.5 + 17.5 = 70
    const result = computeCompositeScore(70, 70, 70);
    expect(result.composite).toBe(70);
    expect(result.grade).toBe("B");
  });

  it("grade boundary: composite 55 → C", () => {
    // safety=55 (40%), income=55 (35%), growth=55 (25%)
    // composite = 22 + 19.25 + 13.75 = 55
    const result = computeCompositeScore(55, 55, 55);
    expect(result.composite).toBe(55);
    expect(result.grade).toBe("C");
  });

  it("grade boundary: composite 40 → D", () => {
    const result = computeCompositeScore(40, 40, 40);
    expect(result.composite).toBe(40);
    expect(result.grade).toBe("D");
  });

  it("redistributes weights when safety is null", () => {
    // safety=null, income=60 (35%), growth=80 (25%)
    // available weight = 35+25 = 60
    // composite = 60*(35/60) + 80*(25/60) = 35 + 33.33 = 68.33 → 68
    const result = computeCompositeScore(null, 60, 80);
    expect(result.composite).toBe(68);
    expect(result.safety).toBeNull();
    expect(result.sources).not.toContain("crimegrade");
    expect(result.sources).toContain("census");
    expect(result.sources).toContain("fhfa");
  });

  it("redistributes weights when income is null", () => {
    // safety=80 (40%), income=null, growth=60 (25%)
    // available weight = 40+25 = 65
    // composite = 80*(40/65) + 60*(25/65) = 49.23 + 23.08 = 72.31 → 72
    const result = computeCompositeScore(80, null, 60);
    expect(result.composite).toBe(72);
    expect(result.income).toBeNull();
    expect(result.sources).toContain("crimegrade");
    expect(result.sources).not.toContain("census");
    expect(result.sources).toContain("fhfa");
  });

  it("redistributes weights when growth is null", () => {
    // safety=80 (40%), income=60 (35%), growth=null
    // available weight = 40+35 = 75
    // composite = 80*(40/75) + 60*(35/75) = 42.67 + 28 = 70.67 → 71
    const result = computeCompositeScore(80, 60, null);
    expect(result.composite).toBe(71);
    expect(result.growth).toBeNull();
    expect(result.sources).toContain("crimegrade");
    expect(result.sources).toContain("census");
    expect(result.sources).not.toContain("fhfa");
  });

  it("handles only safety available", () => {
    // Only safety=80 available (100% weight)
    const result = computeCompositeScore(80, null, null);
    expect(result.composite).toBe(80);
    expect(result.sources).toEqual(["crimegrade"]);
  });

  it("handles only income available", () => {
    const result = computeCompositeScore(null, 70, null);
    expect(result.composite).toBe(70);
    expect(result.sources).toEqual(["census"]);
  });

  it("handles only growth available", () => {
    const result = computeCompositeScore(null, null, 50);
    expect(result.composite).toBe(50);
    expect(result.sources).toEqual(["fhfa"]);
  });

  it("returns neutral composite 50 and grade C when all sources are null", () => {
    const result = computeCompositeScore(null, null, null);
    expect(result.composite).toBe(50);
    expect(result.grade).toBe("C");
    expect(result.sources).toEqual([]);
  });

  it("returns integer composite (rounds correctly)", () => {
    const result = computeCompositeScore(80, 60, 100);
    expect(Number.isInteger(result.composite)).toBe(true);
  });

  it("clamps composite to 0-100 range", () => {
    const result = computeCompositeScore(100, 100, 100);
    expect(result.composite).toBeLessThanOrEqual(100);
    expect(result.composite).toBeGreaterThanOrEqual(0);
  });
});
