import { describe, it, expect, vi } from "vitest";
import { calculateSavingsBenchmark, fetchBankFixedDeposits, fetchSaccoRecords } from "@/lib/savingsApi";
import { FALLBACK_BANK_FIXED_DEPOSITS, FALLBACK_SACCO_RECORDS } from "@/lib/savingsDataFallback";

// Mock Supabase to simulate fallback behavior cleanly in isolated test runs
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: new Error("Offline test") }),
        eq: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error("Offline test") }),
          order: () => Promise.resolve({ data: null, error: new Error("Offline test") }),
        }),
      }),
    }),
  },
}));

describe("Savings & SACCO Data Layer", () => {
  it("has valid fallback bank fixed deposit data", () => {
    expect(FALLBACK_BANK_FIXED_DEPOSITS.length).toBeGreaterThan(5);

    FALLBACK_BANK_FIXED_DEPOSITS.forEach((fd) => {
      expect(fd.id).toBeTruthy();
      expect(fd.bankName).toBeTruthy();
      expect(fd.bankTier).toBeGreaterThanOrEqual(1);
      expect(fd.bankTier).toBeLessThanOrEqual(3);
      expect(["KES", "USD"]).toContain(fd.currency);
      expect([1, 3, 6, 12]).toContain(fd.tenorMonths);
      expect(fd.grossYieldPct).toBeGreaterThan(0);
      expect(fd.netYieldPct).toBeGreaterThan(0);
      expect(fd.netYieldPct).toBeLessThan(fd.grossYieldPct);
      expect(fd.minDeposit).toBeGreaterThan(0);
    });
  });

  it("has valid fallback SACCO records", () => {
    expect(FALLBACK_SACCO_RECORDS.length).toBeGreaterThan(5);

    FALLBACK_SACCO_RECORDS.forEach((sacco) => {
      expect(sacco.id).toBeTruthy();
      expect(sacco.name).toBeTruthy();
      expect(sacco.sasraLicense).toMatch(/^DT-SACCO|NWDT-SACCO$/);
      expect(sacco.dividendOnSharesPct).toBeGreaterThan(0);
      expect(sacco.interestOnDepositsPct).toBeGreaterThan(0);
      expect(sacco.netInterestPct).toBeGreaterThan(0);
      expect(sacco.netInterestPct).toBeLessThan(sacco.interestOnDepositsPct);
      expect(sacco.minMonthlyContribution).toBeGreaterThan(0);
      expect(sacco.totalAssetsKesBillions).toBeGreaterThan(0);
    });
  });

  it("fetches and filters bank fixed deposits correctly", async () => {
    const allKes = await fetchBankFixedDeposits("KES");
    expect(allKes.every((d) => d.currency === "KES")).toBe(true);

    const allUsd = await fetchBankFixedDeposits("USD");
    expect(allUsd.every((d) => d.currency === "USD")).toBe(true);

    const twelveMonths = await fetchBankFixedDeposits("KES", 12);
    expect(twelveMonths.every((d) => d.tenorMonths === 12)).toBe(true);
  });

  it("fetches SACCO records sorted by interest on deposits", async () => {
    const saccos = await fetchSaccoRecords();
    expect(saccos.length).toBeGreaterThan(0);

    for (let i = 0; i < saccos.length - 1; i++) {
      expect(saccos[i].interestOnDepositsPct).toBeGreaterThanOrEqual(saccos[i + 1].interestOnDepositsPct);
    }
  });

  it("calculates accurate cross-asset benchmark returns with 15% WHT", () => {
    const depositAmount = 100000;
    const durationMonths = 12;

    const result = calculateSavingsBenchmark(depositAmount, durationMonths);
    expect(result.depositAmount).toBe(depositAmount);
    expect(result.durationMonths).toBe(durationMonths);
    expect(result.items.length).toBe(4);

    result.items.forEach((item) => {
      expect(item.projectedGrossKes).toBeGreaterThan(0);
      expect(item.taxDeductionKes).toBeGreaterThan(0);
      expect(item.projectedNetKes).toBe(item.projectedGrossKes - item.taxDeductionKes);
      // Check 15% tax rate deduction
      const expectedTax = Math.round(item.projectedGrossKes * 0.15);
      expect(item.taxDeductionKes).toBe(expectedTax);
    });
  });
});
