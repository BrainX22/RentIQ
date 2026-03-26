import { describe, it, expect } from "vitest";
import {
  computePropertyScores,
  findRowWinner,
  getWinnerIndex,
  SCORE_WEIGHTS,
} from "@/lib/compare-scoring";
import { makeProperty } from "@/__tests__/fixtures/makeProperty";

// ─── computePropertyScores ────────────────────────────────────────────────────

describe("computePropertyScores", () => {
  it("returns an empty array for zero properties", () => {
    expect(computePropertyScores([])).toEqual([]);
  });

  it("returns a single score of 50 for a lone property", () => {
    const scores = computePropertyScores([makeProperty("a")]);
    expect(scores).toHaveLength(1);
    expect(scores[0].cashFlowScore).toBe(50);
    expect(scores[0].cocReturnScore).toBe(50);
    expect(scores[0].capRateScore).toBe(50);
    expect(scores[0].noiScore).toBe(50);
    expect(scores[0].priceScore).toBe(50);
  });

  it("assigns 100 to best and 0 to worst for two opposite properties", () => {
    const pBest = makeProperty("best", {
      monthly_cash_flow: 1_000,
      cash_on_cash_return: 15,
      noi: 20_000,
      property_price: 200_000,
    });
    const pWorst = makeProperty("worst", {
      monthly_cash_flow: 0,
      cash_on_cash_return: 0,
      noi: 0,
      property_price: 400_000,
    });
    const [best, worst] = computePropertyScores([pBest, pWorst]);

    expect(best.cashFlowScore).toBe(100);
    expect(worst.cashFlowScore).toBe(0);
    expect(best.priceScore).toBe(100); // inverted: lower price wins
    expect(worst.priceScore).toBe(0);
    expect(best.noiScore).toBe(100);
    expect(worst.noiScore).toBe(0);
  });

  it("assigns 50 to both when all cash flows are equal", () => {
    const pA = makeProperty("a", { monthly_cash_flow: 500 });
    const pB = makeProperty("b", { monthly_cash_flow: 500 });
    const [a, b] = computePropertyScores([pA, pB]);
    expect(a.cashFlowScore).toBe(50);
    expect(b.cashFlowScore).toBe(50);
  });

  it("treats null cash_on_cash_return as 0", () => {
    const pNull = makeProperty("null", { cash_on_cash_return: null });
    const pReal = makeProperty("real", { cash_on_cash_return: 10 });
    const [nullScore, realScore] = computePropertyScores([pNull, pReal]);
    expect(nullScore.cocReturnScore).toBe(0);
    expect(realScore.cocReturnScore).toBe(100);
  });

  it("inverts price score so the cheaper property scores higher", () => {
    const pCheap = makeProperty("cheap", { property_price: 100_000 });
    const pPricey = makeProperty("pricey", { property_price: 500_000 });
    const [cheap, pricey] = computePropertyScores([pCheap, pPricey]);
    expect(cheap.priceScore).toBe(100);
    expect(pricey.priceScore).toBe(0);
  });

  it("computes totalScore as a correct weighted sum", () => {
    // Two identical properties → all normalised to 50 → equal totalScores
    const pA = makeProperty("a");
    const pB = makeProperty("b");
    const [a] = computePropertyScores([pA, pB]);
    const expected =
      50 * SCORE_WEIGHTS.cashFlow +
      50 * SCORE_WEIGHTS.cocReturn +
      50 * SCORE_WEIGHTS.capRate +
      50 * SCORE_WEIGHTS.noi +
      50 * SCORE_WEIGHTS.price;
    expect(a.totalScore).toBeCloseTo(expected);
  });

  it("handles zero property_price gracefully without throwing", () => {
    const pZero = makeProperty("zero", { property_price: 0, noi: 0 });
    const pNormal = makeProperty("normal", { property_price: 300_000, noi: 15_000 });
    expect(() => computePropertyScores([pZero, pNormal])).not.toThrow();
    const [zero, normal] = computePropertyScores([pZero, pNormal]);
    expect(zero.capRateScore).toBe(0);
    expect(normal.capRateScore).toBe(100);
  });

  it("populates propertyId from p.id", () => {
    const pA = makeProperty("abc-123");
    const pB = makeProperty("xyz-456");
    const [a, b] = computePropertyScores([pA, pB]);
    expect(a.propertyId).toBe("abc-123");
    expect(b.propertyId).toBe("xyz-456");
  });

  it("returns scores in the same order as the input array", () => {
    const props = [
      makeProperty("first", { monthly_cash_flow: 800 }),
      makeProperty("second", { monthly_cash_flow: 200 }),
      makeProperty("third", { monthly_cash_flow: 500 }),
    ];
    const scores = computePropertyScores(props);
    expect(scores[0].propertyId).toBe("first");
    expect(scores[1].propertyId).toBe("second");
    expect(scores[2].propertyId).toBe("third");
    // First has highest cash flow
    expect(scores[0].cashFlowScore).toBe(100);
    expect(scores[1].cashFlowScore).toBe(0);
  });
});

