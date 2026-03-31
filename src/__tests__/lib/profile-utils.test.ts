import { describe, it, expect } from "vitest";
import { deriveDisplayName, calculateDaysRemaining, detectAuthProvider } from "@/lib/profile-utils";

describe("deriveDisplayName", () => {
  it("extracts first name from dot-separated email", () => {
    expect(deriveDisplayName("alex.johnson@gmail.com")).toBe("Alex");
  });

  it("extracts first name from underscore-separated email", () => {
    expect(deriveDisplayName("john_doe@company.io")).toBe("John");
  });

  it("extracts first name from hyphen-separated email", () => {
    expect(deriveDisplayName("mary-jane@example.com")).toBe("Mary");
  });

  it("extracts first name from plus-addressed email", () => {
    expect(deriveDisplayName("user+tag@example.com")).toBe("User");
  });

  it("capitalizes single-word email prefix", () => {
    expect(deriveDisplayName("info@example.com")).toBe("Info");
  });

  it("handles all-uppercase email", () => {
    expect(deriveDisplayName("ADMIN@CORP.COM")).toBe("Admin");
  });

  it("returns 'User' for empty or invalid email", () => {
    expect(deriveDisplayName("")).toBe("User");
    expect(deriveDisplayName("@noprefix.com")).toBe("User");
  });

  it("handles numeric-only prefix", () => {
    expect(deriveDisplayName("12345@example.com")).toBe("12345");
  });
});

describe("calculateDaysRemaining", () => {
  it("returns positive days for future date", () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const result = calculateDaysRemaining(futureDate);
    expect(result).toBeGreaterThanOrEqual(13);
    expect(result).toBeLessThanOrEqual(15);
  });

  it("returns 0 for past date", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    expect(calculateDaysRemaining(pastDate)).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(calculateDaysRemaining(null)).toBe(0);
  });

  it("returns 0 for invalid date string", () => {
    expect(calculateDaysRemaining("not-a-date")).toBe(0);
  });

  it("returns 1 for date ~20 hours from now", () => {
    const almostTomorrow = new Date(Date.now() + 20 * 3600000).toISOString();
    expect(calculateDaysRemaining(almostTomorrow)).toBe(1);
  });
});

describe("detectAuthProvider", () => {
  it("returns 'google' when providers array includes google", () => {
    const meta = { providers: ["google"], provider: "google" };
    expect(detectAuthProvider(meta)).toBe("google");
  });

  it("returns 'email' when providers array is email only", () => {
    const meta = { providers: ["email"], provider: "email" };
    expect(detectAuthProvider(meta)).toBe("email");
  });

  it("returns 'google' when only provider (singular) is google", () => {
    const meta = { provider: "google" };
    expect(detectAuthProvider(meta)).toBe("google");
  });

  it("returns 'email' for empty or missing metadata", () => {
    expect(detectAuthProvider({})).toBe("email");
    expect(detectAuthProvider(undefined)).toBe("email");
    expect(detectAuthProvider(null)).toBe("email");
  });
});
