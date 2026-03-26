import { describe, it, expect } from "vitest";
import {
  calculateMonthlyMortgage,
  calculateOperatingExpenses,
  calculateNOI,
  calculateMonthlyCashFlow,
  calculateCashOnCashReturn,
  calculateCapRate,
  calculateBreakEvenRent,
  calculateDealScore,
  calculateAll,
} from "@/lib/calculations";
import type { CalculatorInputs } from "@/types";

// ─── calculateMonthlyMortgage ─────────────────────────────────────────────────

describe("calculateMonthlyMortgage", () => {
  it("returns principal / n when interest rate is 0", () => {
    // $120,000 over 360 months = $333.33/mo
    const result = calculateMonthlyMortgage(120_000, 0, 30);
    expect(result).toBeCloseTo(333.33, 2);
  });

  it("computes standard 30yr amortization correctly", () => {
    // $160,000 at 6% for 30 years → ~$959.28/mo (industry-standard reference)
    const result = calculateMonthlyMortgage(160_000, 6, 30);
    expect(result).toBeCloseTo(959.28, 0);
  });

  it("computes 15yr loan (higher payment, less total interest)", () => {
    // $160,000 at 6% for 15 years → ~$1351.68/mo
    const result = calculateMonthlyMortgage(160_000, 6, 15);
    expect(result).toBeGreaterThan(959); // always higher than 30yr
    expect(result).toBeCloseTo(1350.17, 0);
  });

  it("computes 20yr loan", () => {
    const result = calculateMonthlyMortgage(160_000, 6, 20);
    // Must fall between 15yr and 30yr payments
    expect(result).toBeGreaterThan(959);
    expect(result).toBeLessThan(1352);
  });

  it("returns 0 for $0 principal", () => {
    expect(calculateMonthlyMortgage(0, 7, 30)).toBe(0);
  });

  it("scales linearly with principal", () => {
    const half = calculateMonthlyMortgage(100_000, 7, 30);
    const full = calculateMonthlyMortgage(200_000, 7, 30);
    expect(full).toBeCloseTo(half * 2, 2);
  });
});

// ─── calculateOperatingExpenses ───────────────────────────────────────────────

describe("calculateOperatingExpenses", () => {
  it("sums fixed and variable costs correctly", () => {
    // rent=$1000, tax=$200, ins=$100, hoa=$50, maint=10%, vacancy=5%
    // maint = 100, vacancy = 50 → total = 200+100+50+100+50 = 500
    const result = calculateOperatingExpenses(1_000, 200, 100, 50, 10, 5);
    expect(result).toBe(500);
  });

  it("handles zero variable costs", () => {
    const result = calculateOperatingExpenses(2_000, 300, 150, 0, 0, 0);
    expect(result).toBe(450);
  });

  it("handles all zeros", () => {
    expect(calculateOperatingExpenses(0, 0, 0, 0, 0, 0)).toBe(0);
  });

  it("variable costs scale with rent, not fixed amount", () => {
    const low = calculateOperatingExpenses(1_000, 0, 0, 0, 10, 0);
    const high = calculateOperatingExpenses(2_000, 0, 0, 0, 10, 0);
    expect(high).toBe(low * 2);
  });
});

// ─── calculateNOI ─────────────────────────────────────────────────────────────

describe("calculateNOI", () => {
  it("calculates annual net operating income", () => {
    // rent=1500, tax=200, ins=100, hoa=0, maint=10%(=150), vacancy=8%(=120)
    // opEx = 570 → monthly NOI = 930 → annual = 11160
    const result = calculateNOI(1_500, 200, 100, 0, 10, 8);
    expect(result).toBeCloseTo(11_160, 0);
  });

  it("returns negative NOI when expenses exceed rent", () => {
    const result = calculateNOI(500, 400, 200, 100, 10, 10);
    expect(result).toBeLessThan(0);
  });

  it("excludes mortgage (debt service) from NOI", () => {
    // NOI should not include a mortgage parameter — it's operating income only
    // opEx = 200 + 100 + 150 + 120 = 570; NOI = (1500 - 570) * 12 = 11160
    const result = calculateNOI(1_500, 200, 100, 0, 10, 8);
    expect(result).toBeCloseTo(11_160, 0);
  });
});

// ─── calculateMonthlyCashFlow ─────────────────────────────────────────────────

