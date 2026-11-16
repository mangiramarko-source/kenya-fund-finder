import type { FundFromDB, FundType } from "@/lib/api";
import { FALLBACK_KENYAN_FUNDS } from "@/lib/fundDataFallback";
import { fundCache } from "@/lib/fundCache";
import { getMarketPageMemory } from "@/lib/marketPageMemory";
import {
  FALLBACK_BANK_FIXED_DEPOSITS,
  FALLBACK_SACCO_RECORDS,
} from "@/lib/savingsDataFallback";

export type MobileNavSectionKind = "funds" | "banking" | "macro";
export type FundCategoryOptionId = "all" | FundType;
export type BankingTabOptionId = "fixed-deposits" | "saccos" | "tbills";
export type MacroTabOptionId = "fx" | "commodities";

export interface MobileNavPickerOption<T extends string = string> {
  id: T;
  pillLabel: string;
  title: string;
  tag?: string;
  subtitle: string;
  countText?: string;
  metaText?: string;
  iconName:
    | "Landmark"
    | "TrendingUp"
    | "ShieldCheck"
    | "PieChart"
    | "BarChart3"
    | "Layers"
    | "Sparkles"
    | "Users"
    | "Coins"
    | "Fuel";
}

const FUND_CATEGORY_ORDER: FundType[] = [
  "money_market",
  "fixed_income",
  "bond",
  "balanced",
  "equity",
  "special",
];

const FUND_CATEGORY_META: Record<
  FundCategoryOptionId,
  Omit<MobileNavPickerOption<FundCategoryOptionId>, "id" | "countText" | "metaText">
> = {
  all: {
    pillLabel: "All Funds",
    title: "All Categories",
    tag: "CMA",
    subtitle: "Every CMA-regulated unit trust in Kenya",
    iconName: "Layers",
  },
  money_market: {
    pillLabel: "Money Market",
    title: "Money Market",
    tag: "MMF",
    subtitle: "High-liquidity KES & USD money market funds",
    iconName: "Landmark",
  },
  fixed_income: {
    pillLabel: "Fixed Income",
    title: "Fixed Income",
    tag: "Income",
    subtitle: "Treasury & corporate fixed-income unit trusts",
    iconName: "TrendingUp",
  },
  bond: {
    pillLabel: "Bond",
    title: "Bond Funds",
    tag: "Bonds",
    subtitle: "Government & infrastructure bond funds",
    iconName: "ShieldCheck",
  },
  balanced: {
    pillLabel: "Balanced",
    title: "Balanced Funds",
    tag: "Mixed",
    subtitle: "Blended fixed-income and equity allocation",
    iconName: "PieChart",
  },
  equity: {
    pillLabel: "Equity",
    title: "Equity Funds",
    tag: "Stocks",
    subtitle: "NSE & regional stock-focused unit trusts",
    iconName: "BarChart3",
  },
  special: {
    pillLabel: "Special",
    title: "Special Funds",
    tag: "Special",
    subtitle: "Targeted & sector-specific unit trusts",
    iconName: "Sparkles",
  },
};

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function resolveMobileNavSectionKind(pathname: string): MobileNavSectionKind | null {
  const clean = normalizePathname(pathname);
  if (clean === "/funds") return "funds";
  if (clean === "/savings") return "banking";
  if (clean === "/rates" || clean === "/commodities") return "macro";
  return null;
}

export function parseFundCategoryFromSearch(search: string): FundCategoryOptionId {
  const params = new URLSearchParams(search);
  const raw = params.get("category");
  if (raw && raw in FUND_CATEGORY_META) {
    return raw as FundCategoryOptionId;
  }
  return "money_market";
}

export function parseBankingTabFromSearch(search: string): BankingTabOptionId {
  const params = new URLSearchParams(search);
  const raw = params.get("tab");
  if (raw === "saccos") return "saccos";
  if (raw === "tbills" || raw === "t-bills" || raw === "treasury") return "tbills";
  return "fixed-deposits";
}

export function parseMacroTabFromLocation(pathname: string, search: string): MacroTabOptionId {
  const clean = normalizePathname(pathname);
  if (clean === "/commodities") return "commodities";
  const params = new URLSearchParams(search);
  const raw = params.get("tab");
  if (raw === "commodities" || raw === "commodity") return "commodities";
  return "fx";
}

