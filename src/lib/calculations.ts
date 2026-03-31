import type { CalculatorInputs, CalculatorResults } from "@/types";

export type DealGrade = "A" | "B" | "C" | "D";

export interface DealScore {
  grade: DealGrade;
  score: number;
}

/**
 * Monthly mortgage payment using standard amortization formula:
 * M = P × [r(1+r)^n] / [(1+r)^n − 1]
 *
 * @param principal   - Loan amount (property price minus down payment)
 * @param annualRate  - Annual interest rate as a percentage (e.g. 7.0)
 * @param termYears   - Loan term in years (15 | 20 | 30)
 */
export function calculateMonthlyMortgage(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const r = annualRate / 100 / 12; // monthly interest rate
  const n = termYears * 12;        // total number of payments

  if (r === 0) return principal / n;

  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

/**
 * Total monthly operating expenses (excludes mortgage / debt service).
 * Variable costs (maintenance, vacancy) are percentages of monthly rent.
 */
export function calculateOperatingExpenses(
  monthlyRent: number,
  monthlyPropertyTax: number,
  insuranceMonthly: number,
  hoaFeesMonthly: number,
  maintenancePercent: number,
  vacancyPercent: number
): number {
  const maintenance = monthlyRent * (maintenancePercent / 100);
  const vacancy = monthlyRent * (vacancyPercent / 100);
  return monthlyPropertyTax + insuranceMonthly + hoaFeesMonthly + maintenance + vacancy;
}

/**
 * Net Operating Income (NOI) — annual income minus all operating expenses.
 * Excludes debt service (mortgage). Used for cap rate and lender underwriting.
 *
 * NOI = (monthlyRent − operatingExpenses) × 12
 */
export function calculateNOI(
  monthlyRent: number,
  monthlyPropertyTax: number,
  insuranceMonthly: number,
  hoaFeesMonthly: number,
  maintenancePercent: number,
  vacancyPercent: number
): number {
  const opEx = calculateOperatingExpenses(
    monthlyRent,
    monthlyPropertyTax,
    insuranceMonthly,
    hoaFeesMonthly,
    maintenancePercent,
    vacancyPercent
  );
  return (monthlyRent - opEx) * 12;
}

/**
 * Monthly cash flow = rent minus all expenses including mortgage.
 */
export function calculateMonthlyCashFlow(
  monthlyRent: number,
  totalMonthlyExpenses: number
): number {
  return monthlyRent - totalMonthlyExpenses;
}

/**
 * Cash-on-Cash Return = (Annual Cash Flow / Down Payment) × 100
 * Returns null when down payment is $0 (infinite return — 100% financed).
 */
export function calculateCashOnCashReturn(
  annualCashFlow: number,
  downPaymentAmount: number
): number | null {
  if (downPaymentAmount <= 0) return null;
  return (annualCashFlow / downPaymentAmount) * 100;
}

/**
 * Capitalization Rate = (NOI / Property Price) × 100
 * Unleveraged yield — independent of financing.
 */
export function calculateCapRate(noi: number, propertyPrice: number): number {
  if (propertyPrice <= 0) return 0;
  return (noi / propertyPrice) * 100;
}

/**
 * Break-even rent — the minimum monthly rent to achieve zero cash flow.
 *
 * Since maintenance and vacancy are variable (% of rent), we isolate rent:
 *   BER = (mortgage + tax + insurance + hoa) / (1 − maintenancePct% − vacancyPct%)
 *
 * Returns 0 if the denominator would be ≤ 0 (edge case: combined variable
 * rates ≥ 100%, which would mean rent can never break even).
 */
export function calculateBreakEvenRent(
  monthlyMortgage: number,
  monthlyPropertyTax: number,
  insuranceMonthly: number,
  hoaFeesMonthly: number,
  maintenancePercent: number,
  vacancyPercent: number
): number {
  const fixedCosts = monthlyMortgage + monthlyPropertyTax + insuranceMonthly + hoaFeesMonthly;
  const variableRate = maintenancePercent / 100 + vacancyPercent / 100;
  const denominator = 1 - variableRate;
  if (denominator <= 0) return 0;
  return fixedCosts / denominator;
}

/**
 * Debt Service Coverage Ratio = NOI / Annual Debt Service.
 * Lenders typically require DSCR >= 1.25.
 * Returns null when there is no debt (cash purchase — DSCR not applicable).
 */
export function calculateDSCR(noi: number, annualDebtService: number): number | null {
  if (annualDebtService <= 0) return null;
  return noi / annualDebtService;
}

/**
 * True Cash-on-Cash Return = (Annual Cash Flow / Total Cash Invested) × 100
 * where Total Cash Invested = Down Payment + Closing Costs.
 * Returns null when total cash invested is 0 or negative.
 */
export function calculateTrueCashOnCashReturn(
  annualCashFlow: number,
  totalCashInvested: number
): number | null {
  if (totalCashInvested <= 0) return null;
  return (annualCashFlow / totalCashInvested) * 100;
}

function gradeFromScore(score: number): DealGrade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

/**
 * Deal score engine (A/B/C/D) derived from three core outputs:
 * - Monthly cash flow (stability)
 * - Cash-on-cash return (capital efficiency)
 * - Cap rate (asset yield)
 */
export function calculateDealScore(metrics: {
  monthlyCashFlow: number;
  cashOnCashReturn: number | null;
  capRate: number;
}): DealScore {
  const { monthlyCashFlow, cashOnCashReturn, capRate } = metrics;

  let cashFlowPoints = 0;
  if (monthlyCashFlow >= 400) cashFlowPoints = 40;
  else if (monthlyCashFlow >= 200) cashFlowPoints = 32;
  else if (monthlyCashFlow >= 100) cashFlowPoints = 24;
  else if (monthlyCashFlow >= 0) cashFlowPoints = 16;
  else if (monthlyCashFlow >= -100) cashFlowPoints = 8;

  let cocPoints = 0;
  if (cashOnCashReturn === null) cocPoints = 10;
  else if (cashOnCashReturn >= 15) cocPoints = 30;
  else if (cashOnCashReturn >= 10) cocPoints = 24;
  else if (cashOnCashReturn >= 7) cocPoints = 18;
  else if (cashOnCashReturn >= 4) cocPoints = 12;
  else if (cashOnCashReturn >= 0) cocPoints = 6;

  let capRatePoints = 0;
  if (capRate >= 8) capRatePoints = 20;
  else if (capRate >= 6) capRatePoints = 16;
  else if (capRate >= 4.5) capRatePoints = 12;
  else if (capRate >= 3) capRatePoints = 8;
  else if (capRate >= 0) capRatePoints = 4;

  const score = Math.max(0, Math.min(100, cashFlowPoints + cocPoints + capRatePoints));

  return {
    score,
    grade: gradeFromScore(score),
  };
}

/**
 * Master function — runs all calculations from a single CalculatorInputs
 * object and returns a fully populated CalculatorResults object.
 * This is the only function components need to call directly.
 */
export function calculateAll(inputs: CalculatorInputs): CalculatorResults {
  const {
    propertyPrice,
    downPaymentPercent,
    interestRate,
    loanTermYears,
    monthlyRent,
    propertyTaxYearly,
    insuranceMonthly,
    hoaFeesMonthly,
    maintenancePercent,
    vacancyPercent,
    propertyManagementPercent,
    closingCostsPercent,
  } = inputs;

  // ── derived inputs ──────────────────────────────────────────────────────────
  const downPaymentAmount = propertyPrice * (downPaymentPercent / 100);
  const principal = propertyPrice - downPaymentAmount;
  const monthlyPropertyTax = propertyTaxYearly / 12;
  const monthlyMaintenance = monthlyRent * (maintenancePercent / 100);
  const monthlyPropertyManagement = monthlyRent * (propertyManagementPercent / 100);
  const vacancyLoss = monthlyRent * (vacancyPercent / 100);
  const closingCostsAmount = propertyPrice * (closingCostsPercent / 100);
  const totalCashInvested = downPaymentAmount + closingCostsAmount;

  // ── mortgage ────────────────────────────────────────────────────────────────
  const monthlyMortgage = calculateMonthlyMortgage(principal, interestRate, loanTermYears);

  // ── expenses (PM fee added to total) ────────────────────────────────────────
  const totalMonthlyExpenses =
    monthlyMortgage +
    monthlyPropertyTax +
    insuranceMonthly +
    hoaFeesMonthly +
    monthlyMaintenance +
    monthlyPropertyManagement +
    vacancyLoss;

  // ── income metrics ──────────────────────────────────────────────────────────
  // Base NOI from existing function (excludes PM fee), then subtract PM fee
  const baseNoi = calculateNOI(
    monthlyRent,
    monthlyPropertyTax,
    insuranceMonthly,
    hoaFeesMonthly,
    maintenancePercent,
    vacancyPercent
  );
  const noi = baseNoi - monthlyPropertyManagement * 12;

  const monthlyCashFlow = calculateMonthlyCashFlow(monthlyRent, totalMonthlyExpenses);
  const annualCashFlow = monthlyCashFlow * 12;

  // ── return metrics ──────────────────────────────────────────────────────────
  const cashOnCashReturn = calculateCashOnCashReturn(annualCashFlow, downPaymentAmount);
  const trueCashOnCashReturn = calculateTrueCashOnCashReturn(annualCashFlow, totalCashInvested);
  const capRate = calculateCapRate(noi, propertyPrice);
  const dscr = calculateDSCR(noi, monthlyMortgage * 12);

  // ── risk metric ─────────────────────────────────────────────────────────────
  const breakEvenRent = calculateBreakEvenRent(
    monthlyMortgage,
    monthlyPropertyTax,
    insuranceMonthly,
    hoaFeesMonthly,
    maintenancePercent + propertyManagementPercent,
    vacancyPercent
  );

  return {
    monthlyMortgage,
    monthlyPropertyTax,
    monthlyMaintenance,
    monthlyPropertyManagement,
    vacancyLoss,
    totalMonthlyExpenses,
    noi,
    monthlyCashFlow,
    annualCashFlow,
    downPaymentAmount,
    closingCostsAmount,
    totalCashInvested,
    cashOnCashReturn,
    trueCashOnCashReturn,
    capRate,
    dscr,
    breakEvenRent,
  };
}
