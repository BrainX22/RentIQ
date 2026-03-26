import { describe, it, expect } from "vitest";
import {
  DEAL_FINDER_WINDOW_DAYS,
  matchesWatchlistCriteria,
  evaluatePropertyDeal,
  filterMatchingProperties,
} from "@/lib/deal-finder/auto-calculator";
import type { Property } from "@/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "prop-1",
    user_id: "user-1",
    property_name: "123 Main St, Austin TX",
    property_price: 200_000,
    down_payment_percent: 20,
    interest_rate: 7,
    loan_term_years: 30,
    monthly_rent: 2_000,
    property_tax_yearly: 3_600,
    insurance_monthly: 100,
    hoa_fees_monthly: 0,
    maintenance_percent: 5,
    vacancy_percent: 5,
    monthly_cash_flow: 400,
    annual_cash_flow: 4_800,
    cash_on_cash_return: 12,
    noi: 18_000,
    monthly_mortgage: 1_060,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// Default criteria that pass everything (all nulls)
const nullCriteria = { city: null, max_price: null, min_target_return: null };

// ─── DEAL_FINDER_WINDOW_DAYS ─────────────────────────────────────────────────

describe("DEAL_FINDER_WINDOW_DAYS", () => {
  it("exports the constant as 7", () => {
    expect(DEAL_FINDER_WINDOW_DAYS).toBe(7);
  });
});

// ─── matchesWatchlistCriteria ─────────────────────────────────────────────────

describe("matchesWatchlistCriteria", () => {
  // Test 1: Property matching all criteria (city, price, return) → true
  it("returns true when property matches all three criteria", () => {
    const property = makeProperty({
      property_name: "456 Oak Ave, Austin TX",
      property_price: 180_000,
      cash_on_cash_return: 10,
    });
    const criteria = { city: "Austin", max_price: 200_000, min_target_return: 8 };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(true);
  });

  // Test 2: City filter: case-insensitive partial match ("austin" matches "Austin TX") → true
  it("city filter matches case-insensitively and partially", () => {
    const property = makeProperty({ property_name: "100 Elm St, Austin TX" });
    const criteria = { ...nullCriteria, city: "austin" };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(true);
  });

  // Test 3: City filter: no match → false
  it("city filter returns false when city is not in property name", () => {
    const property = makeProperty({ property_name: "100 Elm St, Dallas TX" });
    const criteria = { ...nullCriteria, city: "Austin" };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(false);
  });

  // Test 4: Price filter: property_price exactly at max → true
  it("price filter passes when property_price equals max_price exactly", () => {
    const property = makeProperty({ property_price: 200_000 });
    const criteria = { ...nullCriteria, max_price: 200_000 };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(true);
  });

  // Test 5: Price filter: property_price above max → false
  it("price filter returns false when property_price exceeds max_price", () => {
    const property = makeProperty({ property_price: 250_000 });
    const criteria = { ...nullCriteria, max_price: 200_000 };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(false);
  });

  // Test 6: Min return filter: CoC return exactly at min → true
  it("min return filter passes when cash_on_cash_return equals min_target_return exactly", () => {
    const property = makeProperty({ cash_on_cash_return: 8 });
    const criteria = { ...nullCriteria, min_target_return: 8 };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(true);
  });

  // Test 7: Min return filter: CoC return below min → false
  it("min return filter returns false when cash_on_cash_return is below min_target_return", () => {
    const property = makeProperty({ cash_on_cash_return: 5 });
    const criteria = { ...nullCriteria, min_target_return: 8 };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(false);
  });

  // Test 8: Null CoC return on property with min_target_return set → false
  it("returns false when property has null cash_on_cash_return and min_target_return is set", () => {
    const property = makeProperty({ cash_on_cash_return: null });
    const criteria = { ...nullCriteria, min_target_return: 8 };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(false);
  });

  // Test 9: All criteria null → true (no filter)
  it("returns true when all criteria are null (no filter applied)", () => {
    const property = makeProperty();
    expect(matchesWatchlistCriteria(property, nullCriteria)).toBe(true);
  });

  // Test 10: Only city set, others null → respects only city
  it("respects only city filter when max_price and min_target_return are null", () => {
    const property = makeProperty({ property_name: "789 Pine Rd, Denver CO" });
    const criteria = { city: "Denver", max_price: null, min_target_return: null };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(true);
  });

  it("returns false with only city set when city does not match", () => {
    const property = makeProperty({ property_name: "789 Pine Rd, Denver CO" });
    const criteria = { city: "Austin", max_price: null, min_target_return: null };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(false);
  });

  it("ignores empty string city (treated as no filter)", () => {
    const property = makeProperty({ property_name: "100 Oak St, Dallas TX" });
    const criteria = { city: "", max_price: null, min_target_return: null };
    expect(matchesWatchlistCriteria(property, criteria)).toBe(true);
  });
});

// ─── evaluatePropertyDeal ─────────────────────────────────────────────────────

