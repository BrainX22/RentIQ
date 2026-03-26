import { describe, it, expect } from "vitest";
import { canAccessProFeature, canAccessMaxFeature, PLAN_LIMITS } from "@/lib/feature-gates";

describe("canAccessProFeature", () => {
  it("returns true for pro plan", () => {
    expect(canAccessProFeature("pro")).toBe(true);
  });

  it("returns true for max plan (max includes all pro features)", () => {
    expect(canAccessProFeature("max")).toBe(true);
  });

  it("returns false for free plan", () => {
    expect(canAccessProFeature("free")).toBe(false);
  });

  it("returns false for unknown plan string", () => {
    expect(canAccessProFeature("unknown")).toBe(false);
  });
});

describe("canAccessMaxFeature", () => {
  it("returns true for max plan", () => {
    expect(canAccessMaxFeature("max")).toBe(true);
  });

  it("returns false for pro plan", () => {
    expect(canAccessMaxFeature("pro")).toBe(false);
  });

  it("returns false for free plan", () => {
    expect(canAccessMaxFeature("free")).toBe(false);
  });

  it("returns false for unknown plan string", () => {
    expect(canAccessMaxFeature("unknown")).toBe(false);
  });
});

describe("PLAN_LIMITS", () => {
  it("free tier has 5 saves per month", () => {
    expect(PLAN_LIMITS.free.savesPerMonth).toBe(5);
  });

  it("pro tier has unlimited saves", () => {
    expect(PLAN_LIMITS.pro.savesPerMonth).toBe(Infinity);
  });

  it("max tier has unlimited saves", () => {
    expect(PLAN_LIMITS.max.savesPerMonth).toBe(Infinity);
  });
});
