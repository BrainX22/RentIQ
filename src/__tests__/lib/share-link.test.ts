import { describe, it, expect } from "vitest";
import { encodeInputs, decodeInputs } from "@/lib/share-link";
import { DEFAULT_CALCULATOR_INPUTS } from "@/hooks/useCalculator";
import type { CalculatorInputs } from "@/types";

describe("encodeInputs", () => {
  it("returns a URL-safe base64 string (no +, /, or =)", () => {
    const encoded = encodeInputs(DEFAULT_CALCULATOR_INPUTS);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(encoded.length).toBeGreaterThan(0);
  });
});

describe("decodeInputs", () => {
  it("round-trips: decodeInputs(encodeInputs(inputs)) deep-equals original", () => {
    const encoded = encodeInputs(DEFAULT_CALCULATOR_INPUTS);
    const decoded = decodeInputs(encoded);
    expect(decoded).toEqual(DEFAULT_CALCULATOR_INPUTS);
  });

  it("round-trips with custom values", () => {
    const custom: CalculatorInputs = {
      ...DEFAULT_CALCULATOR_INPUTS,
      propertyPrice: 450_000,
      monthlyRent: 3_200,
      propertyManagementPercent: 10,
      closingCostsPercent: 3,
    };
    const decoded = decodeInputs(encodeInputs(custom));
    expect(decoded).toEqual(custom);
  });

  it("returns null for empty string", () => {
    expect(decodeInputs("")).toBeNull();
  });

  it("returns null for invalid base64", () => {
    expect(decodeInputs("!!!not-base64!!!")).toBeNull();
  });

  it("returns null for valid base64 that is not valid JSON", () => {
    // "hello" in base64
    expect(decodeInputs("aGVsbG8")).toBeNull();
  });

  it("returns null for valid JSON that fails Zod schema validation", () => {
    // Valid JSON but wrong shape
    const badJson = btoa(JSON.stringify({ foo: "bar" }));
    const urlSafe = badJson.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeInputs(urlSafe)).toBeNull();
  });

  it("returns null for XSS payloads", () => {
    const xss = btoa(JSON.stringify({ propertyPrice: "<script>alert(1)</script>" }));
    const urlSafe = xss.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeInputs(urlSafe)).toBeNull();
  });

  it("applies .default(0) for missing PM and closing cost fields (old link compat)", () => {
    // Simulate an old share link that doesn't have the new fields
    const oldInputs = {
      propertyPrice: 300000,
      downPaymentPercent: 20,
      interestRate: 7,
      loanTermYears: 30,
      monthlyRent: 2000,
      propertyTaxYearly: 3600,
      insuranceMonthly: 100,
      hoaFeesMonthly: 0,
      maintenancePercent: 10,
      vacancyPercent: 5,
    };
    const encoded = btoa(JSON.stringify(oldInputs));
    const urlSafe = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeInputs(urlSafe);
    expect(decoded).not.toBeNull();
    expect(decoded!.propertyManagementPercent).toBe(0);
    expect(decoded!.closingCostsPercent).toBe(0);
  });

  it("strips extra unexpected fields", () => {
    const withExtra = {
      ...DEFAULT_CALCULATOR_INPUTS,
      unexpectedField: "should-be-stripped",
      anotherOne: 999,
    };
    const encoded = btoa(JSON.stringify(withExtra));
    const urlSafe = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeInputs(urlSafe);
    expect(decoded).not.toBeNull();
    expect(decoded).not.toHaveProperty("unexpectedField");
    expect(decoded).not.toHaveProperty("anotherOne");
  });

  it("rejects negative property price", () => {
    const invalid = { ...DEFAULT_CALCULATOR_INPUTS, propertyPrice: -100 };
    const encoded = btoa(JSON.stringify(invalid));
    const urlSafe = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeInputs(urlSafe)).toBeNull();
  });

  it("rejects oversized payloads (>2048 chars)", () => {
    const oversized = "A".repeat(2049);
    expect(decodeInputs(oversized)).toBeNull();
  });

  it("rejects property price exceeding $100M upper bound", () => {
    const tooExpensive = { ...DEFAULT_CALCULATOR_INPUTS, propertyPrice: 200_000_000 };
    const encoded = btoa(JSON.stringify(tooExpensive));
    const urlSafe = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeInputs(urlSafe)).toBeNull();
  });
});
