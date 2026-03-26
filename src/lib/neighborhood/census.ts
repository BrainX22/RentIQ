/**
 * US Census Bureau ACS5 API — Median Household Income by ZIP code.
 *
 * Endpoint: https://api.census.gov/data/{year}/acs/acs5
 * Variable:  B19013_001E  (median household income in the past 12 months)
 * No API key required for basic access.
 *
 * Normalization:
 *   $30,000  → score   0
 *   $100,000 → score 100
 *   Linear interpolation; clamped at both ends.
 *
 * Census sentinel value -666666666 means "not available" and maps to null.
 */

const CENSUS_YEAR = "2022";
const CENSUS_BASE = `https://api.census.gov/data/${CENSUS_YEAR}/acs/acs5`;
const INCOME_VARIABLE = "B19013_001E";
const CENSUS_NA = -666666666;

const INCOME_FLOOR = 30_000;
const INCOME_CEILING = 100_000;

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Returns a 0–100 income score for the given ZIP code, or null on failure.
 * Never throws.
 */
export async function fetchCensusIncomeScore(zip: string): Promise<number | null> {
  try {
    const url =
      `${CENSUS_BASE}?get=${INCOME_VARIABLE}` +
      `&for=zip%20code%20tabulation%20area:${zip}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const data: unknown = await res.json().catch(() => null);
    return parseIncomeResponse(data);
  } catch {
    return null;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseIncomeResponse(data: unknown): number | null {
  // Expected: [[header_row], [value_row, zip]]
  if (!Array.isArray(data) || data.length < 2) return null;

  const dataRow = data[1];
  if (!Array.isArray(dataRow) || dataRow[0] == null) return null;

  const income = Number(dataRow[0]);
  if (isNaN(income) || income === CENSUS_NA) return null;

  return normalizeIncome(income);
}

function normalizeIncome(income: number): number {
  const clamped = Math.min(Math.max(income, INCOME_FLOOR), INCOME_CEILING);
  const score = ((clamped - INCOME_FLOOR) / (INCOME_CEILING - INCOME_FLOOR)) * 100;
  return Math.round(score);
}
