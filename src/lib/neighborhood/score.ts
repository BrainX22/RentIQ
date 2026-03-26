import type { NeighborhoodScores } from "@/types";

// ─── Grade letter → numeric score ─────────────────────────────────────────────

const GRADE_MAP: Record<string, number> = {
  "a+": 100,
  "a": 92,
  "a-": 85,
  "b+": 78,
  "b": 72,
  "b-": 65,
  "c+": 58,
  "c": 52,
  "c-": 45,
  "d+": 38,
  "d": 32,
  "d-": 25,
  "f": 10,
};

/** Converts a CrimeGrade letter (e.g. "B+") to a 0–100 numeric score. */
export function letterGradeToScore(letter: string): number | null {
  const key = letter.trim().toLowerCase();
  return key in GRADE_MAP ? GRADE_MAP[key] : null;
}

// ─── FHFA appreciation % → 0-100 ─────────────────────────────────────────────

const GROWTH_MAX_PCT = 6; // 6%+ maps to 100

/** Normalises a raw FHFA annual appreciation % to a 0–100 score. */
export function normalizeGrowthPct(pct: number): number {
  return Math.round(Math.min(Math.max(pct / GROWTH_MAX_PCT, 0), 1) * 100);
}

// ─── Grade thresholds ─────────────────────────────────────────────────────────

function scoreToGrade(composite: number): NeighborhoodScores["grade"] {
  if (composite >= 85) return "A";
  if (composite >= 70) return "B";
  if (composite >= 55) return "C";
  if (composite >= 40) return "D";
  return "F";
}

// ─── Weighted composite ───────────────────────────────────────────────────────

const BASE_WEIGHTS = { safety: 40, income: 35, growth: 25 } as const;

/**
 * Computes a composite neighborhood score from three independent signals.
 *
 * Weights: safety=40%, income=35%, growth=25%.
 * When a signal is null its weight is redistributed proportionally to
 * the remaining non-null sources.  When all three are null returns a
 * neutral score of 50 (grade C).
 */
export function computeCompositeScore(
  safety: number | null,
  income: number | null,
  growth: number | null,
): NeighborhoodScores {
  const values = { safety, income, growth } as const;
  const sources: string[] = [];

  if (safety !== null) sources.push("crimegrade");
  if (income !== null) sources.push("census");
  if (growth !== null) sources.push("fhfa");

  const totalWeight = Object.entries(BASE_WEIGHTS)
    .filter(([k]) => values[k as keyof typeof values] !== null)
    .reduce((sum, [, w]) => sum + w, 0);

  // When all sources are null, return a neutral "insufficient data" result.
  if (totalWeight === 0) {
    return { composite: 50, safety: null, income: null, growth: null, grade: "C", sources: [] };
  }

  let composite: number;
  {
    let weighted = 0;
    if (safety !== null) weighted += safety * (BASE_WEIGHTS.safety / totalWeight);
    if (income !== null) weighted += income * (BASE_WEIGHTS.income / totalWeight);
    if (growth !== null) weighted += growth * (BASE_WEIGHTS.growth / totalWeight);
    composite = Math.round(Math.min(Math.max(weighted, 0), 100));
  }

  return {
    composite,
    safety,
    income,
    growth,
    grade: scoreToGrade(composite),
    sources,
  };
}
