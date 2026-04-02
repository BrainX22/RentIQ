/**
 * TDD: Excel/XLSX parser utility
 * RED phase — tests written before implementation.
 */
import { describe, it, expect } from "vitest";
import {
  parseXlsxBuffer,
  autoMapXlsxHeaders,
  buildInputsFromXlsxRow,
} from "@/lib/xlsx-parser";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal XLSX file buffer from a header row + data row.
 * Uses the `xlsx` library directly in the test so the test data is realistic.
 */
async function buildXlsxBuffer(
  headers: string[],
  data: Record<string, unknown>
): Promise<ArrayBuffer> {
  const { utils, write } = await import("xlsx");
  const ws = utils.json_to_sheet([data], { header: headers });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Sheet1");
  // write() returns ArrayBuffer in xlsx 0.18.x when type:"array"
  const raw = write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer | Uint8Array;
  if (raw instanceof ArrayBuffer) return raw;
  // Uint8Array path — slice to a standalone ArrayBuffer (avoids byteOffset issues)
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
}

// ─── parseXlsxBuffer ─────────────────────────────────────────────────────────

describe("parseXlsxBuffer", () => {
  it("extracts headers and first row from a valid xlsx buffer", async () => {
    const buffer = await buildXlsxBuffer(
      ["property_price", "monthly_rent", "interest_rate"],
      { property_price: 350000, monthly_rent: 2200, interest_rate: 7.0 }
    );

    const result = parseXlsxBuffer(buffer);

    expect(result.headers).toEqual(["property_price", "monthly_rent", "interest_rate"]);
    expect(result.firstRow["property_price"]).toBe(350000);
    expect(result.firstRow["monthly_rent"]).toBe(2200);
    expect(result.firstRow["interest_rate"]).toBe(7.0);
  });

  it("returns empty arrays for a buffer with headers only (no data rows)", async () => {
    const { utils, write } = await import("xlsx");
    // Create a sheet with only header row — no data
    const ws = utils.aoa_to_sheet([["property_price", "monthly_rent"]]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sheet1");
    const raw = write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer | Uint8Array;
    const buffer = raw instanceof ArrayBuffer ? raw : raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);

    const result = parseXlsxBuffer(buffer);

    expect(result.headers.length).toBeGreaterThan(0);
    expect(result.firstRow).toEqual({});
  });

  it("uses only the first sheet when multiple sheets exist", async () => {
    const { utils, write } = await import("xlsx");
    const ws1 = utils.json_to_sheet([{ price: 100000 }]);
    const ws2 = utils.json_to_sheet([{ price: 999999 }]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws1, "Correct");
    utils.book_append_sheet(wb, ws2, "Ignore");
    const raw = write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer | Uint8Array;
    const buffer = raw instanceof ArrayBuffer ? raw : raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);

    const result = parseXlsxBuffer(buffer);

    expect(result.firstRow["price"]).toBe(100000);
  });

  it("handles string values for numeric-looking cells", async () => {
    const buffer = await buildXlsxBuffer(
      ["property_price", "notes"],
      { property_price: "450,000", notes: "Great deal" }
    );

    const result = parseXlsxBuffer(buffer);

    // String values are preserved as-is; downstream toNumber handles cleanup
    expect(typeof result.firstRow["property_price"]).toBe("string");
    expect(result.firstRow["notes"]).toBe("Great deal");
  });
});

// ─── autoMapXlsxHeaders ──────────────────────────────────────────────────────

