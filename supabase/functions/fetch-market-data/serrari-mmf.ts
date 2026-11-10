export interface SerrariEdgeMmfRow {
  slug: string;
  name: string;
  manager: string;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD";
  annual_yield: number;
  daily_yield: number;
  net_yield: number;
  management_fee: number;
  minimum_investment: number;
  website: string;
  withdrawal_time: string;
  asOfDate: string;
}

interface CanonicalMeta {
  slug: string;
  name: string;
  manager: string;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD";
  website: string;
  withdrawal_time: string;
}

const KES_MAP: Record<string, CanonicalMeta> = {
  cytonn: { slug: "cytonn-sh-mmf", name: "Cytonn", manager: "Cytonn Asset Managers Limited", currency: "KES", yield_unit: "%", website: "https://www.cytonn.com/investments/money-market-fund", withdrawal_time: "Instant (M-Pesa)" },
  faulu: { slug: "faulu-sh-mmf", name: "Faulu", manager: "Old Mutual Investment Group", currency: "KES", yield_unit: "%", website: "https://www.faulukenya.com", withdrawal_time: "1-2 days" },
  "lofty corban": { slug: "lofty-corban-sh-mmf", name: "Lofty-Corban", manager: "Lofty-Corban Investments Limited", currency: "KES", yield_unit: "%", website: "https://loftycorban.com", withdrawal_time: "1 day" },
  nabo: { slug: "nabo-sh-mmf", name: "Nabo", manager: "Nabo Capital Limited", currency: "KES", yield_unit: "%", website: "https://www.nabocapital.com", withdrawal_time: "1-2 days" },
  madison: { slug: "madison-sh-mmf", name: "Madison", manager: "Madison Investment Managers Limited", currency: "KES", yield_unit: "%", website: "https://www.madison.co.ke", withdrawal_time: "1-2 days" },
  "orient kasha": { slug: "orient-kasha-sh-mmf", name: "Orient Kasha", manager: "Orient Asset Managers Limited", currency: "KES", yield_unit: "%", website: "https://orientasset.co.ke", withdrawal_time: "1-2 days" },
  "old mutual": { slug: "old-mutual-sh-mmf", name: "Old Mutual", manager: "Old Mutual Investment Group", currency: "KES", yield_unit: "%", website: "https://www.oldmutual.co.ke", withdrawal_time: "1-2 days" },
  jubilee: { slug: "jubilee-sh-mmf", name: "Jubilee", manager: "Jubilee Asset Management", currency: "KES", yield_unit: "%", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "1-2 days" },
  kuza: { slug: "kuza-sh-mmf", name: "Kuza", manager: "Kuza Asset Management Limited", currency: "KES", yield_unit: "%", website: "https://www.kuza.africa", withdrawal_time: "1 day" },
  etica: { slug: "etica-sh-mmf", name: "Etica", manager: "Etica Capital Ltd", currency: "KES", yield_unit: "%", website: "https://eticacapital.com", withdrawal_time: "Instant (M-Pesa)" },
  arvocap: { slug: "arvocap-sh-mmf", name: "Arvocap", manager: "Arvocap Asset Managers Limited", currency: "KES", yield_unit: "%", website: "https://www.arvocap.com", withdrawal_time: "1-2 days" },
  genafrica: { slug: "genafrica-sh-mmf", name: "GenAfrica", manager: "GenAfrica Asset Managers Limited", currency: "KES", yield_unit: "%", website: "https://genafrica.com", withdrawal_time: "1-3 days" },
  britam: { slug: "britam-sh-mmf", name: "Britam", manager: "Britam Asset Managers", currency: "KES", yield_unit: "%", website: "https://ke.britam.com", withdrawal_time: "1-2 days" },
  sanlam: { slug: "sanlamallianz-sh-mmf", name: "SanlamAllianz", manager: "Sanlam Allianz Investments Limited", currency: "KES", yield_unit: "%", website: "https://www.sanlam.co.ke", withdrawal_time: "1-2 days" },
  kcb: { slug: "kcb-sh-mmf", name: "KCB", manager: "KCB Asset Management Ltd", currency: "KES", yield_unit: "%", website: "https://ke.kcbbankgroup.com", withdrawal_time: "1-2 days" },
  "dry associates": { slug: "dry-associates-sh-mmf", name: "Dry Associates", manager: "Dry Associates Investment Bank", currency: "KES", yield_unit: "%", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  genghis: { slug: "genghis-sh-mmf", name: "Genghis", manager: "Genghis Capital Limited", currency: "KES", yield_unit: "%", website: "https://www.genghis-capital.com", withdrawal_time: "1-2 days" },
  cpf: { slug: "cpf-sh-mmf", name: "CPF", manager: "CPF Financial Services", currency: "KES", yield_unit: "%", website: "https://www.cpf.or.ke", withdrawal_time: "1-2 days" },
  cic: { slug: "cic-sh-mmf", name: "CIC", manager: "CIC Asset Management Ltd", currency: "KES", yield_unit: "%", website: "https://cic.co.ke", withdrawal_time: "1-2 days" },
  "african alliance": { slug: "african-alliance-sh-mmf", name: "African Alliance Enhanced", manager: "African Alliance Kenya Asset Management", currency: "KES", yield_unit: "%", website: "https://www.africanallianceassetmanagement.com", withdrawal_time: "2-3 days" },
  ncba: { slug: "ncba-sh-mmf", name: "NCBA", manager: "NCBA Investment Bank", currency: "KES", yield_unit: "%", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1 day" },
  apa: { slug: "apollo-sh-mmf", name: "Apollo", manager: "Apollo Asset Management Company Ltd", currency: "KES", yield_unit: "%", website: "https://www.apainsurance.org", withdrawal_time: "1-2 days" },
  "co-op": { slug: "coop-sh-mmf", name: "Co-op", manager: "Co-op Trust Investment Services Limited", currency: "KES", yield_unit: "%", website: "https://www.co-opbank.co.ke", withdrawal_time: "1-2 days" },
  "icea lion": { slug: "icea-sh-mmf", name: "ICEA Lion", manager: "ICEA LION Asset Management Ltd", currency: "KES", yield_unit: "%", website: "https://icealion.co.ke", withdrawal_time: "1-2 days" },
  safaricom: { slug: "ziidi-money-market-fund", name: "Ziidi", manager: "Standard Investment Bank, ALA Capital Limited & Sanlam Investments East Africa Limited", currency: "KES", yield_unit: "%", website: "https://www.safaricom.co.ke/personal/m-pesa/wealth/ziidi", withdrawal_time: "Instant (M-Pesa)" },
  stanbic: { slug: "stanbic-sh-mmf", name: "Stanbic", manager: "Stanbic Investment Management Services", currency: "KES", yield_unit: "%", website: "https://www.stanbicbank.co.ke", withdrawal_time: "1-2 days" },
  equity: { slug: "equity-sh-mmf", name: "Equity", manager: "Equity Investment Bank", currency: "KES", yield_unit: "%", website: "https://equitygroupholdings.com/ke/save-invest", withdrawal_time: "1 day" },
};

const USD_MAP: Record<string, CanonicalMeta> = {
  nabo: { slug: "nabo-usd-mmf", name: "Nabo USD", manager: "Nabo Capital Limited", currency: "USD", yield_unit: "USD", website: "https://www.nabocapital.com", withdrawal_time: "2-3 days" },
  jubilee: { slug: "jubilee-usd-mmf", name: "Jubilee USD", manager: "Jubilee Asset Management", currency: "USD", yield_unit: "USD", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "2-3 days" },
  cytonn: { slug: "cytonn-usd-mmf", name: "Cytonn USD", manager: "Cytonn Asset Managers Limited", currency: "USD", yield_unit: "USD", website: "https://www.cytonn.com", withdrawal_time: "1-2 days" },
  "old mutual": { slug: "old-mutual-usd-mmf", name: "Old Mutual USD", manager: "Old Mutual Investment Group", currency: "USD", yield_unit: "USD", website: "https://www.oldmutual.co.ke", withdrawal_time: "2-3 days" },
  kuza: { slug: "kuza-usd-mmf", name: "Kuza USD", manager: "Kuza Asset Management Limited", currency: "USD", yield_unit: "USD", website: "https://www.kuza.africa", withdrawal_time: "1-2 days" },
  kcb: { slug: "kcb-usd-mmf", name: "KCB USD", manager: "KCB Asset Management Ltd", currency: "USD", yield_unit: "USD", website: "https://ke.kcbbankgroup.com", withdrawal_time: "2-3 days" },
  "lofty corban": { slug: "lofty-corban-usd-mmf", name: "Lofty-Corban USD", manager: "Lofty-Corban Investments Limited", currency: "USD", yield_unit: "USD", website: "https://loftycorban.com", withdrawal_time: "1-2 days" },
  "dry associates": { slug: "dry-associates-usd-mmf", name: "Dry Associates USD", manager: "Dry Associates Investment Bank", currency: "USD", yield_unit: "USD", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  sanlam: { slug: "sanlam-usd-mmf", name: "SanlamAllianz USD", manager: "Sanlam Allianz Investments Limited", currency: "USD", yield_unit: "USD", website: "https://www.sanlam.co.ke", withdrawal_time: "2-3 days" },
  stanbic: { slug: "stanbic-usd-mmf", name: "Stanbic USD", manager: "Stanbic Investment Management Services", currency: "USD", yield_unit: "USD", website: "https://www.stanbicbank.co.ke", withdrawal_time: "2-3 days" },
  cic: { slug: "cic-dollar-usd-mmf", name: "CIC Dollar", manager: "CIC Asset Management Ltd", currency: "USD", yield_unit: "USD", website: "https://cic.co.ke", withdrawal_time: "2-3 days" },
  cpf: { slug: "cpf-usd-mmf", name: "CPF USD", manager: "CPF Financial Services", currency: "USD", yield_unit: "USD", website: "https://www.cpf.or.ke", withdrawal_time: "2-3 days" },
  ncba: { slug: "ncba-usd-mmf", name: "NCBA USD", manager: "NCBA Investment Bank", currency: "USD", yield_unit: "USD", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1-2 days" },
};

export function deriveDailyYieldFromEar(earPercent: number): number {
  if (!Number.isFinite(earPercent) || earPercent <= 0) return 0;
  const earDecimal = earPercent / 100;
  const nominalAnnualDecimal = 365 * (Math.pow(1 + earDecimal, 1 / 365) - 1);
  return Math.round(nominalAnnualDecimal * 100 * 100) / 100;
}

export function hasSerrariMmfChanged(
  existing: {
    annual_yield: number;
    daily_yield: number;
    management_fee?: number | null;
    minimum_investment?: number | null;
    yield_unit?: string | null;
  },
  incoming: {
    annual_yield: number;
    daily_yield: number;
    management_fee: number;
    minimum_investment: number;
    yield_unit: string;
  },
): boolean {
  const numDiff = (a: number | null | undefined, b: number) =>
    Math.abs(Number(a ?? 0) - Number(b)) > 0.0001;

  return (
    numDiff(existing.annual_yield, incoming.annual_yield) ||
    numDiff(existing.daily_yield, incoming.daily_yield) ||
    (existing.management_fee != null && numDiff(existing.management_fee, incoming.management_fee)) ||
    (existing.minimum_investment != null && numDiff(existing.minimum_investment, incoming.minimum_investment)) ||
    (existing.yield_unit != null && existing.yield_unit !== incoming.yield_unit)
  );
}

function parseSerrariMinimum(rawCell: string, currency: "KES" | "USD"): number {
  const m = /(\d+(?:\.\d+)?)\s*([KMB]\b)?/i.exec(rawCell || "");
  if (!m) return currency === "USD" ? 13000 : 1000;
  const val = parseFloat(m[1]);
  const suffix = (m[2] || "").toUpperCase();
  const mult = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  const rawAmount = Math.round(val * mult);
  return currency === "USD" ? rawAmount * 130 : rawAmount;
}

function normalizeToWeekdayIsoDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || "").trim());
  if (!m) return isoDate;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (isNaN(d.getTime())) return isoDate;
  const day = d.getUTCDay();
  if (day === 6) d.setUTCDate(d.getUTCDate() - 1);
  else if (day === 0) d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
}

function parseAsOfDate(markdown: string, fallbackIsoDate?: string): string {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const m = /(?:Updated|Data as of|as of)\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i.exec(markdown);
  if (m) {
    const day = String(parseInt(m[1], 10)).padStart(2, "0");
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (mon) return normalizeToWeekdayIsoDate(`${m[3]}-${mon}-${day}`);
  }
  return normalizeToWeekdayIsoDate(fallbackIsoDate || new Date().toISOString().slice(0, 10));
}

export function parseSerrariMarkdownTable(
  markdown: string,
  currency: "KES" | "USD",
  fallbackDate?: string,
): SerrariEdgeMmfRow[] {
  const asOfDate = parseAsOfDate(markdown, fallbackDate);
  const lookupMap = currency === "KES" ? KES_MAP : USD_MAP;
  const lines = markdown.replace(/\r/g, "").split("\n");
  const rows: SerrariEdgeMmfRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim()).slice(1, -1);
    if (cols.length < 8) continue;

    const rankNum = parseInt(cols[0], 10);
    if (!Number.isFinite(rankNum) || rankNum <= 0) continue;

    const companyCell = cols[1];
    const linkMatch = /\[([^\]]+)\]/.exec(companyCell);
    const providerKey = (linkMatch ? linkMatch[1] : companyCell).trim().toLowerCase().replace(/\s+/g, " ");

    const earMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[2]);
    if (!earMatch) continue;
    const annual_yield = parseFloat(earMatch[1]);
    if (!Number.isFinite(annual_yield) || annual_yield <= 0 || annual_yield > 50) continue;

    const minimum_investment = parseSerrariMinimum(cols[4], currency);
    const feeMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[6]);
    const management_fee = feeMatch ? parseFloat(feeMatch[1]) : 2.0;

    const netMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[7]);
    const net_yield = netMatch ? parseFloat(netMatch[1]) : Math.round(annual_yield * 0.85 * 100) / 100;

    const canonical = lookupMap[providerKey];
    if (!canonical) continue;

    rows.push({
      slug: canonical.slug,
      name: canonical.name,
      manager: canonical.manager,
      currency,
      yield_unit: canonical.yield_unit,
      annual_yield,
      daily_yield: deriveDailyYieldFromEar(annual_yield),
      net_yield,
      management_fee,
      minimum_investment,
      website: canonical.website,
      withdrawal_time: canonical.withdrawal_time,
      asOfDate,
    });
  }

  return rows;
}

