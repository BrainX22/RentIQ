import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ComparisonGrid from "@/components/compare/ComparisonGrid";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { makeProperty } from "@/__tests__/fixtures/makeProperty";

// propA: cheaper, higher cash flow → wins Price & Monthly Cash Flow rows
const propA = makeProperty("a", {
  property_name: "Oak Avenue SFH",
  property_price: 250_000,
  monthly_cash_flow: 600,
  annual_cash_flow: 7_200,
  cash_on_cash_return: 12,
  noi: 14_000,
  monthly_rent: 1_900,
  down_payment_percent: 20,
});

// propB: pricier, lower cash flow
const propB = makeProperty("b", {
  property_name: "Maple Street Duplex",
  property_price: 400_000,
  monthly_cash_flow: 200,
  annual_cash_flow: 2_400,
  cash_on_cash_return: 5,
  noi: 18_000,
  monthly_rent: 2_500,
  down_payment_percent: 20,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ComparisonGrid", () => {
  // ── Structure ───────────────────────────────────────────────────────────────

  it("renders all property names as column headers", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    expect(screen.getByText("Oak Avenue SFH")).toBeInTheDocument();
    expect(screen.getByText("Maple Street Duplex")).toBeInTheDocument();
  });

  it("renders the 'Metric' column header", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    expect(screen.getByText("Metric")).toBeInTheDocument();
  });

  it("renders all eight metric row labels", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Monthly Cash Flow")).toBeInTheDocument();
    expect(screen.getByText("CoC Return")).toBeInTheDocument();
    expect(screen.getByText("Cap Rate")).toBeInTheDocument();
    expect(screen.getByText("NOI")).toBeInTheDocument();
    expect(screen.getByText("Annual Cash Flow")).toBeInTheDocument();
    expect(screen.getByText("Monthly Rent")).toBeInTheDocument();
    expect(screen.getByText("Down Payment")).toBeInTheDocument();
  });

  it("wraps the table in an overflow-x-auto container for mobile scrolling", () => {
    const { container } = render(<ComparisonGrid properties={[propA, propB]} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/overflow-x-auto/);
  });

  // ── Formatting ──────────────────────────────────────────────────────────────

  it("formats property prices as currency", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    // Each value appears at least once in a td
    expect(screen.getByText(formatCurrency(250_000))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(400_000))).toBeInTheDocument();
  });

  it("formats cash flow values as currency", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    expect(screen.getByText(formatCurrency(600))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(200))).toBeInTheDocument();
  });

  it("formats CoC return as a percentage", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    expect(screen.getByText(formatPercent(12))).toBeInTheDocument();
    expect(screen.getByText(formatPercent(5))).toBeInTheDocument();
  });

  it("formats computed down payment as currency", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    const downA = (propA.property_price * propA.down_payment_percent) / 100; // $50,000
    const downB = (propB.property_price * propB.down_payment_percent) / 100; // $80,000
    expect(screen.getByText(formatCurrency(downA))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(downB))).toBeInTheDocument();
  });

  it("shows 'N/A' when cash_on_cash_return is null", () => {
    const propNull = makeProperty("null", { cash_on_cash_return: null });
    render(<ComparisonGrid properties={[propA, propNull]} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  // ── Winner highlighting ─────────────────────────────────────────────────────

  it("applies emerald class to the lower-price winner", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    // propA has price $250,000 → lower → winner
    const priceCell = screen.getByText(formatCurrency(250_000));
    expect(priceCell.className).toMatch(/emerald/);
  });

  it("does NOT apply emerald class to the higher-price loser", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    const loserCell = screen.getByText(formatCurrency(400_000));
    expect(loserCell.className).not.toMatch(/emerald/);
  });

  it("applies emerald class to the higher cash-flow winner", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    // propA cash flow $600 > propB $200 → winner
    const cashCell = screen.getByText(formatCurrency(600));
    expect(cashCell.className).toMatch(/emerald/);
  });

  it("applies emerald class to the higher NOI winner", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    // propB NOI 18,000 > propA 14,000 → winner
    const noiCell = screen.getByText(formatCurrency(18_000));
    expect(noiCell.className).toMatch(/emerald/);
  });

  it("applies emerald class to the lower down-payment winner", () => {
    render(<ComparisonGrid properties={[propA, propB]} />);
    // propA down = $50k, propB down = $80k → propA wins (lower)
    const downCell = screen.getByText(formatCurrency(50_000));
    expect(downCell.className).toMatch(/emerald/);
  });

  it("does not apply emerald class to any cell when all values are equal", () => {
    const p1 = makeProperty("x", { monthly_cash_flow: 500, noi: 15_000 });
    const p2 = makeProperty("y", { monthly_cash_flow: 500, noi: 15_000 });
    // Force all compared fields equal
    const { container } = render(<ComparisonGrid properties={[p1, p2]} />);
    const emeraldCells = container.querySelectorAll("td[class*='emerald']");
    expect(emeraldCells.length).toBe(0);
  });

  // ── Multi-property ──────────────────────────────────────────────────────────

  it("renders correctly with 3 properties", () => {
    const propC = makeProperty("c", { property_name: "Pine Road Condo" });
    render(<ComparisonGrid properties={[propA, propB, propC]} />);
    expect(screen.getByText("Oak Avenue SFH")).toBeInTheDocument();
    expect(screen.getByText("Maple Street Duplex")).toBeInTheDocument();
    expect(screen.getByText("Pine Road Condo")).toBeInTheDocument();
  });

  it("renders correctly with 4 properties", () => {
    const props = Array.from({ length: 4 }, (_, i) =>
      makeProperty(String(i), { property_name: `Unit ${i}` })
    );
    render(<ComparisonGrid properties={props} />);
    props.forEach((p) => expect(screen.getByText(p.property_name)).toBeInTheDocument());
  });

  it("renders computed cap rate as a percentage", () => {
    // propA: noi=14_000, price=250_000 → cap rate = 5.60%
    render(<ComparisonGrid properties={[propA, propB]} />);
    const capRateA = (propA.noi / propA.property_price) * 100; // 5.6
    expect(screen.getByText(formatPercent(capRateA))).toBeInTheDocument();
  });
});
