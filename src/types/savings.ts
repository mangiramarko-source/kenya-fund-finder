export type BankTier = 1 | 2 | 3;
export type FixedDepositTenor = 1 | 3 | 6 | 12;
export type FixedDepositCurrency = "KES" | "USD";
export type PayoutFrequency = "maturity" | "monthly" | "quarterly";

export interface BankFixedDeposit {
  id: string;
  bankName: string;
  bankCode?: string;
  bankTier: BankTier;
  currency: FixedDepositCurrency;
  tenorMonths: FixedDepositTenor;
  grossYieldPct: number; // e.g. 11.5 for 11.50% p.a.
  netYieldPct: number; // after 15% WHT (gross * 0.85)
  minDeposit: number;
  payoutFrequency: PayoutFrequency;
  effectiveDate: string;
  notes?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export type SasraLicenseType = "DT-SACCO" | "NWDT-SACCO";

export interface SaccoRecord {
  id: string;
  name: string;
  code?: string;
  sasraLicense: SasraLicenseType;
  dividendOnSharesPct: number; // Dividend on share capital, e.g. 14.5%
  interestOnDepositsPct: number; // Interest / rebate on member deposits, e.g. 11.8%
  netInterestPct: number; // after 15% WHT (interest * 0.85)
  minMonthlyContribution: number; // KES
  minShareCapital: number; // KES
  openToPublic: boolean;
  membershipCategory: string; // e.g. "Open to all Kenyans & Diaspora", "Public Sector / Teachers"
  totalAssetsKesBillions: number;
  reportingYear: number;
  headquarters?: string;
  websiteUrl?: string;
  notes?: string;
  logoUrl?: string;
}

export interface SavingsBenchmarkComparison {
  depositAmount: number;
  durationMonths: number;
  items: {
    category: "MMF" | "Fixed Deposit" | "SACCO" | "Treasury Bill";
    name: string;
    grossRatePct: number;
    whtTaxRatePct: number;
    projectedGrossKes: number;
    taxDeductionKes: number;
    projectedNetKes: number;
    liquidityNote: string;
    riskNote: string;
  }[];
}
