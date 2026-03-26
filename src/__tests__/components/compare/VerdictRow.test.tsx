import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VerdictRow from "@/components/compare/VerdictRow";
import { makeProperty } from "@/__tests__/fixtures/makeProperty";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("VerdictRow", () => {
  // ── Structure ───────────────────────────────────────────────────────────────

  it("renders a 'Verdict' label", () => {
    const props = [
      makeProperty("a", { monthly_cash_flow: 800 }),
      makeProperty("b", { monthly_cash_flow: 200 }),
    ];
    render(<VerdictRow properties={props} />);
    expect(screen.getByText("Verdict")).toBeInTheDocument();
  });

  it("renders a score value for each property", () => {
    const props = [
      makeProperty("a", { monthly_cash_flow: 800 }),
      makeProperty("b", { monthly_cash_flow: 200 }),
    ];
    render(<VerdictRow properties={props} />);
    // Both properties should show their score
    const scores = screen.getAllByText(/Score:/);
    expect(scores).toHaveLength(2);
  });

  it("renders a score for each of 4 properties", () => {
    const props = Array.from({ length: 4 }, (_, i) =>
      makeProperty(String(i), { monthly_cash_flow: (i + 1) * 100 })
    );
    render(<VerdictRow properties={props} />);
    expect(screen.getAllByText(/Score:/)).toHaveLength(4);
  });

  // ── Best Deal badge ──────────────────────────────────────────────────────────

  it("shows exactly one 'Best Deal' badge when a clear winner exists", () => {
    const pA = makeProperty("a", { monthly_cash_flow: 1_000, noi: 25_000, property_price: 200_000 });
    const pB = makeProperty("b", { monthly_cash_flow: 200, noi: 5_000, property_price: 450_000 });
    render(<VerdictRow properties={[pA, pB]} />);
    expect(screen.getAllByText("Best Deal")).toHaveLength(1);
  });

  it("does not render 'Best Deal' when both properties are identical", () => {
    const pA = makeProperty("a");
    const pB = makeProperty("b");
    render(<VerdictRow properties={[pA, pB]} />);
    expect(screen.queryByText("Best Deal")).not.toBeInTheDocument();
  });

  it("renders only one 'Best Deal' badge among 4 properties", () => {
    const props = [
      makeProperty("a", { monthly_cash_flow: 200, noi: 5_000 }),
      makeProperty("b", { monthly_cash_flow: 100, noi: 4_000 }),
      makeProperty("c", { monthly_cash_flow: 1_000, noi: 25_000, property_price: 200_000 }),
      makeProperty("d", { monthly_cash_flow: 300, noi: 8_000 }),
    ];
    render(<VerdictRow properties={props} />);
    expect(screen.getAllByText("Best Deal")).toHaveLength(1);
  });

  it("does not render 'Best Deal' when all 3 properties are identical", () => {
    const props = [makeProperty("a"), makeProperty("b"), makeProperty("c")];
    render(<VerdictRow properties={props} />);
    expect(screen.queryByText("Best Deal")).not.toBeInTheDocument();
  });

  // ── Score breakdown tooltip ──────────────────────────────────────────────────

  it("renders score breakdown labels accessible for tooltip display", () => {
    const pA = makeProperty("a", { monthly_cash_flow: 800 });
    const pB = makeProperty("b", { monthly_cash_flow: 200 });
    render(<VerdictRow properties={[pA, pB]} />);
    // Tooltip trigger buttons should exist for each property
    const triggers = screen.getAllByRole("button");
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });

  // ── Score correctness ────────────────────────────────────────────────────────

  it("renders a numeric score value for the winner", () => {
    const pA = makeProperty("a", { monthly_cash_flow: 1_000, noi: 20_000, property_price: 200_000 });
    const pB = makeProperty("b", { monthly_cash_flow: 200, noi: 5_000, property_price: 450_000 });
    render(<VerdictRow properties={[pA, pB]} />);
    // The winner should have score=100 for cash flow, cap rate, price → check scores render
    const scores = screen.getAllByText(/Score: \d+\.\d/);
    expect(scores.length).toBe(2);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("handles a property with null cash_on_cash_return without crashing", () => {
    const pA = makeProperty("a", { cash_on_cash_return: null, monthly_cash_flow: 500 });
    const pB = makeProperty("b", { cash_on_cash_return: 10, monthly_cash_flow: 200 });
    expect(() => render(<VerdictRow properties={[pA, pB]} />)).not.toThrow();
  });

  it("handles two properties with identical data without crashing", () => {
    const pA = makeProperty("a");
    const pB = makeProperty("b");
    expect(() => render(<VerdictRow properties={[pA, pB]} />)).not.toThrow();
  });
});
