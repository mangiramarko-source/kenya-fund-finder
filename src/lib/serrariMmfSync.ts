import type { FundFromDB } from "./api";

export interface SerrariMmfRow {
  rank: number;
  providerKey: string;
  providerName: string;
  fundName: string;
  slug: string;
  manager: string;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD";
  annual_yield: number;
  daily_yield: number;
  net_yield: number;
  management_fee: number;
  minimum_investment: number;
  aumText: string;
  cma_licensed: boolean;
  asOfDate: string;
  sourceUrl: string;
}

export interface SerrariCanonicalFundMeta {
  slug: string;
  name: string;
  manager: string;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD";
  website: string;
  withdrawal_time: string;
}

/**
 * Converts Effective Annual Rate (EAR %) to Nominal Daily Compounded Rate (%):
 *   daily_yield = 365 * ((1 + EAR / 100)^(1 / 365) - 1) * 100
 * Rounded to 2 decimal places.
 */
export function deriveDailyYieldFromEar(earPercent: number): number {
  if (!Number.isFinite(earPercent) || earPercent <= 0) return 0;
  const earDecimal = earPercent / 100;
  const nominalAnnualDecimal = 365 * (Math.pow(1 + earDecimal, 1 / 365) - 1);
  return Math.round(nominalAnnualDecimal * 100 * 100) / 100;
}

/**
 * Canonical mapping from Serrari's provider/company key + currency to Kenya Fund Finder's
 * fund `slug`, `name`, `manager`, and `yield_unit`.
 */
export const SERRARI_KES_MMF_MAP: Record<string, SerrariCanonicalFundMeta> = {
  cytonn: {
    slug: "cytonn-sh-mmf",
    name: "Cytonn",
    manager: "Cytonn Asset Managers Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.cytonn.com/investments/money-market-fund",
    withdrawal_time: "Instant (M-Pesa)",
  },
  faulu: {
    slug: "faulu-sh-mmf",
    name: "Faulu",
    manager: "Old Mutual Investment Group",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.faulukenya.com",
    withdrawal_time: "1-2 days",
  },
  "lofty corban": {
    slug: "lofty-corban-sh-mmf",
    name: "Lofty-Corban",
    manager: "Lofty-Corban Investments Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://loftycorban.com",
    withdrawal_time: "1 day",
  },
  nabo: {
    slug: "nabo-sh-mmf",
    name: "Nabo",
    manager: "Nabo Capital Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.nabocapital.com",
    withdrawal_time: "1-2 days",
  },
  madison: {
    slug: "madison-sh-mmf",
    name: "Madison",
    manager: "Madison Investment Managers Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.madison.co.ke",
    withdrawal_time: "1-2 days",
  },
  "orient kasha": {
    slug: "orient-kasha-sh-mmf",
    name: "Orient Kasha",
    manager: "Orient Asset Managers Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://orientasset.co.ke",
    withdrawal_time: "1-2 days",
  },
  "old mutual": {
    slug: "old-mutual-sh-mmf",
    name: "Old Mutual",
    manager: "Old Mutual Investment Group",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.oldmutual.co.ke",
    withdrawal_time: "1-2 days",
  },
  jubilee: {
    slug: "jubilee-sh-mmf",
    name: "Jubilee",
    manager: "Jubilee Asset Management",
    currency: "KES",
    yield_unit: "%",
    website: "https://jubileeinsurance.com/ke/",
    withdrawal_time: "1-2 days",
  },
  kuza: {
    slug: "kuza-sh-mmf",
    name: "Kuza",
    manager: "Kuza Asset Management Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.kuza.africa",
    withdrawal_time: "1 day",
  },
  etica: {
    slug: "etica-sh-mmf",
    name: "Etica",
    manager: "Etica Capital Ltd",
    currency: "KES",
    yield_unit: "%",
    website: "https://eticacapital.com",
    withdrawal_time: "Instant (M-Pesa)",
  },
  arvocap: {
    slug: "arvocap-sh-mmf",
    name: "Arvocap",
    manager: "Arvocap Asset Managers Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.arvocap.com",
    withdrawal_time: "1-2 days",
  },
  genafrica: {
    slug: "genafrica-sh-mmf",
    name: "GenAfrica",
    manager: "GenAfrica Asset Managers Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://genafrica.com",
    withdrawal_time: "1-3 days",
  },
  britam: {
    slug: "britam-sh-mmf",
    name: "Britam",
    manager: "Britam Asset Managers",
    currency: "KES",
    yield_unit: "%",
    website: "https://ke.britam.com",
    withdrawal_time: "1-2 days",
  },
  sanlam: {
    slug: "sanlamallianz-sh-mmf",
    name: "SanlamAllianz",
    manager: "Sanlam Allianz Investments Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.sanlam.co.ke",
    withdrawal_time: "1-2 days",
  },
  kcb: {
    slug: "kcb-sh-mmf",
    name: "KCB",
    manager: "KCB Asset Management Ltd",
    currency: "KES",
    yield_unit: "%",
    website: "https://ke.kcbbankgroup.com",
    withdrawal_time: "1-2 days",
  },
  "dry associates": {
    slug: "dry-associates-sh-mmf",
    name: "Dry Associates",
    manager: "Dry Associates Investment Bank",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.dryassociates.com",
    withdrawal_time: "2-3 days",
  },
  genghis: {
    slug: "genghis-sh-mmf",
    name: "Genghis",
    manager: "Genghis Capital Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.genghis-capital.com",
    withdrawal_time: "1-2 days",
  },
  cpf: {
    slug: "cpf-sh-mmf",
    name: "CPF",
    manager: "CPF Financial Services",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.cpf.or.ke",
    withdrawal_time: "1-2 days",
  },
  cic: {
    slug: "cic-sh-mmf",
    name: "CIC",
    manager: "CIC Asset Management Ltd",
    currency: "KES",
    yield_unit: "%",
    website: "https://cic.co.ke",
    withdrawal_time: "1-2 days",
  },
  "african alliance": {
    slug: "african-alliance-sh-mmf",
    name: "African Alliance Enhanced",
    manager: "African Alliance Kenya Asset Management",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.africanallianceassetmanagement.com",
    withdrawal_time: "2-3 days",
  },
  ncba: {
    slug: "ncba-sh-mmf",
    name: "NCBA",
    manager: "NCBA Investment Bank",
    currency: "KES",
    yield_unit: "%",
    website: "https://investment-bank.ncbagroup.com",
    withdrawal_time: "1 day",
  },
  apa: {
    slug: "apollo-sh-mmf",
    name: "Apollo",
    manager: "Apollo Asset Management Company Ltd",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.apainsurance.org",
    withdrawal_time: "1-2 days",
  },
  "co-op": {
    slug: "coop-sh-mmf",
    name: "Co-op",
    manager: "Co-op Trust Investment Services Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.co-opbank.co.ke",
    withdrawal_time: "1-2 days",
  },
  "icea lion": {
    slug: "icea-sh-mmf",
    name: "ICEA Lion",
    manager: "ICEA LION Asset Management Ltd",
    currency: "KES",
    yield_unit: "%",
    website: "https://icealion.co.ke",
    withdrawal_time: "1-2 days",
  },
  safaricom: {
    slug: "ziidi-money-market-fund",
    name: "Ziidi",
    manager: "Standard Investment Bank, ALA Capital Limited & Sanlam Investments East Africa Limited",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.safaricom.co.ke/personal/m-pesa/wealth/ziidi",
    withdrawal_time: "Instant (M-Pesa)",
  },
  stanbic: {
    slug: "stanbic-sh-mmf",
    name: "Stanbic",
    manager: "Stanbic Investment Management Services",
    currency: "KES",
    yield_unit: "%",
    website: "https://www.stanbicbank.co.ke",
    withdrawal_time: "1-2 days",
  },
  equity: {
    slug: "equity-sh-mmf",
    name: "Equity",
    manager: "Equity Investment Bank",
    currency: "KES",
    yield_unit: "%",
    website: "https://equitygroupholdings.com/ke/save-invest",
    withdrawal_time: "1 day",
  },
};

