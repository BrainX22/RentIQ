import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import CalculatorResults from "@/components/calculator/CalculatorResults";
import { calculateAll } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CalculatorInputs, CalculatorResults as ResultsType } from "@/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const POSITIVE_INPUTS: CalculatorInputs = {
  propertyPrice: 200_000,
  downPaymentPercent: 20,
  interestRate: 6,
  loanTermYears: 30,
  monthlyRent: 2_000,        // high enough for positive cash flow
  propertyTaxYearly: 2_400,
  insuranceMonthly: 100,
  hoaFeesMonthly: 0,
  maintenancePercent: 10,
  vacancyPercent: 8,
  propertyManagementPercent: 0,
  closingCostsPercent: 0,
};

const NEGATIVE_INPUTS: CalculatorInputs = {
  ...POSITIVE_INPUTS,
  monthlyRent: 1_000,        // too low — cash flow is negative
};

const POSITIVE_RESULTS: ResultsType = calculateAll(POSITIVE_INPUTS);
const NEGATIVE_RESULTS: ResultsType = calculateAll(NEGATIVE_INPUTS);

// Sanity check — if the assertion below fails, the fixture logic is wrong,
// not the component. This gives a clear error rather than a mysterious failure.
if (POSITIVE_RESULTS.monthlyCashFlow <= 0) {
  throw new Error("POSITIVE_RESULTS fixture has non-positive cash flow — fix the inputs");
}
if (NEGATIVE_RESULTS.monthlyCashFlow >= 0) {
  throw new Error("NEGATIVE_RESULTS fixture has non-negative cash flow — fix the inputs");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CalculatorResults", () => {
  // ── Status badge ────────────────────────────────────────────────────────────

  it("shows PROFITABLE badge when cash flow is positive", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText("PROFITABLE")).toBeInTheDocument();
    expect(screen.queryByText("LOSING MONEY")).not.toBeInTheDocument();
  });

  it("shows LOSING MONEY badge when cash flow is negative", () => {
    render(<CalculatorResults results={NEGATIVE_RESULTS} />);
    expect(screen.getByText("LOSING MONEY")).toBeInTheDocument();
    expect(screen.queryByText("PROFITABLE")).not.toBeInTheDocument();
  });

  // ── Monthly cash flow ────────────────────────────────────────────────────────

  it("renders formatted monthly cash flow", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(
      screen.getByText(formatCurrency(POSITIVE_RESULTS.monthlyCashFlow))
    ).toBeInTheDocument();
  });

  it("renders negative monthly cash flow in red", () => {
    render(<CalculatorResults results={NEGATIVE_RESULTS} />);
    const cashFlowEl = screen.getByText(
      formatCurrency(NEGATIVE_RESULTS.monthlyCashFlow)
    );
    expect(cashFlowEl).toBeInTheDocument();
    expect(cashFlowEl.className).toMatch(/red/);
  });

  // ── Deal score ───────────────────────────────────────────────────────────────

  it("renders Deal Score label", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText("Deal Score")).toBeInTheDocument();
  });

  it("renders deal score value in /100 format", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/\/100\)/)).toBeInTheDocument();
  });

  // ── Metric cards ─────────────────────────────────────────────────────────────

  it("renders Cash-on-Cash Return metric", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Cash-on-Cash Return/i)).toBeInTheDocument();
  });

  it("renders the formatted cash-on-cash return value", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    // CoC and True CoC show the same value when closing costs = 0
    const matches = screen.getAllByText(formatPercent(POSITIVE_RESULTS.cashOnCashReturn!));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows ∞ when cashOnCashReturn is null (zero down payment)", () => {
    render(
      <CalculatorResults results={{ ...POSITIVE_RESULTS, cashOnCashReturn: null }} />
    );
    expect(screen.getByText("∞")).toBeInTheDocument();
  });

  it("renders Annual Cash Flow metric", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Annual Cash Flow/i)).toBeInTheDocument();
  });

  it("renders Cap Rate metric", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Cap Rate/i)).toBeInTheDocument();
  });

  it("renders NOI metric", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/NOI/i)).toBeInTheDocument();
  });

  it("renders Down Payment metric", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Down Payment/i)).toBeInTheDocument();
  });

  it("renders Monthly Mortgage metric", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Monthly Mortgage/i)).toBeInTheDocument();
  });

  // ── Phase 4: New metric cards ─────────────────────────────────────────────

  it("renders True Cash-on-Cash metric label", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/True Cash-on-Cash/i)).toBeInTheDocument();
  });

  it("renders DSCR metric label", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText("DSCR")).toBeInTheDocument();
  });

  it("renders DSCR value in Nx format", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/\d+\.\d{2}x/)).toBeInTheDocument();
  });

  it("renders Total Cash Invested metric label", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(screen.getByText(/Total Cash Invested/i)).toBeInTheDocument();
  });

  it("shows DSCR in emerald when >= 1.25", () => {
    const goodDscr = { ...POSITIVE_RESULTS, dscr: 1.5 };
    render(<CalculatorResults results={goodDscr} />);
    const dscrValue = screen.getByText(/1\.50x/);
    expect(dscrValue.className).toMatch(/emerald/);
  });

  it("shows DSCR in amber when between 1.0 and 1.25", () => {
    const okDscr = { ...POSITIVE_RESULTS, dscr: 1.1 };
    render(<CalculatorResults results={okDscr} />);
    const dscrValue = screen.getByText(/1\.10x/);
    expect(dscrValue.className).toMatch(/amber/);
  });

  it("shows DSCR in red when below 1.0", () => {
    const badDscr = { ...POSITIVE_RESULTS, dscr: 0.8 };
    render(<CalculatorResults results={badDscr} />);
    const dscrValue = screen.getByText(/0\.80x/);
    expect(dscrValue.className).toMatch(/red/);
  });

  it("shows DSCR as N/A in gray when null (cash purchase)", () => {
    const cashPurchase = { ...POSITIVE_RESULTS, dscr: null };
    render(<CalculatorResults results={cashPurchase} />);
    const dscrValue = screen.getByText("N/A");
    expect(dscrValue.className).toMatch(/gray/);
  });

  it("renders the formatted down payment amount", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    // Down Payment and Total Cash Invested show the same value when closing costs = 0
    const matches = screen.getAllByText(formatCurrency(POSITIVE_RESULTS.downPaymentAmount));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the formatted monthly mortgage", () => {
    render(<CalculatorResults results={POSITIVE_RESULTS} />);
    expect(
      screen.getByText(formatCurrency(POSITIVE_RESULTS.monthlyMortgage))
    ).toBeInTheDocument();
  });

  // ── Metric tooltips ──────────────────────────────────────────────────────────

  describe("Metric tooltips", () => {
    it("renders an info button for each of the 9 metric cards", () => {
      render(<CalculatorResults results={POSITIVE_RESULTS} />);

      expect(
        screen.getByRole("button", { name: /what is cash-on-cash return\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is true cash-on-cash\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is annual cash flow\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is cap rate\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is noi \(annual\)\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is dscr\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is down payment\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is total cash invested\?/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /what is monthly mortgage\?/i })
      ).toBeInTheDocument();
    });

    it("shows Cash-on-Cash Return tooltip description on hover", async () => {
      const user = userEvent.setup();
      render(<CalculatorResults results={POSITIVE_RESULTS} />);

      const trigger = screen.getByRole("button", {
        name: /what is cash-on-cash return\?/i,
      });
      await user.hover(trigger);

      expect(
        await screen.findByText(
          /annual cash flow divided by down payment only/i
        )
      ).toBeInTheDocument();
    });

    it("shows Annual Cash Flow tooltip description on hover", async () => {
      const user = userEvent.setup();
      render(<CalculatorResults results={POSITIVE_RESULTS} />);

      const trigger = screen.getByRole("button", {
        name: /what is annual cash flow\?/i,
      });
      await user.hover(trigger);

      expect(
        await screen.findByText(
          /total rent collected minus all expenses and mortgage payments/i
        )
      ).toBeInTheDocument();
    });

    it("shows Cap Rate tooltip description on hover", async () => {
      const user = userEvent.setup();
      render(<CalculatorResults results={POSITIVE_RESULTS} />);

      const trigger = screen.getByRole("button", { name: /what is cap rate\?/i });
      await user.hover(trigger);

      expect(
        await screen.findByText(
          /net operating income divided by property price/i
        )
      ).toBeInTheDocument();
    });
  });

  // ── Market median annotation ──────────────────────────────────────────────

  describe("marketMedian annotation", () => {
    it("does not render annotation when marketMedian is undefined", () => {
      render(<CalculatorResults results={POSITIVE_RESULTS} />);
      expect(screen.queryByText(/market benchmark/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/HUD FMR/i)).not.toBeInTheDocument();
    });

    it("does not render annotation when marketMedian is null", () => {
      render(<CalculatorResults results={POSITIVE_RESULTS} marketMedian={null} />);
      expect(screen.queryByText(/market benchmark/i)).not.toBeInTheDocument();
    });

    it("renders the market benchmark annotation when marketMedian is provided", () => {
      render(<CalculatorResults results={POSITIVE_RESULTS} marketMedian={1450} />);
      expect(screen.getByText(/market benchmark/i)).toBeInTheDocument();
      expect(screen.getByText(/HUD FMR/i)).toBeInTheDocument();
    });

    it("formats marketMedian as currency in the annotation", () => {
      render(<CalculatorResults results={POSITIVE_RESULTS} marketMedian={1850} />);
      // formatCurrency outputs "$1,850.00"; the "/mo" is a sibling text node in the same span
      expect(screen.getByText(/\$1,850/)).toBeInTheDocument();
    });

    it("renders annotation alongside the deal score badge without replacing it", () => {
      render(<CalculatorResults results={POSITIVE_RESULTS} marketMedian={1200} />);
      expect(screen.getByText("Deal Score")).toBeInTheDocument();
      expect(screen.getByText(/market benchmark/i)).toBeInTheDocument();
    });
  });
});
