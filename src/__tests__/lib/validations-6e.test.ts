import { describe, it, expect } from "vitest";
import { z } from "zod";
import { dismissMatchSchema, watchlistCriteriaSchema } from "@/lib/validations";
import type { DealMatch } from "@/types";

// ─── dismissMatchSchema ────────────────────────────────────────────────────

describe("dismissMatchSchema", () => {
  it("parses a valid UUID matchId successfully", () => {
    const result = dismissMatchSchema.safeParse({
      matchId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matchId).toBe("550e8400-e29b-41d4-a716-446655440000");
    }
  });

  it("rejects a non-UUID string with a message containing 'UUID'", () => {
    const result = dismissMatchSchema.safeParse({ matchId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0].message;
      expect(message.toLowerCase()).toContain("uuid");
    }
  });

  it("rejects when matchId is missing", () => {
    const result = dismissMatchSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("matchId");
    }
  });

  it("strips unknown extra fields (passthrough is not used)", () => {
    const result = dismissMatchSchema.safeParse({
      matchId: "550e8400-e29b-41d4-a716-446655440000",
      extra: "should-be-stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra).toBeUndefined();
    }
  });
});

// ─── watchlistCriteriaSchema — emailDigest field ───────────────────────────

describe("watchlistCriteriaSchema emailDigest field", () => {
  it("parses emailDigest: true correctly", () => {
    const result = watchlistCriteriaSchema.safeParse({ emailDigest: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailDigest).toBe(true);
    }
  });

  it("parses emailDigest: false correctly", () => {
    const result = watchlistCriteriaSchema.safeParse({ emailDigest: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailDigest).toBe(false);
    }
  });

  it("remains valid when emailDigest is omitted (optional field)", () => {
    const result = watchlistCriteriaSchema.safeParse({
      city: "Austin",
      maxPrice: 500000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects emailDigest: 'yes' (must be boolean)", () => {
    const result = watchlistCriteriaSchema.safeParse({ emailDigest: "yes" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("emailDigest");
    }
  });
});

// ─── DealMatch type — compile-time shape verification ─────────────────────

describe("DealMatch interface shape", () => {
  it("accepts a fully-populated DealMatch object", () => {
    const match: DealMatch = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      user_id: "550e8400-e29b-41d4-a716-446655440001",
      property_id: "550e8400-e29b-41d4-a716-446655440002",
      property_name: "123 Main St",
      property_price: 350000,
      est_monthly_cash_flow: 450,
      est_cash_on_cash_return: 8.5,
      deal_score_value: 82,
      deal_grade: "A",
      matched_at: "2026-03-21T00:00:00Z",
      dismissed_at: null,
    };
    expect(match.deal_grade).toBe("A");
    expect(match.dismissed_at).toBeNull();
  });

  it("accepts a DealMatch with null est_cash_on_cash_return", () => {
    const match: DealMatch = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      user_id: "550e8400-e29b-41d4-a716-446655440001",
      property_id: "550e8400-e29b-41d4-a716-446655440002",
      property_name: "456 Oak Ave",
      property_price: 200000,
      est_monthly_cash_flow: 300,
      est_cash_on_cash_return: null,
      deal_score_value: 65,
      deal_grade: "C",
      matched_at: "2026-03-21T00:00:00Z",
      dismissed_at: "2026-03-22T00:00:00Z",
    };
    expect(match.est_cash_on_cash_return).toBeNull();
    expect(match.dismissed_at).toBe("2026-03-22T00:00:00Z");
  });
});

// ─── dismissMatchSchema — Zod error type safety ───────────────────────────

describe("dismissMatchSchema ZodError structure", () => {
  it("error is a ZodError when parsing fails", () => {
    const result = dismissMatchSchema.safeParse({ matchId: 12345 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError);
    }
  });
});