describe("calculateMonthlyCashFlow", () => {
  it("returns positive cash flow when rent > expenses", () => {
    expect(calculateMonthlyCashFlow(2_000, 1_500)).toBe(500);
  });

  it("returns zero when rent equals expenses (break-even)", () => {
    expect(calculateMonthlyCashFlow(1_500, 1_500)).toBe(0);
  });

  it("returns negative cash flow when expenses > rent", () => {
    expect(calculateMonthlyCashFlow(1_200, 1_500)).toBe(-300);
  });
});

// ─── calculateCashOnCashReturn ────────────────────────────────────────────────

describe("calculateCashOnCashReturn", () => {
  it("returns null when down payment is 0 (infinite leverage)", () => {
    expect(calculateCashOnCashReturn(6_000, 0)).toBeNull();
  });

  it("returns null when down payment is negative", () => {
    expect(calculateCashOnCashReturn(6_000, -1)).toBeNull();
  });

  it("calculates CoC return correctly", () => {
    // $6,000 annual cash flow / $60,000 down payment = 10%
    expect(calculateCashOnCashReturn(6_000, 60_000)).toBeCloseTo(10, 4);
  });

  it("returns negative CoC for negative cash flow", () => {
    expect(calculateCashOnCashReturn(-3_000, 50_000)).toBeCloseTo(-6, 4);
  });

  it("returns correct percentage (not decimal)", () => {
    const result = calculateCashOnCashReturn(8_000, 40_000);
    expect(result).toBeCloseTo(20, 4); // 20%, not 0.20
  });
});

// ─── calculateCapRate ─────────────────────────────────────────────────────────

describe("calculateCapRate", () => {
  it("calculates cap rate as a percentage", () => {
    // NOI=$12,000, price=$200,000 → 6%
    expect(calculateCapRate(12_000, 200_000)).toBeCloseTo(6, 4);
  });

  it("returns 0 when property price is 0 (guard clause)", () => {
    expect(calculateCapRate(10_000, 0)).toBe(0);
  });

  it("returns 0 when property price is negative", () => {
    expect(calculateCapRate(10_000, -1)).toBe(0);
  });

  it("returns correct percentage (not decimal)", () => {
    const result = calculateCapRate(20_000, 250_000);
    expect(result).toBeCloseTo(8, 4); // 8%, not 0.08
  });
});

// ─── calculateBreakEvenRent ───────────────────────────────────────────────────

describe("calculateBreakEvenRent", () => {
  it("calculates break-even rent correctly", () => {
    // fixed = 959.28 + 200 + 100 + 0 = 1259.28
    // variableRate = 10% + 8% = 18% → denominator = 0.82
    // BER = 1259.28 / 0.82 ≈ 1535.71
    const result = calculateBreakEvenRent(959.28, 200, 100, 0, 10, 8);
    expect(result).toBeCloseTo(1535.71, 0);
  });

  it("returns 0 when variable rate >= 100%", () => {
    expect(calculateBreakEvenRent(1_000, 200, 100, 0, 60, 40)).toBe(0);
    expect(calculateBreakEvenRent(1_000, 200, 100, 0, 50, 50)).toBe(0);
  });

  it("BER is always >= fixed costs (variable rate makes it higher)", () => {
    const fixedCosts = 1000 + 200 + 100 + 50;
    const ber = calculateBreakEvenRent(1000, 200, 100, 50, 5, 5);
    expect(ber).toBeGreaterThan(fixedCosts);
  });

  it("handles zero variable rates (BER equals fixed costs)", () => {
    const result = calculateBreakEvenRent(1_000, 200, 100, 50, 0, 0);
    expect(result).toBeCloseTo(1_350, 2);
  });
});

// ─── calculateDealScore ───────────────────────────────────────────────────────

