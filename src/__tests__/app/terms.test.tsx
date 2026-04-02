import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsPage from "@/app/terms/page";

describe("Terms of Service page", () => {
  it("renders the main heading", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: /terms of service/i, level: 1 }))
      .toBeInTheDocument();
  });

  it("contains the not-financial-advice disclaimer", () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/not financial advice/i).length).toBeGreaterThanOrEqual(1);
  });

  it("describes the three pricing tiers", () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/free.*pro.*max/i).length).toBeGreaterThanOrEqual(1);
  });

  it("mentions LemonSqueezy for payments", () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/lemonsqueezy/i).length).toBeGreaterThanOrEqual(1);
  });

  it("describes account termination rights", () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/terminat/i).length).toBeGreaterThanOrEqual(1);
  });
});
