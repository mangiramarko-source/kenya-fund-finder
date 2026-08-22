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

// Explicit MMF/Unit Trust Context terms
const MMF_CONTEXT_REGEX = /\b(money\s+market\s+funds?|money\s+market|\bmmfs?\b|unit\s+trusts?|annual\s+yields?|daily\s+yields?|compounding\s+yields?|effective\s+annual\s+rates?|fund\s+yields?|fund\s+managers?\s+(?:yield|rate|distribution|return)|yields?\s+on\s+(?:funds?|mmfs?|unit\s+trusts?))\b/i;

const GENERIC_EQUITY_PHRASES = /\b(private\s+equity|equity\s+valuations?|equity\s+markets?|equity\s+investors?|equity\s+capital|equity\s+financing|tier\s*1\s+equity|brand\s+equity|shareholder\s+equity|return\s+on\s+equity|sweat\s+equity|home\s+equity|equities\s+trading|listed\s+equities)\b/i;

const COUNTRY_MALI_REGEX = /\b(republic\s+of\s+mali|in\s+mali|mali\s+and\s+burkina|mali[,\s]+guinea|bamako|malian|west\s+africa)\b/i;

interface ProviderRule {
  brand: string;
  aliases: string[];
}

const PROVIDER_RULES: ProviderRule[] = [
  { brand: "Equity", aliases: ["equity money market fund", "equity money market", "equity mmf", "equity investment bank money market"] },
  { brand: "Stanbic", aliases: ["stanbic money market fund", "stanbic money market", "stanbic mmf", "stanbic fixed income fund", "stanbic unit trust"] },
  { brand: "KCB", aliases: ["kcb money market fund", "kcb money market", "kcb mmf", "kcb asset management money market"] },
  { brand: "CIC", aliases: ["cic money market fund", "cic money market", "cic mmf", "cic wealth money market", "cic dollar money market"] },
  { brand: "Co-op", aliases: ["co-op money market fund", "coop money market fund", "co-op money market", "coop money market", "co-op mmf", "coop mmf"] },
  { brand: "NCBA", aliases: ["ncba money market fund", "ncba money market", "ncba mmf", "ncba unit trust"] },
  { brand: "Britam", aliases: ["britam money market fund", "britam money market", "britam mmf", "britam 3 months", "britam 6 months", "britam 12 months"] },
  { brand: "Jubilee", aliases: ["jubilee money market fund", "jubilee money market", "jubilee mmf", "jubilee usd money market"] },
  { brand: "Madison", aliases: ["madison money market fund", "madison money market", "madison mmf", "madison wealth"] },
  { brand: "Mali", aliases: ["mali money market fund", "mali money market", "mali mmf", "genghis mali money market", "genghis mali mmf"] },
  { brand: "Old Mutual", aliases: ["old mutual money market fund", "old mutual money market", "old mutual mmf", "faulu money market"] },
  { brand: "Sanlam", aliases: ["sanlam money market fund", "sanlamallianz money market fund", "sanlam money market", "sanlamallianz money market", "sanlam mmf", "sanlamallianz mmf"] },
  { brand: "Kuza", aliases: ["kuza money market fund", "kuza money market", "kuza mmf", "kuza momentum", "kuza asset management"] },
  { brand: "Cytonn", aliases: ["cytonn money market fund", "cytonn money market", "cytonn mmf", "cytonn high yield"] },
  { brand: "Nabo", aliases: ["nabo money market fund", "nabo shilling money market", "nabo usd money market", "nabo money market", "nabo mmf"] },
  { brand: "Zimele", aliases: ["zimele money market fund", "zimele money market", "zimele mmf", "zimele unit trust"] },
  { brand: "Etica", aliases: ["etica money market fund", "etica money market", "etica mmf", "etica shariah"] },
  { brand: "Arvocap", aliases: ["arvocap money market fund", "arvocap money market", "arvocap mmf", "arvocap almasi"] },
  { brand: "Dry Associates", aliases: ["dry associates money market fund", "dry associates money market", "dry associates mmf", "dry associates special high yield"] },
  { brand: "Apollo", aliases: ["apollo money market fund", "apollo money market", "apollo mmf"] },
  { brand: "CPF", aliases: ["cpf money market fund", "cpf money market", "cpf mmf"] },
  { brand: "Lofty-Corban", aliases: ["lofty corban money market", "lofty-corban money market", "lofty corban mmf", "lofty-corban mmf", "lofty corban private debt"] },
  { brand: "Orient", aliases: ["orient kasha money market", "orient kasha mmf", "orient kasha", "orient hifadhi"] },
  { brand: "Genghis", aliases: ["genghis money market fund", "genghis money market", "genghis mmf"] },
  { brand: "GulfCap", aliases: ["gulfcap money market fund", "gulfcap money market", "gulfcap mmf", "gulfcap shariah"] },
  { brand: "ICEA Lion", aliases: ["icea lion money market fund", "icea lion money market", "icea lion mmf", "icea ksh", "icea usd"] },
  { brand: "African Alliance", aliases: ["african alliance money market fund", "african alliance money market", "african alliance mmf", "african alliance enhanced"] },
];

