import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PropertyCardSkeleton from "@/components/dashboard/PropertyCardSkeleton";

describe("PropertyCardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<PropertyCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders skeleton pulse elements", () => {
    const { container } = render(<PropertyCardSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("renders a card-shaped container", () => {
    const { container } = render(<PropertyCardSkeleton />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/rounded/);
    expect(card.className).toMatch(/border/);
  });

  it("renders multiple metric placeholder blocks", () => {
    const { container } = render(<PropertyCardSkeleton />);
    // Should have at least 4 metric placeholders matching PropertyCard layout
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });
});
