import { supabase } from "@/integrations/supabase/client";
import type { BankFixedDeposit, SaccoRecord, SavingsBenchmarkComparison } from "@/types/savings";
import { FALLBACK_BANK_FIXED_DEPOSITS, FALLBACK_SACCO_RECORDS } from "./savingsDataFallback";

const withTimeout = <T>(promise: PromiseLike<T>, ms: number = 2500): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Supabase query timeout")), ms)),
  ]);
};

export async function fetchBankFixedDeposits(currency?: "KES" | "USD", tenor?: number): Promise<BankFixedDeposit[]> {
  try {
    let query = supabase.from("bank_fixed_deposits").select("*").order("gross_yield_pct", { ascending: false });

    if (currency) {
      query = query.eq("currency", currency);
    }
    if (tenor) {
      query = query.eq("tenor_months", tenor);
    }

    const { data, error } = await withTimeout(query);
    if (error || !data || data.length === 0) {
      // Fallback to local dataset
      let filtered = [...FALLBACK_BANK_FIXED_DEPOSITS];
      if (currency) {
        filtered = filtered.filter((d) => d.currency === currency);
      }
      if (tenor) {
        filtered = filtered.filter((d) => d.tenorMonths === tenor);
      }
      return filtered.sort((a, b) => b.grossYieldPct - a.grossYieldPct);
    }

    return data.map((d: any) => ({
      id: d.id,
      bankName: d.bank_name,
      bankCode: d.bank_code,
      bankTier: d.bank_tier,
      currency: d.currency,
      tenorMonths: d.tenor_months,
      grossYieldPct: Number(d.gross_yield_pct),
      netYieldPct: Number(d.net_yield_pct || (d.gross_yield_pct * 0.85).toFixed(2)),
      minDeposit: Number(d.min_deposit),
      payoutFrequency: d.payout_frequency || "maturity",
      effectiveDate: d.effective_date,
      notes: d.notes,
      websiteUrl: d.website_url,
      logoUrl: d.logo_url,
    }));
  } catch (err) {
    let filtered = [...FALLBACK_BANK_FIXED_DEPOSITS];
    if (currency) filtered = filtered.filter((d) => d.currency === currency);
    if (tenor) filtered = filtered.filter((d) => d.tenorMonths === tenor);
    return filtered.sort((a, b) => b.grossYieldPct - a.grossYieldPct);
  }
}

export async function fetchSaccoRecords(): Promise<SaccoRecord[]> {
  try {
    const query = supabase
      .from("sacco_records")
      .select("*")
      .order("interest_on_deposits_pct", { ascending: false });

    const { data, error } = await withTimeout(query);

    if (error || !data || data.length === 0) {
      return [...FALLBACK_SACCO_RECORDS].sort((a, b) => b.interestOnDepositsPct - a.interestOnDepositsPct);
    }

    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      sasraLicense: s.sasra_license || "DT-SACCO",
      dividendOnSharesPct: Number(s.dividend_on_shares_pct),
      interestOnDepositsPct: Number(s.interest_on_deposits_pct),
      netInterestPct: Number(s.net_interest_pct || (s.interest_on_deposits_pct * 0.85).toFixed(2)),
      minMonthlyContribution: Number(s.min_monthly_contribution),
      minShareCapital: Number(s.min_share_capital),
      openToPublic: Boolean(s.open_to_public),
      membershipCategory: s.membership_category || "General Public",
      totalAssetsKesBillions: Number(s.total_assets_kes_billions),
      reportingYear: Number(s.reporting_year || 2025),
      headquarters: s.headquarters,
      websiteUrl: s.website_url,
      notes: s.notes,
      logoUrl: s.logo_url,
    }));
  } catch (err) {
    return [...FALLBACK_SACCO_RECORDS].sort((a, b) => b.interestOnDepositsPct - a.interestOnDepositsPct);
  }
}

/**
 * Calculates a cross-asset savings benchmark comparison for a given amount and duration.
 */
export function calculateSavingsBenchmark(
  depositAmount: number,
  durationMonths: number = 12
): SavingsBenchmarkComparison {
  const years = durationMonths / 12;

  // Average benchmarks in Kenya as of 2026:
  // 1. Money Market Fund: ~13.5% EAR, 15% WHT
  // 2. Tier-1 Bank Fixed Deposit (12M): ~12.0% gross, 15% WHT
  // 3. Top Regulated SACCO Deposit Rebate: ~11.5% gross, 15% WHT
  // 4. CBK 364-Day Treasury Bill: ~15.2% gross, 15% WHT

  const benchmarkPresets = [
    {
      category: "MMF" as const,
      name: "Top Money Market Fund (Avg EAR)",
      grossRatePct: 13.50,
      whtTaxRatePct: 15,
      liquidityNote: "Daily (24 to 48 hrs withdrawal)",
      riskNote: "Low / Capital Preservation (CMA Regulated)",
    },
    {
      category: "Treasury Bill" as const,
      name: "CBK 364-Day Treasury Bill",
      grossRatePct: 15.20,
      whtTaxRatePct: 15,
      liquidityNote: "Locked until auction maturity",
      riskNote: "Zero Default Risk (Government of Kenya)",
    },
    {
      category: "Fixed Deposit" as const,
      name: "Tier-1 Commercial Bank Fixed Deposit",
      grossRatePct: 12.00,
      whtTaxRatePct: 15,
      liquidityNote: `Locked for ${durationMonths} months`,
      riskNote: "Very Low (KDIC Insured up to KES 500k)",
    },
    {
      category: "SACCO" as const,
      name: "Top SASRA DT-SACCO Member Deposit",
      grossRatePct: 11.50,
      whtTaxRatePct: 15,
      liquidityNote: "Requires 60 days written notice to withdraw",
      riskNote: "Low to Moderate (SASRA Regulated)",
    },
  ];

  const items = benchmarkPresets.map((preset) => {
    const grossReturn = depositAmount * (preset.grossRatePct / 100) * years;
    const tax = grossReturn * (preset.whtTaxRatePct / 100);
    const netReturn = grossReturn - tax;

    return {
      category: preset.category,
      name: preset.name,
      grossRatePct: preset.grossRatePct,
      whtTaxRatePct: preset.whtTaxRatePct,
      projectedGrossKes: Math.round(grossReturn),
      taxDeductionKes: Math.round(tax),
      projectedNetKes: Math.round(netReturn),
      liquidityNote: preset.liquidityNote,
      riskNote: preset.riskNote,
    };
  });

  return {
    depositAmount,
    durationMonths,
    items,
  };
}
