// ─── Calculator ───────────────────────────────────────────────────────────────

export interface CalculatorInputs {
  propertyPrice: number;
  downPaymentPercent: number; // 0–100
  interestRate: number;       // annual %, e.g. 7.0
  loanTermYears: number;      // 15 | 20 | 30
  monthlyRent: number;
  propertyTaxYearly: number;
  insuranceMonthly: number;
  hoaFeesMonthly: number;
  maintenancePercent: number;          // % of monthly rent
  vacancyPercent: number;              // % of monthly rent
  propertyManagementPercent: number;   // % of monthly rent, default 0
  closingCostsPercent: number;         // % of purchase price, default 0
}

export interface CalculatorResults {
  monthlyMortgage: number;
  monthlyPropertyTax: number;
  monthlyMaintenance: number;
  monthlyPropertyManagement: number;  // rent × (propertyManagementPercent / 100)
  vacancyLoss: number;
  totalMonthlyExpenses: number;
  noi: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  downPaymentAmount: number;
  closingCostsAmount: number;          // price × (closingCostsPercent / 100)
  totalCashInvested: number;           // downPayment + closingCosts
  cashOnCashReturn: number | null;     // null when down payment is 0
  trueCashOnCashReturn: number | null; // annualCF / totalCashInvested; null when 0
  capRate: number;
  dscr: number | null;                  // NOI / annual debt service; null when no debt
  breakEvenRent: number;
}

// ─── Database entities ────────────────────────────────────────────────────────

export interface Property {
  id: string;
  user_id: string;
  property_name: string;
  property_price: number;
  down_payment_percent: number;
  interest_rate: number;
  loan_term_years: number;
  monthly_rent: number;
  property_tax_yearly: number;
  insurance_monthly: number;
  hoa_fees_monthly: number;
  maintenance_percent: number;
  vacancy_percent: number;
  // stored computed outputs
  monthly_cash_flow: number;
  annual_cash_flow: number;
  cash_on_cash_return: number | null;
  noi: number;
  monthly_mortgage: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  ls_customer_id: string | null;
  ls_subscription_id: string | null;
  ls_order_id: string | null;
  plan_type: "free" | "pro" | "max";
  status: "active" | "canceled" | "past_due";
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyActual {
  id: string;
  property_id: string;
  user_id: string;
  month: number;       // 1–12
  year: number;
  actual_rent: number;
  actual_expenses: number;
  notes: string | null;
  created_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  calculation_count: number;
  month_year: string; // "YYYY-MM"
  created_at: string;
}

export interface WatchlistCriteria {
  id: string;
  user_id: string;
  city: string | null;
  max_price: number | null;
  min_target_return: number | null;
  email_digest: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Deal Finder ──────────────────────────────────────────────────────────────

export interface DealMatch {
  id: string;
  user_id: string;
  property_id: string;
  property_name: string;
  property_price: number;
  est_monthly_cash_flow: number;
  est_cash_on_cash_return: number | null;
  deal_score_value: number;
  deal_grade: "A" | "B" | "C" | "D";
  matched_at: string;
  dismissed_at: string | null;
}

// ─── Neighborhood Scoring ─────────────────────────────────────────────────────

/**
 * Composite neighborhood quality signals for a ZIP code.
 * Weights: safety=40%, income=35%, growth=25%.
 * Individual scores are 0–100; null when the data source was unavailable.
 * Weights redistribute proportionally when sources are null.
 */
export interface NeighborhoodScores {
  composite: number;        // 0–100 weighted average
  safety: number | null;    // 0–100 from CrimeGrade (40% weight)
  income: number | null;    // 0–100 from Census ACS5 median HH income (35% weight)
  growth: number | null;    // 0–100 from FHFA HPI ZIP3 appreciation (25% weight)
  grade: "A" | "B" | "C" | "D" | "F";
  sources: string[];        // which data sources returned data, e.g. ["crimegrade","census","fhfa"]
}

/** Shape returned by the /api/neighborhood endpoint when data is available. */
export interface NeighborhoodResponse {
  available: true;
  zip_code: string;
  scores: NeighborhoodScores;
  fetchedAt: string; // ISO timestamp
}

// ─── Rental Comps ─────────────────────────────────────────────────────────────

export interface RentalComp {
  beds: number;
  rent: number;
  source: string;
}

/** Shape returned by the /api/comps endpoint when data is available. */
export interface CompsResponse {
  available: true;
  source: "cache";
  comps: RentalComp[];
  marketMedian: number; // HUD FMR 40th-percentile benchmark rent
  fetchedAt: string;    // ISO timestamp the data was seeded/fetched
  zip_code: string;
  bedrooms: number;
}

/**
 * Shape stored inside rental_comps_cache.comps_json (JSONB column).
 * Mirrors CompsResponse minus the route-level fields (zip_code, bedrooms).
 */
export interface CachedCompsData {
  source: string;
  marketMedian: number;
  comps: RentalComp[];
  fetchedAt: string;
}