describe("autoMapXlsxHeaders", () => {
  it("maps exact synonym match", () => {
    const mapping = autoMapXlsxHeaders(["price", "rent", "interest_rate"]);
    expect(mapping.propertyPrice).toBe("price");
    expect(mapping.monthlyRent).toBe("rent");
    expect(mapping.interestRate).toBe("interest_rate");
  });

  it("maps headers case-insensitively", () => {
    const mapping = autoMapXlsxHeaders(["Property Price", "Monthly Rent"]);
    expect(mapping.propertyPrice).toBe("Property Price");
    expect(mapping.monthlyRent).toBe("Monthly Rent");
  });

  it("returns empty mapping for unrecognised headers", () => {
    const mapping = autoMapXlsxHeaders(["foo", "bar", "baz"]);
    expect(Object.values(mapping).every((v) => v === undefined)).toBe(true);
  });

  it("handles headers with special characters and spaces", () => {
    const mapping = autoMapXlsxHeaders(["Property Tax (Yearly)", "HOA Fees"]);
    expect(mapping.propertyTaxYearly).toBe("Property Tax (Yearly)");
    expect(mapping.hoaFeesMonthly).toBe("HOA Fees");
  });

  // ── BiggerPockets export column names ─────────────────────────────────────
  it("maps BiggerPockets-style headers", () => {
    const headers = [
      "Purchase Price",
      "Monthly Gross Rent",
      "Annual Property Tax",
      "Vacancy Rate",
      "CapEx Reserve",
      "Management Fee",
      "Down Payment",
      "Interest Rate",
    ];
    const mapping = autoMapXlsxHeaders(headers);
    expect(mapping.propertyPrice).toBe("Purchase Price");
    expect(mapping.monthlyRent).toBe("Monthly Gross Rent");
    expect(mapping.propertyTaxYearly).toBe("Annual Property Tax");
    expect(mapping.vacancyPercent).toBe("Vacancy Rate");
    expect(mapping.maintenancePercent).toBe("CapEx Reserve");
    expect(mapping.propertyManagementPercent).toBe("Management Fee");
    expect(mapping.downPaymentPercent).toBe("Down Payment");
    expect(mapping.interestRate).toBe("Interest Rate");
  });

  // ── Stessa export column names ────────────────────────────────────────────
  it("maps Stessa-style headers", () => {
    const headers = [
      "Acquisition Price",
      "Scheduled Rent",
      "Property Taxes",
      "Hazard Insurance",
      "HOA Fee",
      "CapEx",
      "Property Management",
      "Vacancy Allowance",
    ];
    const mapping = autoMapXlsxHeaders(headers);
    expect(mapping.propertyPrice).toBe("Acquisition Price");
    expect(mapping.monthlyRent).toBe("Scheduled Rent");
    expect(mapping.propertyTaxYearly).toBe("Property Taxes");
    expect(mapping.insuranceMonthly).toBe("Hazard Insurance");
    expect(mapping.hoaFeesMonthly).toBe("HOA Fee");
    expect(mapping.maintenancePercent).toBe("CapEx");
    expect(mapping.propertyManagementPercent).toBe("Property Management");
    expect(mapping.vacancyPercent).toBe("Vacancy Allowance");
  });

  // ── DealCheck export column names ─────────────────────────────────────────
  it("maps DealCheck-style headers", () => {
    const headers = [
      "Asking Price",
      "Monthly Income",
      "Taxes",
      "Insurance (Monthly)",
      "HOA (Monthly)",
      "Repairs",
      "Mgmt Fee",
      "Settlement Costs",
      "Down %",
      "Note Rate",
    ];
    const mapping = autoMapXlsxHeaders(headers);
    expect(mapping.propertyPrice).toBe("Asking Price");
    expect(mapping.monthlyRent).toBe("Monthly Income");
    expect(mapping.propertyTaxYearly).toBe("Taxes");
    expect(mapping.insuranceMonthly).toBe("Insurance (Monthly)");
    expect(mapping.hoaFeesMonthly).toBe("HOA (Monthly)");
    expect(mapping.maintenancePercent).toBe("Repairs");
    expect(mapping.propertyManagementPercent).toBe("Mgmt Fee");
    expect(mapping.closingCostsPercent).toBe("Settlement Costs");
    expect(mapping.downPaymentPercent).toBe("Down %");
    expect(mapping.interestRate).toBe("Note Rate");
  });

  // ── Common DIY landlord spreadsheet terms ────────────────────────────────
  it("maps DIY landlord spreadsheet terms", () => {
    const headers = [
      "Market Value",
      "Equity",
      "GRI",
      "Annual Taxes",
      "Landlord Insurance",
      "Condo Fee",
      "Capex %",
      "Loss to Vacancy",
      "PM Rate",
      "Escrow",
      "Amortization",
      "Int Rate",
    ];
    const mapping = autoMapXlsxHeaders(headers);
    expect(mapping.propertyPrice).toBe("Market Value");
    expect(mapping.downPaymentPercent).toBe("Equity");
    expect(mapping.monthlyRent).toBe("GRI");
    expect(mapping.propertyTaxYearly).toBe("Annual Taxes");
    expect(mapping.insuranceMonthly).toBe("Landlord Insurance");
    expect(mapping.hoaFeesMonthly).toBe("Condo Fee");
    expect(mapping.maintenancePercent).toBe("Capex %");
    expect(mapping.vacancyPercent).toBe("Loss to Vacancy");
    expect(mapping.propertyManagementPercent).toBe("PM Rate");
    expect(mapping.closingCostsPercent).toBe("Escrow");
    expect(mapping.loanTermYears).toBe("Amortization");
    expect(mapping.interestRate).toBe("Int Rate");
  });

  // ── Canadian / Australian / condo-specific terms ──────────────────────────
  it("maps strata fee (Canadian/Australian HOA equivalent)", () => {
    const mapping = autoMapXlsxHeaders(["Strata", "Fair Market Value", "GSR"]);
    expect(mapping.hoaFeesMonthly).toBe("Strata");
    expect(mapping.propertyPrice).toBe("Fair Market Value");
    expect(mapping.monthlyRent).toBe("GSR");
  });

  // ── Underwriter / lender sheet terms ─────────────────────────────────────
  it("maps underwriter / lender sheet terms", () => {
    const headers = [
      "Acquisition Costs",
      "Vacancy Factor",
      "Void Rate",
      "Capital Expenditure",
      "Dwelling Insurance",
      "Homeowners Insurance",
      "Loan Rate",
      "Loan Period",
      "Sale Price",
      "Buying Costs",
    ];
    const mapping = autoMapXlsxHeaders(headers);
    expect(mapping.closingCostsPercent).toBe("Acquisition Costs");
    expect(mapping.vacancyPercent).toBe("Vacancy Factor");
    expect(mapping.vacancyPercent).toBe("Vacancy Factor"); // same field
    expect(mapping.maintenancePercent).toBe("Capital Expenditure");
    expect(mapping.insuranceMonthly).toBe("Dwelling Insurance");
    expect(mapping.insuranceMonthly).toBe("Dwelling Insurance");
    expect(mapping.interestRate).toBe("Loan Rate");
    expect(mapping.loanTermYears).toBe("Loan Period");
    expect(mapping.propertyPrice).toBe("Sale Price");
    expect(mapping.closingCostsPercent).toBe("Acquisition Costs");
  });

  // ── Abbreviated / shorthand columns ──────────────────────────────────────
  it("maps abbreviated shorthand columns", () => {
    // Note: ultra-short like "Vac" are intentionally not supported (false-positive risk)
    const mapping = autoMapXlsxHeaders([
      "DP", "APR", "Ins", "Maint", "PM", "Closing",
    ]);
    expect(mapping.downPaymentPercent).toBe("DP");
    expect(mapping.interestRate).toBe("APR");
    expect(mapping.insuranceMonthly).toBe("Ins");
    expect(mapping.maintenancePercent).toBe("Maint");
    expect(mapping.propertyManagementPercent).toBe("PM");
    expect(mapping.closingCostsPercent).toBe("Closing");
  });

  // ── Rental income labelled differently ───────────────────────────────────
  it("maps all rent synonyms to monthlyRent", () => {
    const terms = ["Gross Rent", "Rental Income", "Rents", "Monthly Gross Rent", "Scheduled Rent"];
    for (const term of terms) {
      const mapping = autoMapXlsxHeaders([term]);
      expect(mapping.monthlyRent).toBe(term);
    }
  });});

