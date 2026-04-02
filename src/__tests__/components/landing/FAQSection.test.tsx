import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FAQSection from "@/components/landing/FAQSection";

describe("FAQSection", () => {
  it("renders the section heading", () => {
    render(<FAQSection />);
    expect(screen.getByRole("heading", { name: /frequently asked questions/i }))
      .toBeInTheDocument();
  });

  it("renders all 8 FAQ questions", () => {
    render(<FAQSection />);
    expect(screen.getByText(/is this financial advice/i)).toBeInTheDocument();
    expect(screen.getByText(/difference between free.*pro.*max/i)).toBeInTheDocument();
    expect(screen.getByText(/how accurate/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel.*subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/rental comps/i)).toBeInTheDocument();
    expect(screen.getByText(/data.*secure/i)).toBeInTheDocument();
    expect(screen.getByText(/payment methods/i)).toBeInTheDocument();
    expect(screen.getByText(/without signing up/i)).toBeInTheDocument();
  });

  it("has the section id 'faq' for anchor linking", () => {
    const { container } = render(<FAQSection />);
    expect(container.querySelector("#faq")).not.toBeNull();
  });

  it("answer text is not visible before clicking a question", () => {
    render(<FAQSection />);
    // The first answer should not be visible (accordion closed)
    const answer = screen.queryByText(/not a financial advisor/i);
    // Either not in DOM or hidden — both indicate collapsed state
    if (answer) {
      expect(answer).not.toBeVisible();
    } else {
      expect(answer).toBeNull();
    }
  });
});
