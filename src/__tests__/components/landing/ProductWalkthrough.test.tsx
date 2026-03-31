import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProductWalkthrough from "@/components/landing/ProductWalkthrough";

describe("ProductWalkthrough", () => {
  it("renders the section heading", () => {
    render(<ProductWalkthrough />);
    expect(
      screen.getByRole("heading", { level: 2, name: /from any listing/i })
    ).toBeInTheDocument();
  });

  it("renders all 3 step numbers", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders tier badges for Free, Pro, and Max", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("renders calculator UI mockup label", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText(/quick analysis/i)).toBeInTheDocument();
  });

  it("renders comparison UI mockup label", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText(/compare properties/i)).toBeInTheDocument();
  });

  it("renders portfolio actuals UI mockup label", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText(/portfolio actuals/i)).toBeInTheDocument();
  });

  it("renders Paul's testimonial", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText(/amazing product/i)).toBeInTheDocument();
    expect(screen.getByText("Paul")).toBeInTheDocument();
  });

  it("renders David's testimonial", () => {
    render(<ProductWalkthrough />);
    expect(screen.getByText(/feels really good/i)).toBeInTheDocument();
    expect(screen.getByText("David")).toBeInTheDocument();
  });

  it("renders CTA link to /how-it-works", () => {
    render(<ProductWalkthrough />);
    const link = screen.getByRole("link", { name: /learn how it works/i });
    expect(link).toHaveAttribute("href", "/how-it-works");
  });
});