export function getStoredFundListForCounts(): FundFromDB[] {
  const mem = getMarketPageMemory<{ funds?: FundFromDB[] }>("funds");
  if (mem?.funds && mem.funds.length > 0) return mem.funds.filter((f) => f.is_published);
  const cached = fundCache.loadFunds();
  if (cached?.funds && cached.funds.length > 0) return cached.funds.filter((f) => f.is_published);
  return FALLBACK_KENYAN_FUNDS.filter((f) => f.is_published);
}

export function buildFundCategoryOptions(
  fundsList: FundFromDB[] = getStoredFundListForCounts(),
): MobileNavPickerOption<FundCategoryOptionId>[] {
  const counts: Partial<Record<FundType, number>> = {};
  for (const fund of fundsList) {
    counts[fund.fund_type] = (counts[fund.fund_type] ?? 0) + 1;
  }

  const allMeta = FUND_CATEGORY_META.all;
  const options: MobileNavPickerOption<FundCategoryOptionId>[] = [
    {
      id: "all",
      ...allMeta,
      countText: `${fundsList.length} funds`,
      metaText: "KES / USD",
    },
  ];

  for (const cat of FUND_CATEGORY_ORDER) {
    const count = counts[cat] ?? 0;
    if (count === 0) continue;
    const meta = FUND_CATEGORY_META[cat];
    options.push({
      id: cat,
      ...meta,
      countText: `${count} ${count === 1 ? "fund" : "funds"}`,
      metaText: cat === "money_market" ? "KES / USD" : "Unit Trust",
    });
  }

  return options;
}

export function getFundCategoryOptionMeta(
  category: FundCategoryOptionId,
  fundsList?: FundFromDB[],
): MobileNavPickerOption<FundCategoryOptionId> {
  const options = buildFundCategoryOptions(fundsList);
  return (
    options.find((o) => o.id === category) ?? {
      id: category,
      ...FUND_CATEGORY_META[category],
    }
  );
}

export function buildBankingTabOptions(counts?: {
  deposits?: number;
  saccos?: number;
}): MobileNavPickerOption<BankingTabOptionId>[] {
  const depositCount = counts?.deposits ?? FALLBACK_BANK_FIXED_DEPOSITS.length;
  const saccoCount = counts?.saccos ?? FALLBACK_SACCO_RECORDS.length;

  return [
    {
      id: "fixed-deposits",
      pillLabel: "Fixed Deposits",
      title: "Bank Fixed Deposits",
      tag: "KDIC",
      subtitle: "Guaranteed commercial bank term deposit rates",
      countText: `${depositCount} rates`,
      metaText: "KES / USD",
      iconName: "Landmark",
    },
    {
      id: "saccos",
      pillLabel: "SACCOs",
      title: "Regulated SACCOs",
      tag: "SASRA",
      subtitle: "Annual member dividends & deposit interest",
      countText: `${saccoCount} SACCOs`,
      metaText: "KES",
      iconName: "Users",
    },
    {
      id: "tbills",
      pillLabel: "T-Bills & Bonds",
      title: "Treasury Bills & Bonds",
      tag: "CBK",
      subtitle: "91, 182 & 364-day risk-free government yields",
      countText: "CBK",
      metaText: "Auction",
      iconName: "ShieldCheck",
    },
  ];
}

export function buildMacroTabOptions(counts?: {
  fx?: number;
  commodities?: number;
}): MobileNavPickerOption<MacroTabOptionId>[] {
  const memRates = getMarketPageMemory<{ rates?: unknown[] }>("rates")?.rates?.length;
  const fxCount = counts?.fx ?? memRates ?? 14;
  const commCount = counts?.commodities;

  return [
    {
      id: "fx",
      pillLabel: "FX Rates",
      title: "Foreign Exchange (FX)",
      tag: "CBK",
      subtitle: "Live USD, EUR, GBP & global rates vs KES",
      countText: `${fxCount} pairs`,
      metaText: "KES",
      iconName: "Coins",
    },
    {
      id: "commodities",
      pillLabel: "Commodities",
      title: "Commodities & Energy",
      tag: "Markets",
      subtitle: "Gold, crude oil, tea, coffee & EPRA fuel",
      countText: commCount ? `${commCount} items` : "Markets",
      metaText: "USD / KES",
      iconName: "Fuel",
    },
  ];
}
