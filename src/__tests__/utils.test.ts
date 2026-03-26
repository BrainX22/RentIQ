import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "skip", "keep")).toBe("base keep");
  });

  it("merges conflicting Tailwind classes (last wins)", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });
});

describe("formatCurrency", () => {
  it("formats positive values as USD", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats negative values correctly", () => {
    expect(formatCurrency(-250)).toBe("-$250.00");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("respects maximumFractionDigits override (must be >= 2 due to minimum constraint)", () => {
    // minimumFractionDigits is 2, so maximum must be >= 2
    expect(formatCurrency(1234.5678, 3)).toBe("$1,234.568");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1_000_000)).toBe("$1,000,000.00");
  });
});

describe("formatPercent", () => {
  it("formats percentage with default 2 decimal places", () => {
    expect(formatPercent(8.5)).toBe("8.50%");
  });

  it("formats with custom fraction digits", () => {
    expect(formatPercent(10, 0)).toBe("10%");
  });

  it("formats negative percentages", () => {
    expect(formatPercent(-3.5)).toBe("-3.50%");
  });

  it("formats zero correctly", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });
});