describe("calculateDealScore", () => {
  describe("grade boundaries", () => {
    it("returns grade A (score >= 80) for excellent deal", () => {
      // cashFlow>=400 (40pts) + CoC>=15% (30pts) + capRate>=8 (20pts) = 90pts
      const result = calculateDealScore({
        monthlyCashFlow: 500,
        cashOnCashReturn: 16,
        capRate: 9,
      });
      expect(result.grade).toBe("A");
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it("returns grade B (score 65–79) for good deal", () => {
      // cashFlow>=200 (32pts) + CoC>=10% (24pts) + capRate>=6 (16pts) = 72pts
      const result = calculateDealScore({
        monthlyCashFlow: 250,
        cashOnCashReturn: 11,
        capRate: 6.5,
      });
      expect(result.grade).toBe("B");
      expect(result.score).toBeGreaterThanOrEqual(65);
      expect(result.score).toBeLessThan(80);
    });

    it("returns grade C (score 50–64) for average deal", () => {
      // cashFlow>=100 (24pts) + CoC>=7% (18pts) + capRate>=4.5 (12pts) = 54pts
      const result = calculateDealScore({
        monthlyCashFlow: 150,
        cashOnCashReturn: 7.5,
        capRate: 5,
      });
      expect(result.grade).toBe("C");
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(65);
    });

    it("returns grade D (score < 50) for poor deal", () => {
      // cashFlow=-200 (0pts) + CoC=-5 (0pts) + capRate=2 (4pts) = 4pts
      const result = calculateDealScore({
        monthlyCashFlow: -200,
        cashOnCashReturn: -5,
        capRate: 2,
      });
      expect(result.grade).toBe("D");
      expect(result.score).toBe(4);
    });
  });

  it("treats null CoC return (0% down) as 10pts", () => {
    // null CoC = 10pts (same as worst non-null tier plus grace)
    const withNull = calculateDealScore({
      monthlyCashFlow: 400,
      cashOnCashReturn: null,
      capRate: 8,
    });
    // 40 + 10 + 20 = 70 → grade B
    expect(withNull.score).toBe(70);
    expect(withNull.grade).toBe("B");
  });

  it("scores cash flow in range [-100, 0) as 8 points", () => {
    // Only cash flow contributes here; zero CoC + low cap rate to isolate
    const result = calculateDealScore({
      monthlyCashFlow: -50, // -100 <= x < 0 → 8pts
      cashOnCashReturn: 0,  // >= 0 → 6pts
      capRate: 0,           // >= 0 → 4pts
    });
    expect(result.score).toBe(18);
    expect(result.grade).toBe("D");
  });

  it("scores CoC return in range [4%, 7%) as 12 points", () => {
    const result = calculateDealScore({
      monthlyCashFlow: 400, // 40pts
      cashOnCashReturn: 5,  // >= 4, < 7 → 12pts
      capRate: 8,           // 20pts
    });
    expect(result.score).toBe(72);
    expect(result.grade).toBe("B");
  });

  it("scores CoC return in range [7%, 10%) as 18 points", () => {
    const result = calculateDealScore({
      monthlyCashFlow: 400, // 40pts
      cashOnCashReturn: 8,  // >= 7, < 10 → 18pts
      capRate: 8,           // 20pts
    });
    expect(result.score).toBe(78);
    expect(result.grade).toBe("B");
  });

  it("scores cap rate in range [3%, 4.5%) as 8 points", () => {
    const result = calculateDealScore({
      monthlyCashFlow: 0,           // >= 0 → 16pts
      cashOnCashReturn: 0,          // >= 0 → 6pts
      capRate: 3.5,                 // >= 3, < 4.5 → 8pts
    });
    expect(result.score).toBe(30);
    expect(result.grade).toBe("D");
  });

  it("scores cap rate in range [0%, 3%) as 4 points", () => {
    const result = calculateDealScore({
      monthlyCashFlow: 0,           // >= 0 → 16pts
      cashOnCashReturn: 0,          // >= 0 → 6pts
      capRate: 1,                   // >= 0, < 3 → 4pts
    });
    expect(result.score).toBe(26);
    expect(result.grade).toBe("D");
  });

  it("cash flow below -100 scores 0 cashFlowPoints", () => {
    // monthlyCashFlow < -100 → 0pts for cash flow
    const result = calculateDealScore({
      monthlyCashFlow: -101,
      cashOnCashReturn: 0, // 6pts
      capRate: 0,          // 4pts
    });
    expect(result.score).toBe(10); // 0 + 6 + 4
    expect(result.grade).toBe("D");
  });

  it("exact grade boundary: score 80 is grade A (not B)", () => {
    // 40 (cashFlow>=400) + 20 (capRate>=8) + 20 (cap) = need 20 from CoC
    // CoC=15% gives 30pts → 40+30+20 = 90. Try: 32 + 30 + 18 = 80
    // cashFlow>=200 (32pts) + CoC>=15 (30pts) + capRate>=6 (16pts) = 78 — not 80
    // cashFlow>=200 (32pts) + CoC>=15 (30pts) + capRate>=8 (20pts) = 82 — not 80
    // cashFlow>=400 (40pts) + CoC>=4 (12pts) + capRate>=8 (20pts) = 72 — nope
    // Score of exactly 80: cashFlow>=400 (40pts) + CoC>=7 (18pts) + capRate>=6 (16pts) + ...
    // 40+24+16 = 80: cashFlow>=200(32) + CoC>=10(24) + capRate>=6(16) = 72. Not matching.
    // Actually: cashFlow>=400(40) + CoC>=10(24) + capRate>=4.5(12) = 76. Nope.
    // cashFlow>=400(40) + CoC>=10(24) + capRate>=6(16) = 80 ✓
    const result = calculateDealScore({
      monthlyCashFlow: 400,       // exactly 400 → 40pts
      cashOnCashReturn: 10,       // exactly 10 → 24pts
      capRate: 6,                 // exactly 6 → 16pts
    });
    expect(result.score).toBe(80);
    expect(result.grade).toBe("A");
  });

  it("exact grade boundary: score 65 is grade B (not C)", () => {
    // 32 + 24 + 12 = 68 (B). 24 + 18 + 12 = 54 (C). Need exactly 65.
    // 40 + 18 + 8 = 66 (B). 32 + 18 + 12 = 62 (C). 32 + 24 + 8 = 64 (C, since < 65).
    // 40 + 12 + 12 = 64 (C). 32 + 24 + 12 = 68 (B).
    // Exactly 65 not achievable with current scoring tiers — test closest: 64 is C, 66 is B
    const scoreC = calculateDealScore({
      monthlyCashFlow: 200,  // 32pts
      cashOnCashReturn: 4,   // 12pts
      capRate: 4.5,          // 12pts — wait 32+12+12=56, C
    });
    expect(scoreC.grade).toBe("C");
    expect(scoreC.score).toBeLessThan(65);

    const scoreB = calculateDealScore({
      monthlyCashFlow: 400,  // 40pts
      cashOnCashReturn: 7,   // 18pts
      capRate: 3,            // 8pts → 40+18+8 = 66
    });
    expect(scoreB.grade).toBe("B");
    expect(scoreB.score).toBeGreaterThanOrEqual(65);
  });

  it("exact grade boundary: score 50 is grade C (not D)", () => {
    // 40 + 6 + 4 = 50 (C boundary exactly)
    const result = calculateDealScore({
      monthlyCashFlow: 400, // 40pts
      cashOnCashReturn: 0,  // 6pts
      capRate: 1,           // 4pts — total 50
    });
    expect(result.score).toBe(50);
    expect(result.grade).toBe("C");
  });

  it("score is clamped between 0 and 100", () => {
    const best = calculateDealScore({
      monthlyCashFlow: 1_000,
      cashOnCashReturn: 25,
      capRate: 15,
    });
    expect(best.score).toBeLessThanOrEqual(100);

    const worst = calculateDealScore({
      monthlyCashFlow: -500,
      cashOnCashReturn: -20,
      capRate: -1,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);
  });

  it("returns both score and grade", () => {
    const result = calculateDealScore({
      monthlyCashFlow: 300,
      cashOnCashReturn: 8,
      capRate: 5,
    });
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("grade");
    expect(["A", "B", "C", "D"]).toContain(result.grade);
  });
});

// ─── calculateAll (integration) ───────────────────────────────────────────────

describe("calculateAll", () => {
  // Reference scenario with known expected outputs
  const referenceInputs: CalculatorInputs = {
    propertyPrice: 200_000,
    downPaymentPercent: 20,  // $40,000 down, $160,000 principal
    interestRate: 6,
    loanTermYears: 30,
    monthlyRent: 1_500,
    propertyTaxYearly: 2_400, // $200/mo
    insuranceMonthly: 100,
    hoaFeesMonthly: 0,
    maintenancePercent: 10,   // $150/mo
    vacancyPercent: 8,        // $120/mo
  };

  it("returns all expected fields", () => {
    const result = calculateAll(referenceInputs);
    expect(result).toHaveProperty("monthlyMortgage");
    expect(result).toHaveProperty("monthlyPropertyTax");
    expect(result).toHaveProperty("monthlyMaintenance");
    expect(result).toHaveProperty("vacancyLoss");
    expect(result).toHaveProperty("totalMonthlyExpenses");
    expect(result).toHaveProperty("noi");
    expect(result).toHaveProperty("monthlyCashFlow");
    expect(result).toHaveProperty("annualCashFlow");
    expect(result).toHaveProperty("downPaymentAmount");
    expect(result).toHaveProperty("cashOnCashReturn");
    expect(result).toHaveProperty("capRate");
    expect(result).toHaveProperty("breakEvenRent");
  });

  it("derives downPaymentAmount correctly", () => {
    const result = calculateAll(referenceInputs);
    expect(result.downPaymentAmount).toBe(40_000);
  });

  it("derives monthlyPropertyTax from yearly input", () => {
    const result = calculateAll(referenceInputs);
    expect(result.monthlyPropertyTax).toBe(200);
  });

  it("computes monthlyMaintenance as percent of rent", () => {
    const result = calculateAll(referenceInputs);
    expect(result.monthlyMaintenance).toBe(150); // 10% of $1500
  });

  it("computes vacancyLoss as percent of rent", () => {
    const result = calculateAll(referenceInputs);
    expect(result.vacancyLoss).toBe(120); // 8% of $1500
  });

  it("computes totalMonthlyExpenses as sum of all costs", () => {
    const result = calculateAll(referenceInputs);
    const expected =
      result.monthlyMortgage + 200 + 100 + 0 + 150 + 120;
    expect(result.totalMonthlyExpenses).toBeCloseTo(expected, 2);
  });

  it("computes monthly and annual cash flow consistently", () => {
    const result = calculateAll(referenceInputs);
    expect(result.annualCashFlow).toBeCloseTo(result.monthlyCashFlow * 12, 2);
  });

  it("computes NOI excluding mortgage (debt-service agnostic)", () => {
    const result = calculateAll(referenceInputs);
    // NOI = (1500 - 570) * 12 = 11160, where 570 = 200+100+0+150+120
    expect(result.noi).toBeCloseTo(11_160, 0);
  });

  it("computes cap rate as (NOI / propertyPrice) * 100", () => {
    const result = calculateAll(referenceInputs);
    const expectedCapRate = (result.noi / 200_000) * 100;
    expect(result.capRate).toBeCloseTo(expectedCapRate, 4);
  });

  it("computes cashOnCashReturn as (annualCashFlow / downPayment) * 100", () => {
    const result = calculateAll(referenceInputs);
    expect(result.cashOnCashReturn).not.toBeNull();
    const expected = (result.annualCashFlow / 40_000) * 100;
    expect(result.cashOnCashReturn).toBeCloseTo(expected, 4);
  });

  it("returns null cashOnCashReturn for 0% down payment", () => {
    const zeroDown: CalculatorInputs = { ...referenceInputs, downPaymentPercent: 0 };
    const result = calculateAll(zeroDown);
    expect(result.cashOnCashReturn).toBeNull();
    expect(result.downPaymentAmount).toBe(0);
  });

  it("breakEvenRent is the exact rent that produces zero cash flow", () => {
    const result = calculateAll(referenceInputs);
    // Verify: plugging BER as rent should yield ~0 monthly cash flow
    const rentAtBER: CalculatorInputs = {
      ...referenceInputs,
      monthlyRent: result.breakEvenRent,
    };
    const atBreakEven = calculateAll(rentAtBER);
    expect(atBreakEven.monthlyCashFlow).toBeCloseTo(0, 1);
  });

  it("handles 100% down payment (cash purchase, no mortgage)", () => {
    const fullCash: CalculatorInputs = { ...referenceInputs, downPaymentPercent: 100 };
    const result = calculateAll(fullCash);
    expect(result.downPaymentAmount).toBe(200_000);
    expect(result.monthlyMortgage).toBeCloseTo(0, 2);
    // cashOnCashReturn is a real number (not null) — down payment is the full price
    expect(result.cashOnCashReturn).not.toBeNull();
    expect(result.cashOnCashReturn).toBeGreaterThan(0); // positive cash flow / 200k
  });
});
