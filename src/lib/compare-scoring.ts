import type { Property } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  cashFlow: 0.3,
  cocReturn: 0.25,
  capRate: 0.2,
  noi: 0.15,
  price: 0.1,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropertyScore {
  propertyId: string;
  cashFlowScore: number;  // 0–100 normalised
  cocReturnScore: number; // 0–100 normalised
  capRateScore: number;   // 0–100 normalised
  noiScore: number;       // 0–100 normalised
  priceScore: number;     // 0–100 normalised (inverted: lower price → higher score)
  totalScore: number;     // weighted sum
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Normalise an array of values to a 0–100 scale.
 * When all values are equal, returns 50 for each (tie, no winner).
 * Requires at least 2 values; callers must guarantee this.
 */
function normaliseValues(values: number[], invert = false): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [50];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values.map(() => 50);
  }
  return values.map((v) => {
    const n = ((v - min) / (max - min)) * 100;
    return invert ? 100 - n : n;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute weighted scores for each property.
 * Returns one PropertyScore per property in input order.
 */
export function computePropertyScores(properties: Property[]): PropertyScore[] {
  if (properties.length === 0) return [];

  // Single-property fallback: all scores 50 (no comparison possible)
  if (properties.length === 1) {
    const totalScore =
      50 * SCORE_WEIGHTS.cashFlow +
      50 * SCORE_WEIGHTS.cocReturn +
      50 * SCORE_WEIGHTS.capRate +
      50 * SCORE_WEIGHTS.noi +
      50 * SCORE_WEIGHTS.price;
    return [
      {
        propertyId: properties[0].id,
        cashFlowScore: 50,
        cocReturnScore: 50,
        capRateScore: 50,
        noiScore: 50,
        priceScore: 50,
        totalScore,
      },
    ];
  }

  const cashFlows = properties.map((p) => p.monthly_cash_flow);
  const cocReturns = properties.map((p) => p.cash_on_cash_return ?? 0);
  const capRates = properties.map((p) =>
    p.property_price > 0 ? (p.noi / p.property_price) * 100 : 0
  );
  const nois = properties.map((p) => p.noi);
  const prices = properties.map((p) => p.property_price);

  const normCashFlow = normaliseValues(cashFlows);
  const normCoCReturn = normaliseValues(cocReturns);
  const normCapRate = normaliseValues(capRates);
  const normNOI = normaliseValues(nois);
  const normPrice = normaliseValues(prices, true); // inverted

  return properties.map((p, i) => {
    const cashFlowScore = normCashFlow[i];
    const cocReturnScore = normCoCReturn[i];
    const capRateScore = normCapRate[i];
    const noiScore = normNOI[i];
    const priceScore = normPrice[i];
    const totalScore =
      cashFlowScore * SCORE_WEIGHTS.cashFlow +
      cocReturnScore * SCORE_WEIGHTS.cocReturn +
      capRateScore * SCORE_WEIGHTS.capRate +
      noiScore * SCORE_WEIGHTS.noi +
      priceScore * SCORE_WEIGHTS.price;

    return { propertyId: p.id, cashFlowScore, cocReturnScore, capRateScore, noiScore, priceScore, totalScore };
  });
}

/**
 * Return the index of the property with the highest total score.
 * Returns null when fewer than 2 scores exist or all scores are tied.
 */
export function getWinnerIndex(scores: PropertyScore[]): number | null {
  if (scores.length < 2) return null;
  const maxScore = Math.max(...scores.map((s) => s.totalScore));
  if (scores.every((s) => s.totalScore === maxScore)) return null;
  return scores.findIndex((s) => s.totalScore === maxScore);
}

/**
 * Find the index of the best value in a metric row.
 * Returns null when fewer than 2 non-null values are present or all are tied.
 */
export function findRowWinner(
  values: (number | null)[],
  higherIsBetter: boolean
): number | null {
  const valid = values
    .map((v, i) => ({ v, i }))
    // Use loose inequality to guard against both null and undefined
    .filter((x): x is { v: number; i: number } => x.v != null);

  if (valid.length < 2) return null;
  if (valid.every(({ v }) => v === valid[0].v)) return null;

  const target = higherIsBetter
    ? Math.max(...valid.map(({ v }) => v))
    : Math.min(...valid.map(({ v }) => v));

  return valid.find(({ v }) => v === target)?.i ?? null;
}
