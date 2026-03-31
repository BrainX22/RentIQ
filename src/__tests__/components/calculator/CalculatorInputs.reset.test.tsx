import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CalculatorInputs from "@/components/calculator/CalculatorInputs";
import type { CalculatorInputs as CalculatorInputsType } from "@/types";

const defaultInputs: CalculatorInputsType = {
  propertyPrice: 300000,
  downPaymentPercent: 20,
  interestRate: 7,
  loanTermYears: 30,
  monthlyRent: 2000,
  propertyTaxYearly: 3600,
  insuranceMonthly: 100,
  hoaFeesMonthly: 0,
  maintenancePercent: 10,
  vacancyPercent: 5,
  propertyManagementPercent: 0,
  closingCostsPercent: 0,
};

describe("CalculatorInputs — reset button", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT render reset button when onReset prop is omitted", () => {
    render(<CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /reset to defaults/i })).toBeNull();
  });

  it("renders reset button when onReset prop is provided", () => {
    render(<CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeInTheDocument();
  });

  it("clicking reset button calls onReset once", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} onReset={onReset} />);
    await user.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("reset button does not submit the page (type=button)", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <form onSubmit={onSubmit}>
        <CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} onReset={vi.fn()} />
      </form>
    );
    const btn = container.querySelector("button[aria-label='Reset to defaults']");
    expect(btn).toHaveAttribute("type", "button");
  });
});