export async function fetchSerrariMmfData(): Promise<{
  rows: SerrariEdgeMmfRow[];
  asOfDate: string;
  notes: string[];
}> {
  const notes: string[] = [];
  const [kesRes, usdRes] = await Promise.all([
    fetch("https://r.jina.ai/https://serrarigroup.com/ke/mmf", {
      headers: { Accept: "text/plain", "User-Agent": "Mozilla/5.0", "X-No-Cache": "true", "X-Cache-Tolerance": "0", "Cache-Control": "no-cache" },
    }),
    fetch("https://r.jina.ai/https://serrarigroup.com/ke/mmf-usd", {
      headers: { Accept: "text/plain", "User-Agent": "Mozilla/5.0", "X-No-Cache": "true", "X-Cache-Tolerance": "0", "Cache-Control": "no-cache" },
    }),
  ]);

  if (!kesRes.ok) {
    throw new Error(`Serrari KES MMF fetch returned HTTP ${kesRes.status}`);
  }

  const kesMd = await kesRes.text();
  const kesRows = parseSerrariMarkdownTable(kesMd, "KES");
  notes.push(`Serrari KES MMFs parsed: ${kesRows.length}`);

  let usdRows: SerrariEdgeMmfRow[] = [];
  if (usdRes.ok) {
    const usdMd = await usdRes.text();
    usdRows = parseSerrariMarkdownTable(usdMd, "USD", kesRows[0]?.asOfDate);
    notes.push(`Serrari USD MMFs parsed: ${usdRows.length}`);
  } else {
    notes.push(`Serrari USD MMF fetch returned HTTP ${usdRes.status}`);
  }

  const asOfDate = kesRows[0]?.asOfDate || new Date().toISOString().slice(0, 10);
  return {
    rows: [...kesRows, ...usdRows],
    asOfDate,
    notes,
  };
}
