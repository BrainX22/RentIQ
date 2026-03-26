import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DashboardSummaryRow from "@/components/dashboard/DashboardSummaryRow";
import { makeProperty } from "../fixtures/makeProperty";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardSummaryRow", () => {
  // ── Structure ───────────────────────────────────────────────────────────────

  it("renders without crashing with an empty properties array", () => {
    expect(() => render(<DashboardSummaryRow properties={[]} />)).not.toThrow();
  });

  it("shows the 'Portfolio Summary' heading", () => {
    render(<DashboardSummaryRow properties={[]} />);
    expect(screen.getByText("Portfolio Summary")).toBeInTheDocument();
  });

  it("shows the 'Max' badge", () => {
    render(<DashboardSummaryRow properties={[]} />);
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  // ── Total monthly cash flow ──────────────────────────────────────────────────

  it("shows $0.00 total cash flow when no properties are provided", () => {
    render(<DashboardSummaryRow properties={[]} />);
    // Both cash flow and portfolio value are $0.00 — at least one match expected
    const zeros = screen.getAllByText("$0.00");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it("correctly sums monthly cash flow across multiple properties", () => {
    const properties = [
      makeProperty("a", { monthly_cash_flow: 500 }),
      makeProperty("b", { monthly_cash_flow: 500 }),
    ];
    render(<DashboardSummaryRow properties={properties} />);
    // Sum is $1,000
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  it("renders the cash flow value even when it is negative", () => {
    const properties = [
      makeProperty("a", { monthly_cash_flow: -300 }),
      makeProperty("b", { monthly_cash_flow: -200 }),
    ];
    render(<DashboardSummaryRow properties={properties} />);
    // Negative total: -$500
    expect(screen.getByText("-$500.00")).toBeInTheDocument();
  });

  // ── Total portfolio value ────────────────────────────────────────────────────

  it("correctly sums portfolio value across multiple properties", () => {
    const properties = [
      makeProperty("a", { property_price: 300_000 }),
      makeProperty("b", { property_price: 300_000 }),
    ];
    render(<DashboardSummaryRow properties={properties} />);
    expect(screen.getByText("$600,000.00")).toBeInTheDocument();
  });

  it("shows $0.00 total portfolio value when no properties are provided", () => {
    render(<DashboardSummaryRow properties={[]} />);
    // Both cash flow and portfolio value show $0.00 — both should be present
    const zeros = screen.getAllByText("$0.00");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  // ── Avg CoC return ──────────────────────────────────────────────────────────

  it("correctly averages CoC return for non-null values", () => {
    const properties = [
      makeProperty("a", { cash_on_cash_return: 10 }),
      makeProperty("b", { cash_on_cash_return: 6 }),
    ];
    render(<DashboardSummaryRow properties={properties} />);
    // Average of 10 and 6 is 8.00%
    expect(screen.getByText("8.00%")).toBeInTheDocument();
  });

  it("shows '—' when all properties have null CoC return", () => {
    const properties = [
      makeProperty("a", { cash_on_cash_return: null }),
      makeProperty("b", { cash_on_cash_return: null }),
    ];
    render(<DashboardSummaryRow properties={properties} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows '—' for avg CoC return when no properties are provided", () => {
    render(<DashboardSummaryRow properties={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("excludes null CoC return values from the average", () => {
    const properties = [
      makeProperty("a", { cash_on_cash_return: null }),
      makeProperty("b", { cash_on_cash_return: 10 }),
    ];
    render(<DashboardSummaryRow properties={properties} />);
    // Only the non-null value contributes: average is 10%, not 5%
    expect(screen.getByText("10.00%")).toBeInTheDocument();
  });
});