export const SERRARI_USD_MMF_MAP: Record<string, SerrariCanonicalFundMeta> = {
  nabo: {
    slug: "nabo-usd-mmf",
    name: "Nabo USD",
    manager: "Nabo Capital Limited",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.nabocapital.com",
    withdrawal_time: "2-3 days",
  },
  jubilee: {
    slug: "jubilee-usd-mmf",
    name: "Jubilee USD",
    manager: "Jubilee Asset Management",
    currency: "USD",
    yield_unit: "USD",
    website: "https://jubileeinsurance.com/ke/",
    withdrawal_time: "2-3 days",
  },
  cytonn: {
    slug: "cytonn-usd-mmf",
    name: "Cytonn USD",
    manager: "Cytonn Asset Managers Limited",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.cytonn.com",
    withdrawal_time: "1-2 days",
  },
  "old mutual": {
    slug: "old-mutual-usd-mmf",
    name: "Old Mutual USD",
    manager: "Old Mutual Investment Group",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.oldmutual.co.ke",
    withdrawal_time: "2-3 days",
  },
  kuza: {
    slug: "kuza-usd-mmf",
    name: "Kuza USD",
    manager: "Kuza Asset Management Limited",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.kuza.africa",
    withdrawal_time: "1-2 days",
  },
  kcb: {
    slug: "kcb-usd-mmf",
    name: "KCB USD",
    manager: "KCB Asset Management Ltd",
    currency: "USD",
    yield_unit: "USD",
    website: "https://ke.kcbbankgroup.com",
    withdrawal_time: "2-3 days",
  },
  "lofty corban": {
    slug: "lofty-corban-usd-mmf",
    name: "Lofty-Corban USD",
    manager: "Lofty-Corban Investments Limited",
    currency: "USD",
    yield_unit: "USD",
    website: "https://loftycorban.com",
    withdrawal_time: "1-2 days",
  },
  "dry associates": {
    slug: "dry-associates-usd-mmf",
    name: "Dry Associates USD",
    manager: "Dry Associates Investment Bank",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.dryassociates.com",
    withdrawal_time: "2-3 days",
  },
  sanlam: {
    slug: "sanlam-usd-mmf",
    name: "SanlamAllianz USD",
    manager: "Sanlam Allianz Investments Limited",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.sanlam.co.ke",
    withdrawal_time: "2-3 days",
  },
  stanbic: {
    slug: "stanbic-usd-mmf",
    name: "Stanbic USD",
    manager: "Stanbic Investment Management Services",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.stanbicbank.co.ke",
    withdrawal_time: "2-3 days",
  },
  cic: {
    slug: "cic-dollar-usd-mmf",
    name: "CIC Dollar",
    manager: "CIC Asset Management Ltd",
    currency: "USD",
    yield_unit: "USD",
    website: "https://cic.co.ke",
    withdrawal_time: "2-3 days",
  },
  cpf: {
    slug: "cpf-usd-mmf",
    name: "CPF USD",
    manager: "CPF Financial Services",
    currency: "USD",
    yield_unit: "USD",
    website: "https://www.cpf.or.ke",
    withdrawal_time: "2-3 days",
  },
  ncba: {
    slug: "ncba-usd-mmf",
    name: "NCBA USD",
    manager: "NCBA Investment Bank",
    currency: "USD",
    yield_unit: "USD",
    website: "https://investment-bank.ncbagroup.com",
    withdrawal_time: "1-2 days",
  },
};

