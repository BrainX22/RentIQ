// rpc/src/__tests__/app/how-it-works.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock the client-only sidebar to avoid useEffect/IntersectionObserver in tests
vi.mock("@/components/how-it-works/HowItWorksSidebar", () => ({
  HowItWorksSidebar: () => <div data-testid="sidebar-mock" />,
}));

import HowItWorksPage from "@/app/how-it-works/page";

describe("HowItWorksPage", () => {
  it("renders the page heading", () => {
    render(<HowItWorksPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /how rentiq works/i })
    ).toBeInTheDocument();
  });

  it("renders the sidebar mock", () => {
    render(<HowItWorksPage />);
    expect(screen.getByTestId("sidebar-mock")).toBeInTheDocument();
  });

  it("renders #calculator section anchor", () => {
    render(<HowItWorksPage />);
    expect(document.getElementById("calculator")).toBeInTheDocument();
  });

  it("renders #save-compare section anchor", () => {
    render(<HowItWorksPage />);
    expect(document.getElementById("save-compare")).toBeInTheDocument();
  });

  it("renders #rental-comps section anchor", () => {
    render(<HowItWorksPage />);
    expect(document.getElementById("rental-comps")).toBeInTheDocument();
  });

  it("renders #neighborhood section anchor", () => {
    render(<HowItWorksPage />);
    expect(document.getElementById("neighborhood")).toBeInTheDocument();
  });

  it("renders #portfolio section anchor", () => {
    render(<HowItWorksPage />);
    expect(document.getElementById("portfolio")).toBeInTheDocument();
  });

  it("renders #deal-finder section anchor", () => {
    render(<HowItWorksPage />);
    expect(document.getElementById("deal-finder")).toBeInTheDocument();
  });

  it("explains DSCR in the calculator section", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/debt service coverage/i)).toBeInTheDocument();
  });

  it("explains the A-grade deal score threshold", () => {
    render(<HowItWorksPage />);
    // Should explain 8% CoC AND 5% cap rate = Grade A
    expect(screen.getByText(/8%.*CoC|CoC.*8%/i)).toBeInTheDocument();
  });

  it("explains HUD Fair Market Rent in comps section", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/HUD/i)).toBeInTheDocument();
  });

  it("renders a link to the calculator from the page", () => {
    render(<HowItWorksPage />);
    const links = screen.getAllByRole("link");
    const calculatorLink = links.find(
      (l) => l.getAttribute("href") === "/calculator"
    );
    expect(calculatorLink).toBeDefined();
  });
});
