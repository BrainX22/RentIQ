/**
 * Excel/XLSX parser utility.
 * Extracts calculator inputs from uploaded .xlsx/.xls spreadsheets.
 */
import * as XLSX from "xlsx";
import type { CalculatorInputs } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XlsxParseResult {
  headers: string[];
  firstRow: Record<string, unknown>;
}

export type XlsxMapping = Partial<Record<keyof CalculatorInputs, string>>;

// ─── Field synonyms ───────────────────────────────────────────────────────────

const FIELD_SYNONYMS: Record<keyof CalculatorInputs, string[]> = {
  propertyPrice: ["price", "propertyprice", "listingprice", "purchaseprice", "ask"],
  downPaymentPercent: ["downpayment", "downpaymentpercent", "down", "dp"],
  interestRate: ["interestrate", "rate", "apr", "mortgagerate"],
  loanTermYears: ["loanterm", "term", "years", "loantermyears", "amortization"],
  monthlyRent: ["rent", "monthlyrent", "marketrent", "expectedrent"],
  propertyTaxYearly: ["propertytax", "tax", "propertytaxyearly", "annualtax"],
  insuranceMonthly: ["insurance", "insurancemonthly", "monthlyinsurance"],
  hoaFeesMonthly: ["hoa", "hoafees", "hoafeesmonthly", "monthlyhoa"],
  maintenancePercent: ["maintenance", "maintenancepercent", "maint"],
  vacancyPercent: ["vacancy", "vacancypercent", "vacancyrate"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[,$%\s]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse an ArrayBuffer containing an XLSX/XLS file.
 * Returns the column headers and the first data row.
 */
export function parseXlsxBuffer(buffer: ArrayBuffer): XlsxParseResult {
  // xlsx 0.18.x accepts ArrayBuffer directly with type:"array"
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], firstRow: {} };

  const ws = wb.Sheets[sheetName];
  if (!ws) return { headers: [], firstRow: {} };

  // Grab raw rows so we can separate header from data
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
  if (aoa.length === 0) return { headers: [], firstRow: {} };

  const headers = (aoa[0] as unknown[]).map((cell) => String(cell ?? ""));

  if (aoa.length < 2) return { headers, firstRow: {} };

  // Re-parse with header row so keys match original header strings
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
  });

  return { headers, firstRow: rows[0] ?? {} };
}

/**
 * Attempt to map spreadsheet column headers to CalculatorInputs keys.
 * Matching is case-insensitive and synonym-aware.
 */
export function autoMapXlsxHeaders(headers: string[]): XlsxMapping {
  const normalized = headers.map((h) => ({
    original: h,
    normalized: normalizeHeader(h),
  }));

  const mapping: XlsxMapping = {};

  for (const key of Object.keys(FIELD_SYNONYMS) as Array<keyof CalculatorInputs>) {
    const synonyms = FIELD_SYNONYMS[key];

    // Prefer exact match first to avoid synonym collisions (e.g. "rate" vs "interestrate")
    const exactMatch = normalized.find((header) =>
      synonyms.some((token) => header.normalized === token)
    );
    if (exactMatch) {
      mapping[key] = exactMatch.original;
      continue;
    }

    // Substring match as fallback for compound column names (e.g. "monthly_rent_estimate")
    const substringMatch = normalized.find((header) =>
      synonyms.some((token) => header.normalized.includes(token))
    );
    if (substringMatch) {
      mapping[key] = substringMatch.original;
    }
  }

  return mapping;
}

/**
 * Extract CalculatorInputs values from a spreadsheet row using a column mapping.
 * Currency-formatted strings are cleaned; negative values are clamped to 0.
 * loanTermYears only accepts 15, 20, or 30.
 */
export function buildInputsFromXlsxRow(
  row: Record<string, unknown>,
  mapping: XlsxMapping
): Partial<CalculatorInputs> {
  const result: Partial<CalculatorInputs> = {};

  for (const entry of Object.entries(mapping) as Array<[keyof CalculatorInputs, string | undefined]>) {
    const [key, column] = entry;
    if (!column) continue;

    const numeric = toNumber(row[column]);
    if (numeric === null) continue;

    if (key === "loanTermYears") {
      const rounded = Math.round(numeric);
      if (rounded === 15 || rounded === 20 || rounded === 30) {
        result.loanTermYears = rounded;
      }
      continue;
    }

    result[key] = Math.max(0, numeric);
  }

  return result;
}
