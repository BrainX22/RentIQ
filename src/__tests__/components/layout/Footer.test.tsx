import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/layout/Footer";

describe("Footer", () => {
  it("renders all three column headings", () => {
    render(<Footer />);
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
  });

  it("renders product links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /calculator/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /compare/i })).toBeInTheDocument();
  });

  it("renders legal links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /changelog/i })).toBeInTheDocument();
  });

  it("renders copyright notice with current year", () => {
    render(<Footer />);
    expect(screen.getByText(/© 2026 RentIQ/i)).toBeInTheDocument();
  });

  it("renders the neighborhood illustration", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders the not-financial-advice disclaimer", () => {
    render(<Footer />);
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });
});
