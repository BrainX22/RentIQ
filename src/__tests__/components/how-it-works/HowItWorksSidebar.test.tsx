// rpc/src/__tests__/components/how-it-works/HowItWorksSidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorksSidebar } from "@/components/how-it-works/HowItWorksSidebar";

describe("HowItWorksSidebar", () => {
  it("renders nav landmark with accessible label", () => {
    render(<HowItWorksSidebar />);
    expect(
      screen.getByRole("navigation", { name: /page sections/i })
    ).toBeInTheDocument();
  });

  it("renders all 6 section links", () => {
    render(<HowItWorksSidebar />);
    expect(screen.getByRole("link", { name: /the calculator/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /save & compare/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rental comps/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /neighborhood/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /portfolio tracking/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /deal finder/i })).toBeInTheDocument();
  });

  it("links point to correct anchor hrefs", () => {
    render(<HowItWorksSidebar />);
    expect(screen.getByRole("link", { name: /the calculator/i })).toHaveAttribute(
      "href",
      "#calculator"
    );
    expect(screen.getByRole("link", { name: /save & compare/i })).toHaveAttribute(
      "href",
      "#save-compare"
    );
    expect(screen.getByRole("link", { name: /rental comps/i })).toHaveAttribute(
      "href",
      "#rental-comps"
    );
    expect(screen.getByRole("link", { name: /neighborhood/i })).toHaveAttribute(
      "href",
      "#neighborhood"
    );
    expect(screen.getByRole("link", { name: /portfolio tracking/i })).toHaveAttribute(
      "href",
      "#portfolio"
    );
    expect(screen.getByRole("link", { name: /deal finder/i })).toHaveAttribute(
      "href",
      "#deal-finder"
    );
  });

  it("renders tier badges for Free, Pro, Max", () => {
    render(<HowItWorksSidebar />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    // Max appears 4 times (Comps, Neighborhood, Portfolio, Deal Finder)
    const maxBadges = screen.getAllByText("Max");
    expect(maxBadges.length).toBe(4);
  });

  it("applies active styling to the default active link (calculator)", () => {
    render(<HowItWorksSidebar />);
    const activeLink = screen.getByRole("link", { name: /the calculator/i });
    expect(activeLink.className).toContain("bg-orange-50");
    expect(activeLink.className).toContain("text-orange-700");

    const inactiveLink = screen.getByRole("link", { name: /save & compare/i });
    expect(inactiveLink.className).not.toContain("bg-orange-50");
    expect(inactiveLink.className).toContain("text-gray-500");
  });
});