/**
 * Parses compact minimum investment strings like "1K KES 1K", "100K", "1M", "2.5K USD 2.5K", "100".
 */
export function parseSerrariMinimum(rawCell: string, currency: "KES" | "USD"): number {
  const m = /(\d+(?:\.\d+)?)\s*([KMB]\b)?/i.exec(rawCell || "");
  if (!m) return currency === "USD" ? 13000 : 1000;
  const val = parseFloat(m[1]);
  const suffix = (m[2] || "").toUpperCase();
  const mult = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  const rawAmount = Math.round(val * mult);
  // In Kenya Fund Finder, USD MMF minimum_investment is stored in KES equivalent (~130 KES/USD)
  return currency === "USD" ? rawAmount * 130 : rawAmount;
}

/**
 * Normalizes an ISO YYYY-MM-DD date string so that Saturday (6) or Sunday (0)
 * rolls back to the prior Friday (Mon–Fri business day schedule).
 */
export function normalizeToWeekdayIsoDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || "").trim());
  if (!m) return isoDate;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (isNaN(d.getTime())) return isoDate;
  const day = d.getUTCDay();
  if (day === 6) d.setUTCDate(d.getUTCDate() - 1);
  else if (day === 0) d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
}

/**
 * Extracts ISO date (YYYY-MM-DD) from Serrari page text such as "Updated 2 November 2026" or "Data as of 2 Nov 2026",
 * always snapped to a Monday–Friday business date.
 */
export function parseSerrariAsOfDate(markdown: string, fallbackIsoDate?: string): string {
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const m = /(?:Updated|Data as of|as of)\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i.exec(markdown);
  if (m) {
    const day = String(parseInt(m[1], 10)).padStart(2, "0");
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (mon) {
      return normalizeToWeekdayIsoDate(`${m[3]}-${mon}-${day}`);
    }
  }
  return normalizeToWeekdayIsoDate(fallbackIsoDate || new Date().toISOString().slice(0, 10));
}

/**
 * Parses markdown table content from Serrari Group (/ke/mmf or /ke/mmf-usd) into structured SerrariMmfRow items.
 */
