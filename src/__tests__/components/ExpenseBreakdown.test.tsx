import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ExpenseBreakdown from "@/components/calculator/ExpenseBreakdown";
import { calculateAll } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import type { CalculatorInputs, CalculatorResults } from "@/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_INPUTS: CalculatorInputs = {
  propertyPrice: 200_000,
  downPaymentPercent: 20,
  interestRate: 6,
  loanTermYears: 30,
  monthlyRent: 2_000,
  propertyTaxYearly: 2_400,
  insuranceMonthly: 100,
  hoaFeesMonthly: 0,          // zero — should NOT render as a line item
  maintenancePercent: 10,
  vacancyPercent: 8,
  propertyManagementPercent: 0,
  closingCostsPercent: 0,
};

const INPUTS_WITH_HOA: CalculatorInputs = {
  ...BASE_INPUTS,
  hoaFeesMonthly: 250,        // non-zero — SHOULD render as a line item
};

const POSITIVE_RESULTS: CalculatorResults = calculateAll(BASE_INPUTS);
const NEGATIVE_RESULTS: CalculatorResults = calculateAll({
  ...BASE_INPUTS,
  monthlyRent: 1_000,         // too low — negative cash flow
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ExpenseBreakdown", () => {
  // ── Heading ─────────────────────────────────────────────────────────────────

  it("renders the Monthly Expense Breakdown heading", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Monthly Expense Breakdown/i)).toBeInTheDocument();
  });

  // ── Line items ───────────────────────────────────────────────────────────────

  it("renders Mortgage (P&I) line item", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Mortgage (P&I)")).toBeInTheDocument();
  });

  it("renders Property Tax line item", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Property Tax")).toBeInTheDocument();
  });

  it("renders Insurance line item", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Insurance")).toBeInTheDocument();
  });

  it("renders Maintenance line item", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
  });

  it("renders Vacancy Loss line item", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Vacancy Loss")).toBeInTheDocument();
  });

  it("does NOT render HOA row when hoaFeesMonthly is 0", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.queryByText("HOA")).not.toBeInTheDocument();
  });

  it("renders HOA row when hoaFeesMonthly is non-zero", () => {
    render(<ExpenseBreakdown inputs={INPUTS_WITH_HOA} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("HOA")).toBeInTheDocument();
  });

  // ── Summary rows ─────────────────────────────────────────────────────────────

  it("renders Total Expenses with formatted value", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(POSITIVE_RESULTS.totalMonthlyExpenses))
    ).toBeInTheDocument();
  });

  it("renders Monthly Rent with formatted value", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Monthly Rent")).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(BASE_INPUTS.monthlyRent))
    ).toBeInTheDocument();
  });

  it("renders Net Cash Flow label", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Net Cash Flow")).toBeInTheDocument();
  });

  it("renders formatted net cash flow value", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    // monthlyCashFlow appears twice: once in ExpenseBreakdown, once possibly elsewhere
    const cashFlowValues = screen.getAllByText(
      formatCurrency(POSITIVE_RESULTS.monthlyCashFlow)
    );
    expect(cashFlowValues.length).toBeGreaterThanOrEqual(1);
  });

  // ── Negative cash-flow warning ────────────────────────────────────────────

  it("does NOT show the negative warning when cash flow is positive", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={POSITIVE_RESULTS} />);
    expect(screen.queryByText(/cash-flow negative/i)).not.toBeInTheDocument();
  });

  it("shows the negative cash-flow warning when cash flow is negative", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={NEGATIVE_RESULTS} />);
    expect(screen.getByText(/cash-flow negative/i)).toBeInTheDocument();
  });

  it("shows 'Break-even rent' label in the warning", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={NEGATIVE_RESULTS} />);
    expect(screen.getByText(/Break-even rent/i)).toBeInTheDocument();
  });

  it("shows the formatted break-even rent in the warning", () => {
    render(<ExpenseBreakdown inputs={BASE_INPUTS} results={NEGATIVE_RESULTS} />);
    expect(
      screen.getByText(`${formatCurrency(NEGATIVE_RESULTS.breakEvenRent)}/mo`)
    ).toBeInTheDocument();
  });
});