export const findRelatedMmf = (title: string, content: string, funds: FundFromDB[] = []): FundFromDB | null => {
  const rawText = `${title} ${content}`;
  const normText = normalizeForMarketMatch(rawText);
  if (normText.length < 10) return null;

  // Filter candidate funds: Prefer money_market funds
  const mmfFunds = funds.filter(
    (f) => f.fund_type === "money_market" || f.slug?.includes("-mmf")
  );
  const searchPool = mmfFunds.length > 0 ? mmfFunds : funds;

  // 1. Direct Alias Match (Explicit product names, e.g. "equity money market", "kuza mmf", "cytonn money market fund")
  for (const rule of PROVIDER_RULES) {
    const brandLower = rule.brand.toLowerCase();

    for (const alias of rule.aliases) {
      const normAlias = normalizeForMarketMatch(alias);
      if (` ${normText} `.includes(` ${normAlias} `)) {
        // Guard against generic phrase false matches
        if (brandLower === "equity" && GENERIC_EQUITY_PHRASES.test(rawText) && !/\bequity\s+(?:money\s+market|mmf)\b/i.test(rawText)) {
          continue;
        }
        if (brandLower === "mali" && COUNTRY_MALI_REGEX.test(rawText) && !/\bmali\s+(?:money\s+market|mmf)\b/i.test(rawText)) {
          continue;
        }

        const matched = searchPool.find((f) => {
          const fn = normalizeForMarketMatch(f.name);
          const fm = normalizeForMarketMatch(f.manager || "");
          const fs = f.slug.toLowerCase();
          return fn.includes(brandLower) || fm.includes(brandLower) || fs.includes(brandLower);
        });
        if (matched) return matched;
      }
    }
  }

  // 2. Strict Provider + Explicit MMF Context Co-occurrence
  // Require that the article explicitly discusses money market funds / yields AND names the provider in close proximity
  const hasMmfContext = MMF_CONTEXT_REGEX.test(rawText);
  if (hasMmfContext) {
    for (const rule of PROVIDER_RULES) {
      const brandLower = rule.brand.toLowerCase();
      const escapedBrand = brandLower.replace("-", "[-\\s]?");

      // Guard against generic phrases
      if (brandLower === "equity" && GENERIC_EQUITY_PHRASES.test(rawText) && !/\bequity\s+(?:money\s+market|mmf|unit\s+trust|fund|yield)\b/i.test(rawText)) {
        continue;
      }
      if (brandLower === "mali" && COUNTRY_MALI_REGEX.test(rawText) && !/\bmali\s+(?:money\s+market|mmf|unit\s+trust)\b/i.test(rawText)) {
        continue;
      }

      // Check proximity (within 80 characters between brand and money market/mmf/yield/unit trust)
      const proximityPattern = new RegExp(
        `\\b${escapedBrand}\\b.{0,80}\\b(money\\s+market|mmf|unit\\s+trust|fund\\s+yield|annual\\s+yield|daily\\s+yield|fund\\s+manager)\\b|\\b(money\\s+market|mmf|unit\\s+trust|fund\\s+yield|annual\\s+yield|daily\\s+yield|fund\\s+manager)\\b.{0,80}\\b${escapedBrand}\\b`,
        "i"
      );

      if (proximityPattern.test(rawText)) {
        const matched = searchPool.find((f) => {
          const fn = normalizeForMarketMatch(f.name);
          const fm = normalizeForMarketMatch(f.manager || "");
          const fs = f.slug.toLowerCase();
          return fn.includes(brandLower) || fm.includes(brandLower) || fs.includes(brandLower);
        });
        if (matched) return matched;
      }
    }
  }

  return null;
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
