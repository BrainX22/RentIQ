import { calculateDealScore } from "@/lib/calculations";
import type { DealGrade } from "@/lib/calculations";
import type { Property, WatchlistCriteria } from "@/types";

/**
 * The deal finder cron job looks back this many days when fetching
 * recently saved properties to match against watchlist criteria.
 */
export const DEAL_FINDER_WINDOW_DAYS = 7;

/** The filtering-relevant fields of WatchlistCriteria used by the deal finder. */
type CriteriaInput = Pick<WatchlistCriteria, "city" | "max_price" | "min_target_return">;

/** Grades emitted by evaluatePropertyDeal (extends DealGrade with 'F' for failed criteria). */
export type EvalGrade = DealGrade | "F";

/**
 * Returns true if the property satisfies all non-null watchlist criteria.
 *
 * Rules:
 * - city: case-insensitive substring match against property_name. Empty string = no filter.
 * - max_price: property_price must be ≤ max_price.
 * - min_target_return: cash_on_cash_return must be ≥ min_target_return.
 *   A null cash_on_cash_return on the property always fails a non-null min_target_return.
 */
export function matchesWatchlistCriteria(
  property: Property,
  criteria: CriteriaInput
): boolean {
  const { city, max_price, min_target_return } = criteria;

  if (city !== null && city !== "") {
    if (!property.property_name.toLowerCase().includes(city.toLowerCase())) {
      return false;
    }
  }

  if (max_price !== null) {
    if (property.property_price > max_price) {
      return false;
    }
  }

  if (min_target_return !== null) {
    if (property.cash_on_cash_return === null) {
      return false;
    }
    if (property.cash_on_cash_return < min_target_return) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates a single property against watchlist criteria and scores it.
 *
 * - If the property fails any criteria filter, returns { passes: false, score: 0, grade: 'F' }.
 * - If the property passes criteria, scores it using calculateDealScore.
 * - A deal `passes` if it matches criteria AND achieves grade 'A' or 'B' (score ≥ 65).
 *
 * Cap rate is derived at runtime as (noi / property_price) × 100.
 *
 * Note: grade 'F' is returned in two distinct cases:
 * 1. The property does not match watchlist criteria (not scored)
 * 2. The property has null cash_on_cash_return (cannot be reliably scored)
 * In both cases, passes: false and score: 0
 */
export function evaluatePropertyDeal(
  property: Property,
  criteria: CriteriaInput
): { passes: boolean; score: number; grade: EvalGrade } {
  if (!matchesWatchlistCriteria(property, criteria)) {
    return { passes: false, score: 0, grade: "F" };
  }

  // If cash_on_cash_return is null, we can't reliably score this property.
  // calculateDealScore awards 10 points for null CoC which can create false positives.
  // Treat null CoC as a non-passing deal.
  if (property.cash_on_cash_return === null) {
    return { passes: false, score: 0, grade: "F" };
  }

  const capRate =
    property.property_price > 0
      ? (property.noi / property.property_price) * 100
      : 0;

  const { score, grade } = calculateDealScore({
    monthlyCashFlow: property.monthly_cash_flow,
    cashOnCashReturn: property.cash_on_cash_return,
    capRate,
  });

  const passes = grade === "A" || grade === "B";

  return { passes, score, grade };
}

/**
 * Filters a list of properties to only those that both match the watchlist
 * criteria AND achieve a passing deal grade (A or B).
 *
 * Returns the matching properties augmented with dealScore and dealGrade,
 * sorted by dealScore descending (best deals first).
 *
 * Does not mutate the input array.
 */
export function filterMatchingProperties(
  properties: readonly Property[],
  criteria: CriteriaInput
): Array<Property & { dealScore: number; dealGrade: EvalGrade }> {
  return [...properties]
    .reduce<Array<Property & { dealScore: number; dealGrade: EvalGrade }>>(
      (acc, property) => {
        const { passes, score, grade } = evaluatePropertyDeal(property, criteria);
        if (passes) {
          acc.push({ ...property, dealScore: score, dealGrade: grade });
        }
        return acc;
      },
      []
    )
    .sort((a, b) => b.dealScore - a.dealScore);
}