// ─── getWinnerIndex ───────────────────────────────────────────────────────────

describe("getWinnerIndex", () => {
  it("returns null for an empty score array", () => {
    expect(getWinnerIndex([])).toBeNull();
  });

  it("returns null for a single score", () => {
    const scores = computePropertyScores([makeProperty("a")]);
    expect(getWinnerIndex(scores)).toBeNull();
  });

  it("returns the index of the property with the highest total score", () => {
    const pA = makeProperty("a", { monthly_cash_flow: 1_000, noi: 20_000 });
    const pB = makeProperty("b", { monthly_cash_flow: 200, noi: 5_000 });
    const scores = computePropertyScores([pA, pB]);
    expect(getWinnerIndex(scores)).toBe(0);
  });

  it("returns null when all scores are equal (identical properties)", () => {
    const pA = makeProperty("a");
    const pB = makeProperty("b");
    const scores = computePropertyScores([pA, pB]);
    expect(getWinnerIndex(scores)).toBeNull();
  });

  it("correctly identifies winner among 4 properties", () => {
    const props = [
      makeProperty("a", { monthly_cash_flow: 200, noi: 5_000 }),
      makeProperty("b", { monthly_cash_flow: 100, noi: 4_000 }),
      makeProperty("c", { monthly_cash_flow: 1_000, noi: 25_000 }), // clear winner
      makeProperty("d", { monthly_cash_flow: 300, noi: 8_000 }),
    ];
    const scores = computePropertyScores(props);
    expect(getWinnerIndex(scores)).toBe(2);
  });
});

// ─── findRowWinner ────────────────────────────────────────────────────────────

describe("findRowWinner", () => {
  it("returns index of highest value when higherIsBetter=true", () => {
    expect(findRowWinner([100, 500, 200], true)).toBe(1);
  });

  it("returns index of lowest value when higherIsBetter=false", () => {
    expect(findRowWinner([100, 500, 200], false)).toBe(0);
  });

  it("returns null when all values are equal", () => {
    expect(findRowWinner([500, 500, 500], true)).toBeNull();
  });

  it("returns null when the array is empty", () => {
    expect(findRowWinner([], true)).toBeNull();
  });

  it("returns null with a single value (no comparison possible)", () => {
    expect(findRowWinner([500], true)).toBeNull();
  });

  it("returns null for all-null array", () => {
    expect(findRowWinner([null, null], true)).toBeNull();
  });

  it("returns null for a single non-null value among nulls", () => {
    expect(findRowWinner([null, 500, null], true)).toBeNull();
  });

  it("ignores null values when finding the winner", () => {
    expect(findRowWinner([null, 500, 200], true)).toBe(1);
    expect(findRowWinner([null, 500, 200], false)).toBe(2);
  });

  it("handles negative values correctly", () => {
    // Higher is better: -100 > -500 → winner at index 0
    expect(findRowWinner([-100, -500, -200], true)).toBe(0);
    // Lower is better: -500 is the lowest → winner at index 1
    expect(findRowWinner([-100, -500, -200], false)).toBe(1);
  });
});