// ─── buildInputsFromXlsxRow ──────────────────────────────────────────────────

describe("buildInputsFromXlsxRow", () => {
  it("extracts numeric fields correctly", () => {
    const row = { price: 350000, rent: 2200, rate: 7.0 };
    const mapping = { propertyPrice: "price", monthlyRent: "rent", interestRate: "rate" };
    const result = buildInputsFromXlsxRow(row, mapping);
    expect(result.propertyPrice).toBe(350000);
    expect(result.monthlyRent).toBe(2200);
    expect(result.interestRate).toBe(7.0);
  });

  it("cleans currency-formatted string values", () => {
    const row = { price: "$350,000", rent: "2,200" };
    const mapping = { propertyPrice: "price", monthlyRent: "rent" };
    const result = buildInputsFromXlsxRow(row, mapping);
    expect(result.propertyPrice).toBe(350000);
    expect(result.monthlyRent).toBe(2200);
  });

  it("accepts only valid loan terms (15, 20, 30)", () => {
    const validRow = { term: 30 };
    expect(buildInputsFromXlsxRow(validRow, { loanTermYears: "term" }).loanTermYears).toBe(30);

    const invalidRow = { term: 25 };
    expect(buildInputsFromXlsxRow(invalidRow, { loanTermYears: "term" }).loanTermYears).toBeUndefined();
  });

  it("ignores unmapped fields", () => {
    const row = { price: 200000, ignored: "junk" };
    const mapping = { propertyPrice: "price" };
    const result = buildInputsFromXlsxRow(row, mapping);
    expect(result.propertyPrice).toBe(200000);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("clamps negative values to zero", () => {
    const row = { tax: -500 };
    const mapping = { propertyTaxYearly: "tax" };
    const result = buildInputsFromXlsxRow(row, mapping);
    expect(result.propertyTaxYearly).toBe(0);
  });

  it("returns empty object when no fields map", () => {
    const result = buildInputsFromXlsxRow({ foo: "bar" }, {});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
