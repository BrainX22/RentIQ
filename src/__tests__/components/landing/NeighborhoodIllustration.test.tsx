import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import NeighborhoodIllustration from "@/components/landing/NeighborhoodIllustration";

describe("NeighborhoodIllustration", () => {
  it("renders an SVG element", () => {
    const { container } = render(<NeighborhoodIllustration />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is aria-hidden (purely decorative)", () => {
    const { container } = render(<NeighborhoodIllustration />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("has the correct viewBox", () => {
    const { container } = render(<NeighborhoodIllustration />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1440 380");
  });

  it("preserves aspect ratio anchored to bottom", () => {
    const { container } = render(<NeighborhoodIllustration />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMax slice");
  });

  it("contains sky gradient definition", () => {
    const { container } = render(<NeighborhoodIllustration />);
    expect(container.querySelector("#skyGradient")).not.toBeNull();
  });

  it("contains the moon element", () => {
    const { container } = render(<NeighborhoodIllustration />);
    expect(container.querySelector("#moon")).not.toBeNull();
  });
});
