import type { ExchangeRate } from "@/components/home/MarketTicker";
import type { FundFromDB } from "@/lib/api";

interface CommodityLike {
  id: string;
  name?: string;
  symbol?: string;
  price?: number;
  previous_price?: number | null;
  day_change_percent?: number | null;
  unit?: string;
}

export const normalizeForMarketMatch = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const containsMarketPhrase = (haystack: string, phrase: string) => {
  const normalizedPhrase = normalizeForMarketMatch(phrase);
  if (normalizedPhrase.length < 3) return false;
  return ` ${haystack} `.includes(` ${normalizedPhrase} `);
};

export const computeMarketPercentChange = (current: number, previous?: number | null, explicit?: number | null) => {
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;
  if (typeof previous === "number" && Number.isFinite(previous) && previous !== 0) {
    return ((current - previous) / previous) * 100;
  }
  return 0;
};

export const findRelatedMmf = (title: string, content: string, funds: FundFromDB[]) => {
  const haystack = normalizeForMarketMatch(`${title} ${content}`);
  return funds.find((fund) =>
    containsMarketPhrase(haystack, fund.name)
    || containsMarketPhrase(haystack, fund.manager)
    || containsMarketPhrase(haystack, fund.slug.replace(/-/g, " "))
  ) || null;
};

export const findRelatedFx = (title: string, content: string, fxRates: ExchangeRate[]) => {
  const combined = ` ${title} ${content} `;
  const upper = combined.toUpperCase();
  const haystack = normalizeForMarketMatch(combined);
  return fxRates.find((rate) => {
    const code = rate.currency_code?.toUpperCase();
    if (!code) return false;
    return upper.includes(` ${code}/KES `)
      || upper.includes(` KES/${code} `)
      || upper.includes(` ${code} `)
      || containsMarketPhrase(haystack, rate.currency_name || "");
  }) || null;
};

export const findRelatedCommodity = (title: string, content: string, commodities: CommodityLike[]) => {
  const combined = ` ${title} ${content} `;
  const upper = combined.toUpperCase();
  const haystack = normalizeForMarketMatch(combined);
  return commodities.find((commodity) =>
    containsMarketPhrase(haystack, commodity.name || "")
    || (commodity.symbol && upper.includes(` ${String(commodity.symbol).toUpperCase()} `))
  ) || null;
};

export function buildRelatedMarketLinks(
  title: string,
  content: string,
  funds: FundFromDB[] = [],
  fxRates: ExchangeRate[] = [],
  commodities: CommodityLike[] = [],
) {
  const matchedMmf = findRelatedMmf(title, content, funds);
  const matchedFx = findRelatedFx(title, content, fxRates);
  const matchedCommodity = findRelatedCommodity(title, content, commodities);

  return {
    relatedMmf: matchedMmf ? {
      id: matchedMmf.id,
      name: matchedMmf.name,
      yield: Number(matchedMmf.annual_yield) || 0,
      changePercent: 0,
      slug: matchedMmf.slug,
    } : null,
    relatedFx: matchedFx ? {
      id: matchedFx.id,
      pair: `${matchedFx.currency_code}/KES`,
      rate: Number(matchedFx.rate) || 0,
      changePercent: computeMarketPercentChange(Number(matchedFx.rate) || 0, matchedFx.previous_rate, matchedFx.day_change_percent),
    } : null,
    relatedCommodity: matchedCommodity ? {
      id: matchedCommodity.id,
      name: matchedCommodity.name || "",
      price: Number(matchedCommodity.price) || 0,
      unit: matchedCommodity.unit || "",
      changePercent: computeMarketPercentChange(Number(matchedCommodity.price) || 0, matchedCommodity.previous_price, matchedCommodity.day_change_percent),
    } : null,
  };
}