export function parseSerrariMmfMarkdown(
  markdown: string,
  currency: "KES" | "USD",
  fallbackDate?: string,
): SerrariMmfRow[] {
  const asOfDate = parseSerrariAsOfDate(markdown, fallbackDate);
  const lookupMap = currency === "KES" ? SERRARI_KES_MMF_MAP : SERRARI_USD_MMF_MAP;
  const sourceUrl = currency === "KES" ? "https://serrarigroup.com/ke/mmf" : "https://serrarigroup.com/ke/mmf-usd";
  const lines = markdown.replace(/\r/g, "").split("\n");
  const rows: SerrariMmfRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .slice(1, -1);

    if (cols.length < 8) continue;
    const rankNum = parseInt(cols[0], 10);
    if (!Number.isFinite(rankNum) || rankNum <= 0) continue;

    // Extract provider name from markdown link e.g. "[Faulu](https://...)" or plain "APA" / "Safaricom"
    const companyCell = cols[1];
    const linkMatch = /\[([^\]]+)\]/.exec(companyCell);
    const providerName = (linkMatch ? linkMatch[1] : companyCell).trim();
    const providerKey = providerName.toLowerCase().replace(/\s+/g, " ");

    const earMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[2]);
    if (!earMatch) continue;
    const annual_yield = parseFloat(earMatch[1]);
    if (!Number.isFinite(annual_yield) || annual_yield <= 0 || annual_yield > 50) continue;

    const minCell = cols[4];
    const minimum_investment = parseSerrariMinimum(minCell, currency);

    const fundCell = cols[5];
    const fundName = fundCell.replace(/\[CMA\]\([^)]+\)/gi, "").trim();

    const feeMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[6]);
    const management_fee = feeMatch ? parseFloat(feeMatch[1]) : 2.0;

    const netMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[7]);
    const net_yield = netMatch ? parseFloat(netMatch[1]) : Math.round(annual_yield * 0.85 * 100) / 100;

    const aumCell = cols[8] || "";
    const aumParts = aumCell.split(/\s+/);
    const aumText = aumParts.length >= 2 ? aumParts.slice(-2).join(" ") : aumCell;

    const canonical = lookupMap[providerKey];
    if (!canonical) continue;

    rows.push({
      rank: rankNum,
      providerKey,
      providerName: canonical.name,
      fundName,
      slug: canonical.slug,
      manager: canonical.manager,
      currency,
      yield_unit: canonical.yield_unit,
      annual_yield,
      daily_yield: deriveDailyYieldFromEar(annual_yield),
      net_yield,
      management_fee,
      minimum_investment,
      aumText,
      cma_licensed: true,
      asOfDate,
      sourceUrl,
    });
  }

  return rows.sort((a, b) => b.annual_yield - a.annual_yield);
}

/**
 * Formats parsed Serrari rows into the 3-column SimpleUnitTrustPaste format:
 *   fund_slug\tdaily_yield\tannual_yield
 */
export function formatSerrariForSimplePaste(rows: SerrariMmfRow[]): string {
  const header = `# Serrari Group MMF Sync (${rows[0]?.asOfDate ?? new Date().toISOString().slice(0, 10)})\n# fund_slug\tdaily\tannual`;
  const body = rows.map((r) => `${r.slug}\t${r.daily_yield.toFixed(2)}\t${r.annual_yield.toFixed(2)}`).join("\n");
  return `${header}\n${body}`;
}

/**
 * Snapshot of the 40 MMFs (27 KES + 13 USD) extracted from https://serrarigroup.com/ke/mmf
 * and https://serrarigroup.com/ke/mmf-usd as of 2026-11-02.
 */
