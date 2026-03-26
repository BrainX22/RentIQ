export const PLAN_LIMITS = {
  free: { savesPerMonth: 5 },
  pro: { savesPerMonth: Infinity },
  max: { savesPerMonth: Infinity },
} as const;

/**
 * Returns true for Max-tier users only.
 * Portfolio Tracking, Rental Comps, Neighborhood Scoring, Deal Finder.
 */
export function canAccessMaxFeature(planType: string): boolean {
  return planType === "max";
}

/**
 * Returns true for Pro and Max users.
 * Comparison View, unlimited saves, dashboard.
 */
export function canAccessProFeature(planType: string): boolean {
  return planType === "pro" || planType === "max";
}
