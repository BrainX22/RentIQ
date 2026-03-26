import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
};

describe("CalculatorInputs inline validation", () => {
  it("shows no validation errors on initial render", () => {
    const { container } = render(
      <CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} />
    );
    expect(container.querySelectorAll("[role='alert']").length).toBe(0);
  });

  it("shows no errors before any field is blurred (no keystroke validation)", () => {
    const zeroInputs = { ...defaultInputs, propertyPrice: 0, monthlyRent: 0, interestRate: 0 };
    const { container } = render(
      <CalculatorInputs inputs={zeroInputs} setInput={vi.fn()} />
    );
    expect(container.querySelectorAll("[role='alert']").length).toBe(0);
  });

  it("shows error for Property Price when blurred with zero value", () => {
    const inputs = { ...defaultInputs, propertyPrice: 0 };
    render(<CalculatorInputs inputs={inputs} setInput={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Property Price"));
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/property price is required/i)).toBeInTheDocument();
  });

  it("shows error for Monthly Rent when blurred with zero value", () => {
    const inputs = { ...defaultInputs, monthlyRent: 0 };
    render(<CalculatorInputs inputs={inputs} setInput={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Monthly Rent"));
    expect(screen.getByText(/monthly rent is required/i)).toBeInTheDocument();
  });

  it("shows error for Interest Rate when blurred with zero value", () => {
    const inputs = { ...defaultInputs, interestRate: 0 };
    render(<CalculatorInputs inputs={inputs} setInput={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Interest Rate"));
    expect(screen.getByText(/interest rate is required/i)).toBeInTheDocument();
  });

  it("does not show error when Property Price is valid on blur", () => {
    render(<CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Property Price"));
    expect(screen.queryByText(/property price is required/i)).toBeNull();
  });

  it("does not require optional fields (property tax, insurance, HOA) to be non-zero", () => {
    const inputs = {
      ...defaultInputs,
      propertyTaxYearly: 0,
      insuranceMonthly: 0,
      hoaFeesMonthly: 0,
    };
    render(<CalculatorInputs inputs={inputs} setInput={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Property Tax (yearly)"));
    fireEvent.blur(screen.getByLabelText("Insurance (monthly)"));
    fireEvent.blur(screen.getByLabelText("HOA (monthly)"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows only the error for the blurred field, not others", () => {
    const inputs = { ...defaultInputs, propertyPrice: 0, monthlyRent: 0 };
    render(<CalculatorInputs inputs={inputs} setInput={vi.fn()} />);
    // Blur only Property Price
    fireEvent.blur(screen.getByLabelText("Property Price"));
    expect(screen.queryByText(/monthly rent is required/i)).toBeNull();
    expect(screen.getByText(/property price is required/i)).toBeInTheDocument();
  });

  it("clears error for a field when its value becomes valid", () => {
    const setInput = vi.fn();
    const inputs = { ...defaultInputs, propertyPrice: 0 };
    const { rerender } = render(
      <CalculatorInputs inputs={inputs} setInput={setInput} />
    );

    const input = screen.getByLabelText("Property Price");
    fireEvent.blur(input);
    expect(screen.getByText(/property price is required/i)).toBeInTheDocument();

    // Simulate parent updating the value after user types
    rerender(
      <CalculatorInputs inputs={{ ...inputs, propertyPrice: 300000 }} setInput={setInput} />
    );
    fireEvent.blur(input);
    expect(screen.queryByText(/property price is required/i)).toBeNull();
  });

  it("error element has role='alert' for accessibility", () => {
    const inputs = { ...defaultInputs, propertyPrice: 0 };
    render(<CalculatorInputs inputs={inputs} setInput={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Property Price"));
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("inputs have accessible labels for Property Price, Monthly Rent, and Interest Rate", () => {
    render(<CalculatorInputs inputs={defaultInputs} setInput={vi.fn()} />);
    expect(screen.getByLabelText("Property Price")).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly Rent")).toBeInTheDocument();
    expect(screen.getByLabelText("Interest Rate")).toBeInTheDocument();
  });
});