export const SERRARI_MMF_SNAPSHOT_2026_11_02: Array<{
  slug: string;
  name: string;
  manager: string;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD";
  daily_yield: number;
  annual_yield: number;
  net_yield: number;
  management_fee: number;
  minimum_investment: number;
  aum: string;
  website: string;
  withdrawal_time: string;
}> = [
  // ── 27 KES Money Market Funds (sorted by Effective Annual Rate desc) ──
  { slug: "cytonn-sh-mmf", name: "Cytonn", manager: "Cytonn Asset Managers Limited", currency: "KES", yield_unit: "%", daily_yield: 10.54, annual_yield: 11.11, net_yield: 9.44, management_fee: 2.0, minimum_investment: 1000, aum: "KES 2.1B", website: "https://www.cytonn.com/investments/money-market-fund", withdrawal_time: "Instant (M-Pesa)" },
  { slug: "faulu-sh-mmf", name: "Faulu", manager: "Old Mutual Investment Group", currency: "KES", yield_unit: "%", daily_yield: 10.28, annual_yield: 10.82, net_yield: 9.20, management_fee: 2.0, minimum_investment: 1000, aum: "KES 299M", website: "https://www.faulukenya.com", withdrawal_time: "1-2 days" },
  { slug: "lofty-corban-sh-mmf", name: "Lofty-Corban", manager: "Lofty-Corban Investments Limited", currency: "KES", yield_unit: "%", daily_yield: 10.10, annual_yield: 10.62, net_yield: 9.03, management_fee: 2.0, minimum_investment: 1000, aum: "KES 4.4B", website: "https://loftycorban.com", withdrawal_time: "1 day" },
  { slug: "nabo-sh-mmf", name: "Nabo", manager: "Nabo Capital Limited", currency: "KES", yield_unit: "%", daily_yield: 10.02, annual_yield: 10.53, net_yield: 8.95, management_fee: 2.25, minimum_investment: 100000, aum: "KES 7.1B", website: "https://www.nabocapital.com", withdrawal_time: "1-2 days" },
  { slug: "madison-sh-mmf", name: "Madison", manager: "Madison Investment Managers Limited", currency: "KES", yield_unit: "%", daily_yield: 9.94, annual_yield: 10.45, net_yield: 8.88, management_fee: 2.0, minimum_investment: 5000, aum: "KES 6.0B", website: "https://www.madison.co.ke", withdrawal_time: "1-2 days" },
  { slug: "orient-kasha-sh-mmf", name: "Orient Kasha", manager: "Orient Asset Managers Limited", currency: "KES", yield_unit: "%", daily_yield: 9.93, annual_yield: 10.43, net_yield: 8.87, management_fee: 2.0, minimum_investment: 1000, aum: "KES 434M", website: "https://orientasset.co.ke", withdrawal_time: "1-2 days" },
  { slug: "old-mutual-sh-mmf", name: "Old Mutual", manager: "Old Mutual Investment Group", currency: "KES", yield_unit: "%", daily_yield: 9.82, annual_yield: 10.31, net_yield: 8.76, management_fee: 2.0, minimum_investment: 1000, aum: "KES 26.7B", website: "https://www.oldmutual.co.ke", withdrawal_time: "1-2 days" },
  { slug: "jubilee-sh-mmf", name: "Jubilee", manager: "Jubilee Asset Management", currency: "KES", yield_unit: "%", daily_yield: 9.78, annual_yield: 10.27, net_yield: 8.73, management_fee: 2.0, minimum_investment: 5000, aum: "KES 12.5B", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "1-2 days" },
  { slug: "kuza-sh-mmf", name: "Kuza", manager: "Kuza Asset Management Limited", currency: "KES", yield_unit: "%", daily_yield: 9.76, annual_yield: 10.25, net_yield: 8.71, management_fee: 2.0, minimum_investment: 1000, aum: "KES 2.4B", website: "https://www.kuza.africa", withdrawal_time: "1 day" },
  { slug: "etica-sh-mmf", name: "Etica", manager: "Etica Capital Ltd", currency: "KES", yield_unit: "%", daily_yield: 9.66, annual_yield: 10.14, net_yield: 8.62, management_fee: 2.0, minimum_investment: 100, aum: "KES 12.3B", website: "https://eticacapital.com", withdrawal_time: "Instant (M-Pesa)" },
  { slug: "arvocap-sh-mmf", name: "Arvocap", manager: "Arvocap Asset Managers Limited", currency: "KES", yield_unit: "%", daily_yield: 9.65, annual_yield: 10.13, net_yield: 8.61, management_fee: 2.0, minimum_investment: 3000, aum: "KES 550M", website: "https://www.arvocap.com", withdrawal_time: "1-2 days" },
  { slug: "genafrica-sh-mmf", name: "GenAfrica", manager: "GenAfrica Asset Managers Limited", currency: "KES", yield_unit: "%", daily_yield: 9.45, annual_yield: 9.91, net_yield: 8.42, management_fee: 2.0, minimum_investment: 500000, aum: "KES 4.7B", website: "https://genafrica.com", withdrawal_time: "1-3 days" },
  { slug: "britam-sh-mmf", name: "Britam", manager: "Britam Asset Managers", currency: "KES", yield_unit: "%", daily_yield: 9.24, annual_yield: 9.68, net_yield: 8.23, management_fee: 2.0, minimum_investment: 1000, aum: "KES 15.5B", website: "https://ke.britam.com", withdrawal_time: "1-2 days" },
  { slug: "sanlamallianz-sh-mmf", name: "SanlamAllianz", manager: "Sanlam Allianz Investments Limited", currency: "KES", yield_unit: "%", daily_yield: 9.13, annual_yield: 9.56, net_yield: 8.13, management_fee: 2.0, minimum_investment: 3000, aum: "KES 123.3B", website: "https://www.sanlam.co.ke", withdrawal_time: "1-2 days" },
  { slug: "kcb-sh-mmf", name: "KCB", manager: "KCB Asset Management Ltd", currency: "KES", yield_unit: "%", daily_yield: 8.90, annual_yield: 9.31, net_yield: 7.91, management_fee: 2.0, minimum_investment: 1000, aum: "KES 19.4B", website: "https://ke.kcbbankgroup.com", withdrawal_time: "1-2 days" },
  { slug: "dry-associates-sh-mmf", name: "Dry Associates", manager: "Dry Associates Investment Bank", currency: "KES", yield_unit: "%", daily_yield: 8.79, annual_yield: 9.19, net_yield: 7.81, management_fee: 2.26, minimum_investment: 1000000, aum: "KES 4.2B", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  { slug: "genghis-sh-mmf", name: "Genghis", manager: "Genghis Capital Limited", currency: "KES", yield_unit: "%", daily_yield: 8.61, annual_yield: 8.99, net_yield: 7.64, management_fee: 2.0, minimum_investment: 500, aum: "KES 589M", website: "https://www.genghis-capital.com", withdrawal_time: "1-2 days" },
  { slug: "cpf-sh-mmf", name: "CPF", manager: "CPF Financial Services", currency: "KES", yield_unit: "%", daily_yield: 8.49, annual_yield: 8.86, net_yield: 7.53, management_fee: 3.0, minimum_investment: 1000, aum: "KES 5.6B", website: "https://www.cpf.or.ke", withdrawal_time: "1-2 days" },
  { slug: "cic-sh-mmf", name: "CIC", manager: "CIC Asset Management Ltd", currency: "KES", yield_unit: "%", daily_yield: 8.08, annual_yield: 8.41, net_yield: 7.15, management_fee: 2.0, minimum_investment: 5000, aum: "KES 75.1B", website: "https://cic.co.ke", withdrawal_time: "1-2 days" },
  { slug: "african-alliance-sh-mmf", name: "African Alliance Enhanced", manager: "African Alliance Kenya Asset Management", currency: "KES", yield_unit: "%", daily_yield: 8.01, annual_yield: 8.34, net_yield: 7.09, management_fee: 2.0, minimum_investment: 100000, aum: "KES 364M", website: "https://www.africanallianceassetmanagement.com", withdrawal_time: "2-3 days" },
  { slug: "ncba-sh-mmf", name: "NCBA", manager: "NCBA Investment Bank", currency: "KES", yield_unit: "%", daily_yield: 7.96, annual_yield: 8.28, net_yield: 7.04, management_fee: 2.0, minimum_investment: 5000, aum: "KES 641M", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1 day" },
  { slug: "apollo-sh-mmf", name: "Apollo", manager: "Apollo Asset Management Company Ltd", currency: "KES", yield_unit: "%", daily_yield: 7.85, annual_yield: 8.16, net_yield: 6.94, management_fee: 2.0, minimum_investment: 1000, aum: "KES 4.1B", website: "https://www.apainsurance.org", withdrawal_time: "1-2 days" },
  { slug: "coop-sh-mmf", name: "Co-op", manager: "Co-op Trust Investment Services Limited", currency: "KES", yield_unit: "%", daily_yield: 7.73, annual_yield: 8.04, net_yield: 6.83, management_fee: 0.9, minimum_investment: 500, aum: "KES 21.6B", website: "https://www.co-opbank.co.ke", withdrawal_time: "1-2 days" },
  { slug: "icea-sh-mmf", name: "ICEA Lion", manager: "ICEA LION Asset Management Ltd", currency: "KES", yield_unit: "%", daily_yield: 7.58, annual_yield: 7.87, net_yield: 6.69, management_fee: 2.0, minimum_investment: 500, aum: "KES 20.4B", website: "https://icealion.co.ke", withdrawal_time: "1-2 days" },
  { slug: "ziidi-money-market-fund", name: "Ziidi", manager: "Standard Investment Bank, ALA Capital Limited & Sanlam Investments East Africa Limited", currency: "KES", yield_unit: "%", daily_yield: 6.80, annual_yield: 7.03, net_yield: 5.98, management_fee: 2.0, minimum_investment: 100, aum: "KES 2.3B", website: "https://www.safaricom.co.ke/personal/m-pesa/wealth/ziidi", withdrawal_time: "Instant (M-Pesa)" },
  { slug: "stanbic-sh-mmf", name: "Stanbic", manager: "Stanbic Investment Management Services", currency: "KES", yield_unit: "%", daily_yield: 5.43, annual_yield: 5.58, net_yield: 4.74, management_fee: 2.0, minimum_investment: 1000, aum: "KES 2.1B", website: "https://www.stanbicbank.co.ke", withdrawal_time: "1-2 days" },
  { slug: "equity-sh-mmf", name: "Equity", manager: "Equity Investment Bank", currency: "KES", yield_unit: "%", daily_yield: 4.37, annual_yield: 4.47, net_yield: 3.80, management_fee: 2.0, minimum_investment: 1000, aum: "KES 88.7M", website: "https://equitygroupholdings.com/ke/save-invest", withdrawal_time: "1 day" },

  // ── 13 USD Money Market Funds (sorted by Effective Annual Rate desc) ──
  { slug: "nabo-usd-mmf", name: "Nabo USD", manager: "Nabo Capital Limited", currency: "USD", yield_unit: "USD", daily_yield: 5.43, annual_yield: 5.58, net_yield: 4.74, management_fee: 2.5, minimum_investment: 130000, aum: "USD 5.10M", website: "https://www.nabocapital.com", withdrawal_time: "2-3 days" },
  { slug: "jubilee-usd-mmf", name: "Jubilee USD", manager: "Jubilee Asset Management", currency: "USD", yield_unit: "USD", daily_yield: 5.42, annual_yield: 5.57, net_yield: 4.73, management_fee: 1.0, minimum_investment: 130000, aum: "USD 36.00M", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "2-3 days" },
  { slug: "cytonn-usd-mmf", name: "Cytonn USD", manager: "Cytonn Asset Managers Limited", currency: "USD", yield_unit: "USD", daily_yield: 5.29, annual_yield: 5.43, net_yield: 4.62, management_fee: 1.0, minimum_investment: 130000, aum: "USD 350K", website: "https://www.cytonn.com", withdrawal_time: "1-2 days" },
  { slug: "old-mutual-usd-mmf", name: "Old Mutual USD", manager: "Old Mutual Investment Group", currency: "USD", yield_unit: "USD", daily_yield: 5.10, annual_yield: 5.23, net_yield: 4.45, management_fee: 1.0, minimum_investment: 13000, aum: "USD 17.70M", website: "https://www.oldmutual.co.ke", withdrawal_time: "2-3 days" },
  { slug: "kuza-usd-mmf", name: "Kuza USD", manager: "Kuza Asset Management Limited", currency: "USD", yield_unit: "USD", daily_yield: 5.09, annual_yield: 5.22, net_yield: 4.44, management_fee: 2.0, minimum_investment: 13000, aum: "USD 2.20M", website: "https://www.kuza.africa", withdrawal_time: "1-2 days" },
  { slug: "kcb-usd-mmf", name: "KCB USD", manager: "KCB Asset Management Ltd", currency: "USD", yield_unit: "USD", daily_yield: 4.99, annual_yield: 5.12, net_yield: 4.35, management_fee: 0.5, minimum_investment: 13000, aum: "USD 10.10M", website: "https://ke.kcbbankgroup.com", withdrawal_time: "2-3 days" },
  { slug: "lofty-corban-usd-mmf", name: "Lofty-Corban USD", manager: "Lofty-Corban Investments Limited", currency: "USD", yield_unit: "USD", daily_yield: 4.97, annual_yield: 5.10, net_yield: 4.34, management_fee: 0.2, minimum_investment: 13000, aum: "USD 1.50M", website: "https://loftycorban.com", withdrawal_time: "1-2 days" },
  { slug: "dry-associates-usd-mmf", name: "Dry Associates USD", manager: "Dry Associates Investment Bank", currency: "USD", yield_unit: "USD", daily_yield: 4.96, annual_yield: 5.08, net_yield: 4.32, management_fee: 1.5, minimum_investment: 1300000, aum: "USD 27.40M", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  { slug: "sanlam-usd-mmf", name: "SanlamAllianz USD", manager: "Sanlam Allianz Investments Limited", currency: "USD", yield_unit: "USD", daily_yield: 4.91, annual_yield: 5.03, net_yield: 4.28, management_fee: 2.0, minimum_investment: 325000, aum: "—", website: "https://www.sanlam.co.ke", withdrawal_time: "2-3 days" },
  { slug: "stanbic-usd-mmf", name: "Stanbic USD", manager: "Stanbic Investment Management Services", currency: "USD", yield_unit: "USD", daily_yield: 4.85, annual_yield: 4.97, net_yield: 4.22, management_fee: 1.0, minimum_investment: 13000, aum: "—", website: "https://www.stanbicbank.co.ke", withdrawal_time: "2-3 days" },
  { slug: "cic-dollar-usd-mmf", name: "CIC Dollar", manager: "CIC Asset Management Ltd", currency: "USD", yield_unit: "USD", daily_yield: 4.02, annual_yield: 4.10, net_yield: 3.49, management_fee: 1.5, minimum_investment: 130000, aum: "USD 29.40M", website: "https://cic.co.ke", withdrawal_time: "2-3 days" },
  { slug: "cpf-usd-mmf", name: "CPF USD", manager: "CPF Financial Services", currency: "USD", yield_unit: "USD", daily_yield: 3.74, annual_yield: 3.81, net_yield: 3.24, management_fee: 5.0, minimum_investment: 13000, aum: "USD 250K", website: "https://www.cpf.or.ke", withdrawal_time: "2-3 days" },
  { slug: "ncba-usd-mmf", name: "NCBA USD", manager: "NCBA Investment Bank", currency: "USD", yield_unit: "USD", daily_yield: 3.41, annual_yield: 3.47, net_yield: 2.95, management_fee: 1.0, minimum_investment: 13000, aum: "USD 1.00M", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1-2 days" },
];

/**
 * Fetches live Serrari MMF tables (KES + USD) via Jina Reader (CORS-enabled & Cloudflare-friendly).
 */
export async function fetchLiveSerrariMmfRows(): Promise<{
  kesRows: SerrariMmfRow[];
  usdRows: SerrariMmfRow[];
  allRows: SerrariMmfRow[];
  asOfDate: string;
}> {
  const [kesRes, usdRes] = await Promise.all([
    fetch("https://r.jina.ai/https://serrarigroup.com/ke/mmf", {
      headers: { Accept: "text/plain", "X-No-Cache": "true", "X-Cache-Tolerance": "0", "Cache-Control": "no-cache" },
    }),
    fetch("https://r.jina.ai/https://serrarigroup.com/ke/mmf-usd", {
      headers: { Accept: "text/plain", "X-No-Cache": "true", "X-Cache-Tolerance": "0", "Cache-Control": "no-cache" },
    }),
  ]);

  if (!kesRes.ok) {
    throw new Error(`Serrari KES MMF fetch failed with HTTP ${kesRes.status}`);
  }

  const kesMd = await kesRes.text();
  const kesRows = parseSerrariMmfMarkdown(kesMd, "KES");

  let usdRows: SerrariMmfRow[] = [];
  if (usdRes.ok) {
    const usdMd = await usdRes.text();
    usdRows = parseSerrariMmfMarkdown(usdMd, "USD", kesRows[0]?.asOfDate);
  }

  const asOfDate = kesRows[0]?.asOfDate || new Date().toISOString().slice(0, 10);
  return {
    kesRows,
    usdRows,
    allRows: [...kesRows, ...usdRows],
    asOfDate,
  };
}

export interface ExistingMmfComparable {
  annual_yield: number;
  daily_yield: number;
  management_fee?: number | null;
  minimum_investment?: number | null;
  yield_unit?: string | null;
}

/**
 * Returns true ONLY if the incoming Serrari MMF data actually differs from
 * the currently stored fund record (yields, fee, minimum investment, or unit).
 * Prevents bumping `updated_at` / `fact_sheet_date` when no data changed.
 */
export function hasSerrariMmfChanged(
  existing: ExistingMmfComparable,
  incoming: {
    annual_yield: number;
    daily_yield: number;
    management_fee?: number;
    minimum_investment?: number;
    yield_unit?: string;
  },
): boolean {
  const numDiff = (a: number | null | undefined, b: number | undefined) =>
    b !== undefined && Math.abs(Number(a ?? 0) - Number(b)) > 0.0001;

  return (
    numDiff(existing.annual_yield, incoming.annual_yield) ||
    numDiff(existing.daily_yield, incoming.daily_yield) ||
    (existing.management_fee != null && numDiff(existing.management_fee, incoming.management_fee)) ||
    (existing.minimum_investment != null && numDiff(existing.minimum_investment, incoming.minimum_investment)) ||
    (existing.yield_unit != null && incoming.yield_unit != null && existing.yield_unit !== incoming.yield_unit)
  );
}

/**
 * Applies the Serrari MMF snapshot to an existing FundFromDB array (used to update FALLBACK_KENYAN_FUNDS).
 * Only updates `fact_sheet_date` and `updated_at` on funds whose data actually changed.
 */
export function applySerrariSnapshotToFunds(
  existingFunds: FundFromDB[],
  asOfDate = "2026-11-02",
): FundFromDB[] {
  const bySlug = new Map<string, FundFromDB>();
  for (const f of existingFunds) {
    bySlug.set(f.slug.toLowerCase(), f);
  }

  const result = existingFunds.map((f) => {
    const match = SERRARI_MMF_SNAPSHOT_2026_11_02.find(
      (s) => s.slug.toLowerCase() === f.slug.toLowerCase(),
    );
    if (!match) return f;
    if (!hasSerrariMmfChanged(f, match)) {
      return f;
    }
    return {
      ...f,
      name: match.name,
      manager: match.manager,
      fund_type: "money_market" as const,
      yield_unit: match.yield_unit,
      daily_yield: match.daily_yield,
      annual_yield: match.annual_yield,
      minimum_investment: match.minimum_investment,
      management_fee: match.management_fee,
      fact_sheet_date: asOfDate,
      updated_at: `${asOfDate}T08:00:00.000Z`,
    };
  });

  // Add any new Serrari MMFs not yet in existingFunds
  const deterministicIds: Record<string, string> = {
    "genafrica-sh-mmf": "b41f7901-8c12-4e3a-9d01-6a234b789001",
    "lofty-corban-usd-mmf": "b41f7902-8c12-4e3a-9d01-6a234b789002",
    "sanlam-usd-mmf": "b41f7903-8c12-4e3a-9d01-6a234b789003",
    "stanbic-usd-mmf": "b41f7904-8c12-4e3a-9d01-6a234b789004",
    "ncba-usd-mmf": "b41f7905-8c12-4e3a-9d01-6a234b789005",
  };

  for (const s of SERRARI_MMF_SNAPSHOT_2026_11_02) {
    if (!bySlug.has(s.slug.toLowerCase())) {
      result.push({
        id: deterministicIds[s.slug] ?? `00000000-0000-4000-8000-${String(result.length).padStart(12, "0")}`,
        slug: s.slug,
        name: s.name,
        manager: s.manager,
        cma_licensed: true,
        annual_yield: s.annual_yield,
        daily_yield: s.daily_yield,
        seven_day_yield: 0,
        thirty_day_yield: 0,
        fund_type: "money_market",
        minimum_investment: s.minimum_investment,
        management_fee: s.management_fee,
        withdrawal_time: s.withdrawal_time,
        description: `The ${s.name} Money Market Fund (${s.currency}) is a CMA-regulated low-risk collective investment scheme managed by ${s.manager}, investing in short-term money market instruments including Kenyan Treasury bills, fixed deposits, and high-grade commercial paper.`,
        website: s.website,
        fact_sheet_date: asOfDate,
        yield_unit: s.yield_unit,
        is_published: true,
        logo_url: null,
        updated_at: `${asOfDate}T08:00:00.000Z`,
      });
    }
  }

  return result;
}