describe("evaluatePropertyDeal", () => {
  // Test 11: Property matching criteria and scoring A → passes: true, grade: 'A'
  it("returns passes: true and grade A for an excellent property matching all criteria", () => {
    // noi=18000, price=200000 → capRate=9%, cashFlow=400, CoC=12% → score=40+24+20=84 → A
    const property = makeProperty({
      property_name: "Top Deal, Austin TX",
      property_price: 200_000,
      cash_on_cash_return: 12,
      monthly_cash_flow: 400,
      noi: 18_000,
    });
    const criteria = { city: "Austin", max_price: 250_000, min_target_return: 8 };
    const result = evaluatePropertyDeal(property, criteria);
    expect(result.passes).toBe(true);
    expect(result.grade).toBe("A");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  // Test 12: Property matching criteria but scoring C/D/F → passes: false
  it("returns passes: false when property matches criteria but scores poorly (grade C/D)", () => {
    // Poor deal: negative cash flow, low CoC, low cap rate
    const property = makeProperty({
      property_name: "Bad Deal, Austin TX",
      property_price: 200_000,
      cash_on_cash_return: 1,    // 6 cocPoints
      monthly_cash_flow: -200,   // 0 cashFlowPoints (below -100)
      noi: 2_000,                // capRate=1% → 4 capRatePoints → score=10 → D
    });
    const criteria = { ...nullCriteria };
    const result = evaluatePropertyDeal(property, criteria);
    expect(result.passes).toBe(false);
    expect(["C", "D", "F"]).toContain(result.grade);
  });

  // Test 13: Property failing criteria (wrong city) → passes: false (short-circuits scoring)
  it("short-circuits and returns passes: false when property fails city filter", () => {
    const property = makeProperty({ property_name: "Nice House, Dallas TX" });
    const criteria = { city: "Austin", max_price: null, min_target_return: null };
    const result = evaluatePropertyDeal(property, criteria);
    expect(result.passes).toBe(false);
    expect(result.score).toBe(0);
    expect(result.grade).toBe("F");
  });

  // Test 14: Property with null CoC return → passes: false
  it("returns passes: false when property has null cash_on_cash_return and min_target_return is set", () => {
    const property = makeProperty({ cash_on_cash_return: null });
    const criteria = { ...nullCriteria, min_target_return: 5 };
    const result = evaluatePropertyDeal(property, criteria);
    expect(result.passes).toBe(false);
  });

  it('returns passes:false when cash_on_cash_return is null and no criteria filter (prevents false positives)', () => {
    const property = makeProperty({
      cash_on_cash_return: null,
      monthly_cash_flow: 800,
      noi: 20_000,
      property_price: 200_000
    });
    const result = evaluatePropertyDeal(property, { city: null, max_price: null, min_target_return: null });
    expect(result.passes).toBe(false);
    expect(result.grade).toBe('F');
  });

  it("returns passes true for grade B (score 65-79)", () => {
    // cashFlow=200 (32pts) + CoC=10 (24pts) + capRate=6 (16pts) = 72 → B
    const property = makeProperty({
      monthly_cash_flow: 200,
      cash_on_cash_return: 10,
      noi: 12_000, // capRate = 12000/200000*100 = 6%
      property_price: 200_000,
    });
    const result = evaluatePropertyDeal(property, nullCriteria);
    expect(result.passes).toBe(true);
    expect(result.grade).toBe("B");
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.score).toBeLessThan(80);
  });
});

// ─── filterMatchingProperties ─────────────────────────────────────────────────

describe("filterMatchingProperties", () => {
  // Test 15: Mix of A/B/C/D properties → only A/B returned, sorted by score desc
  it("returns only A/B graded properties sorted by score descending", () => {
    const propA = makeProperty({
      id: "a",
      property_name: "Grade A Deal, Austin TX",
      property_price: 200_000,
      cash_on_cash_return: 15,   // 30 pts
      monthly_cash_flow: 400,    // 40 pts
      noi: 18_000,               // capRate=9% → 20 pts → total 90 → A
    });
    const propB = makeProperty({
      id: "b",
      property_name: "Grade B Deal, Austin TX",
      property_price: 200_000,
      cash_on_cash_return: 10,   // 24 pts
      monthly_cash_flow: 200,    // 32 pts
      noi: 12_000,               // capRate=6% → 16 pts → total 72 → B
    });
    const propD = makeProperty({
      id: "d",
      property_name: "Grade D Deal, Austin TX",
      property_price: 200_000,
      cash_on_cash_return: 1,    // 6 pts
      monthly_cash_flow: -200,   // 0 pts
      noi: 2_000,                // capRate=1% → 4 pts → total 10 → D
    });

    const results = filterMatchingProperties([propD, propB, propA], nullCriteria);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("a");
    expect(results[1].id).toBe("b");
    expect(results[0].dealScore).toBeGreaterThan(results[1].dealScore);
  });

  // Test 16: Empty array → empty array returned
  it("returns empty array when input is empty", () => {
    const results = filterMatchingProperties([], nullCriteria);
    expect(results).toEqual([]);
  });

  // Test 17: No properties pass criteria → empty array
  it("returns empty array when no properties match criteria", () => {
    const properties = [
      makeProperty({ property_name: "House in Dallas TX", property_price: 300_000 }),
      makeProperty({ property_name: "House in Houston TX", property_price: 400_000 }),
    ];
    const criteria = { city: "Austin", max_price: 200_000, min_target_return: 8 };
    const results = filterMatchingProperties(properties, criteria);
    expect(results).toEqual([]);
  });

  it("augments returned properties with dealScore and dealGrade", () => {
    const property = makeProperty({
      property_name: "Good Deal, Austin TX",
      property_price: 200_000,
      cash_on_cash_return: 12,
      monthly_cash_flow: 400,
      noi: 18_000,
    });
    const results = filterMatchingProperties([property], nullCriteria);
    expect(results).toHaveLength(1);
    expect(typeof results[0].dealScore).toBe("number");
    expect(["A", "B", "C", "D", "F"]).toContain(results[0].dealGrade);
    // Should preserve original property fields
    expect(results[0].id).toBe("prop-1");
  });

  it("does not mutate the input array", () => {
    const properties = [
      makeProperty({ id: "x", property_name: "Test, Austin TX" }),
    ];
    const original = [...properties];
    filterMatchingProperties(properties, nullCriteria);
    expect(properties).toHaveLength(original.length);
    expect(properties[0]).toEqual(original[0]);
  });
});
