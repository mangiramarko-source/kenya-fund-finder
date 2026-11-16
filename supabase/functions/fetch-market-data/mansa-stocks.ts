import { providerTimestamp, type StockQuote } from "./stock-quotes.ts";

export type EastAfricanExchange = "NSE" | "USE" | "DSE" | "RSE";
export type EastAfricanCurrency = "KES" | "UGX" | "TZS" | "RWF";
export type EastAfricanCountryCode = "KE" | "UG" | "TZ" | "RW";

export const EAST_AFRICAN_EXCHANGES: readonly EastAfricanExchange[] = ["NSE", "USE", "DSE", "RSE"] as const;
export const REGIONAL_MANSA_EXCHANGES: readonly EastAfricanExchange[] = ["USE", "DSE", "RSE"] as const;

export const EAST_AFRICAN_EXCHANGE_META: Record<
  EastAfricanExchange,
  {
    name: string;
    currency: EastAfricanCurrency;
    countryCode: EastAfricanCountryCode;
    baseSortOrder: number;
  }
> = {
  NSE: {
    name: "Nairobi Securities Exchange",
    currency: "KES",
    countryCode: "KE",
    baseSortOrder: 0,
  },
  USE: {
    name: "Uganda Securities Exchange",
    currency: "UGX",
    countryCode: "UG",
    baseSortOrder: 1000,
  },
  DSE: {
    name: "Dar es Salaam Stock Exchange",
    currency: "TZS",
    countryCode: "TZ",
    baseSortOrder: 2000,
  },
  RSE: {
    name: "Rwanda Stock Exchange",
    currency: "RWF",
    countryCode: "RW",
    baseSortOrder: 3000,
  },
};

export const VALID_STOCK_SYMBOL_RE = /^[A-Za-z0-9_-]{1,32}$/;
const VALID_EXCHANGE_TICKER_RE = /^[A-Za-z0-9_-]{1,28}$/;

// Fixed-income bond tickers and names mixed into Mansa's USE stocks endpoint
const BOND_TICKER_RE = /^(FXD|IFB|PLAT_FXD|BOND|TBILL)/i;
const BOND_NAME_RE = /\bFXD\b|\bIFB\b|\b\d+\/\d{4}\/\d+\b|\bTreasury\s+Bond\b|\bCorporate\s+Bond\b/i;

const MANSA_NSE_ALIASES: Record<string, string> = {
  NSE: "NSE20",
};

export type MansaStockQuote = StockQuote & {
  symbol: string;
  exchange: EastAfricanExchange;
  exchangeTicker: string;
  name: string;
  sector: string;
  currency: EastAfricanCurrency;
  countryCode: EastAfricanCountryCode;
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  dayHigh: number | null;
  dayLow: number | null;
};

export function isFixedIncomeInstrument(ticker: string, name?: string | null): boolean {
  const cleanTicker = (ticker || "").trim();
  const cleanName = (name || "").trim();
  if (BOND_TICKER_RE.test(cleanTicker)) return true;
  if (cleanName && BOND_NAME_RE.test(cleanName)) return true;
  return false;
}

export function formatCanonicalStockSymbol(exchange: EastAfricanExchange, rawTicker: string): string {
  const ticker = rawTicker.trim().toUpperCase();
  if (exchange === "NSE") {
    return MANSA_NSE_ALIASES[ticker] ?? ticker;
  }
  const prefix = `${exchange}-`;
  if (ticker.startsWith(prefix)) {
    return ticker;
  }
  return `${prefix}${ticker}`;
}

const KNOWN_TICKER_SECTORS: Record<string, string> = {
  // Banking
  BOK: "Banking",
  BKG: "Banking",
  IMR: "Banking",
  KCB: "Banking",
  EBL: "Banking",
  EQTY: "Banking",
  SBU: "Banking",
  SBIC: "Banking",
  BOBU: "Banking",
  DFCU: "Banking",
  CRDB: "Banking",
  NMB: "Banking",
  DCB: "Banking",
  MCB: "Banking",
  MBP: "Banking",
  MKCB: "Banking",
  MUCOB: "Banking",
  YETU: "Banking",
  NCBA: "Banking",
  SCBK: "Banking",
  DTK: "Banking",
  ABSA: "Banking",
  COOP: "Banking",
  HFCK: "Banking",
  IMH: "Banking",
  // Telecommunications
  MTNU: "Telecommunications",
  MTNR: "Telecommunications",
  AIRTEL_UGANDA: "Telecommunications",
  AIRTEL: "Telecommunications",
  SCOM: "Telecommunications",
  VODA: "Telecommunications",
  // Manufacturing & Allied
  EABL: "Manufacturing & Allied",
  BLR: "Manufacturing & Allied",
  CMR: "Manufacturing & Allied",
  TBL: "Manufacturing & Allied",
  TCC: "Manufacturing & Allied",
  TPCC: "Manufacturing & Allied",
  TWIGA: "Manufacturing & Allied",
  TCCL: "Manufacturing & Allied",
  SIMBA: "Manufacturing & Allied",
  BATU: "Manufacturing & Allied",
  BAT: "Manufacturing & Allied",
  UCL: "Manufacturing & Allied",
  QCIL: "Manufacturing & Allied",
  CIPLA: "Manufacturing & Allied",
  BAMB: "Manufacturing & Allied",
  UNGA: "Manufacturing & Allied",
  BOC: "Manufacturing & Allied",
  CARB: "Manufacturing & Allied",
  // Insurance
  JHL: "Insurance",
  JUB: "Insurance",
  NIC: "Insurance",
  BRIT: "Insurance",
  CIC: "Insurance",
  LBTY: "Insurance",
  SLAM: "Insurance",
  KNRE: "Insurance",
  // Energy & Petroleum
  UMME: "Energy & Petroleum",
  UMEME: "Energy & Petroleum",
  KEGN: "Energy & Petroleum",
  KPLC: "Energy & Petroleum",
  TOTL: "Energy & Petroleum",
  TOL: "Energy & Petroleum",
  SWALA: "Energy & Petroleum",
  // Commercial & Services
  KA: "Commercial & Services",
  KQ: "Commercial & Services",
  PAL: "Commercial & Services",
  SWIS: "Commercial & Services",
  NMG: "Commercial & Services",
  NVL: "Commercial & Services",
  DSE: "Commercial & Services",
  TPSE: "Commercial & Services",
  UCHM: "Commercial & Services",
  // Investment
  CENT: "Investment",
  CTUM: "Investment",
  NICO: "Investment",
  TCCIA: "Investment",
  TICL: "Investment",
  AFRIPRISE: "Investment",
};

export function inferStockSector(
  name: string | null | undefined,
  ticker: string | null | undefined,
  rawSector?: string | null,
): string {
  const cleanedRaw = typeof rawSector === "string" ? rawSector.trim() : "";
  if (
    cleanedRaw &&
    !/^(null|undefined|n\/a|none|unknown|other|-)$/i.test(cleanedRaw)
  ) {
    return cleanedRaw;
  }

  const cleanTicker = (ticker || "").trim().toUpperCase().replace(/^(NSE|USE|DSE|RSE)-/, "");
  if (KNOWN_TICKER_SECTORS[cleanTicker]) {
    return KNOWN_TICKER_SECTORS[cleanTicker];
  }

  const hay = `${cleanTicker} ${name || ""}`.toLowerCase();

  if (/\b(bank|stanbic|dfcu|crdb|nmb|equity\s+group|i&m|bk\s+group|maendeleo|mkombozi|mwalimu|muhunda|yetu)\b/.test(hay)) {
    return "Banking";
  }
  if (/\b(mtn|airtel|telecom|safaricom|vodacom|tigo)\b/.test(hay)) {
    return "Telecommunications";
  }
  if (/\b(brewer|cement|cigarette|tobacco|bralirwa|cimerwa|clays|cipla|chemical|pharma|unga|bamburi|sugar|tea|carbacid|paint|packaging)\b/.test(hay)) {
    return "Manufacturing & Allied";
  }
  if (/\b(jubilee|insurance|assurance|nic\s+holdings|sanlam|britam|liberty|reinsurance)\b/.test(hay)) {
    return "Insurance";
  }
  if (/\b(umeme|power|energy|kengen|petroleum|totalenergies|gases|oil|gas)\b/.test(hay)) {
    return "Energy & Petroleum";
  }
  if (/\b(airways|airline|precision\s+air|swissport|aviation|media|vision|exchange|serena|tourism|hotel|uchumi|supermarket|logistics|port)\b/.test(hay)) {
    return "Commercial & Services";
  }
  if (/\b(centum|nico\b|investment|holdings|capital|trust|afriprise|tccia)\b/.test(hay)) {
    return "Investment";
  }
  if (/\b(agric|kakuzi|sasini|plantation|coffee|ranch)\b/.test(hay)) {
    return "Agricultural";
  }

  return "Other";
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numeric(value: unknown, percentage = false): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return null;
  const pattern = percentage ? /^[+-]?\d+(?:\.\d+)?%?$/ : /^[+-]?\d+(?:\.\d+)?$/;
  if (!pattern.test(normalized)) return null;
  const parsed = Number(normalized.replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  return null;
}

export function parseMansaExchangeStocksResponse(
  payload: unknown,
  exchange: EastAfricanExchange,
) {
  const metaConfig = EAST_AFRICAN_EXCHANGE_META[exchange];
  const envelope = record(payload);
  const dataBlock = record(envelope?.data);

  let rawRows: unknown[] | null = null;
  if (Array.isArray(payload)) {
    rawRows = payload;
  } else if (Array.isArray(envelope?.stocks)) {
    rawRows = envelope.stocks;
  } else if (Array.isArray(dataBlock?.stocks)) {
    rawRows = dataBlock.stocks;
  } else if (Array.isArray(envelope?.data)) {
    rawRows = envelope.data;
  }

  if (!rawRows) {
    throw new Error(`Invalid Mansa stock response for ${exchange}`);
  }

  const envelopeTimestamp =
    providerTimestamp(envelope?.updated_at) ||
    providerTimestamp(envelope?.timestamp) ||
    providerTimestamp(dataBlock?.updated_at) ||
    null;

  const quotes = new Map<string, MansaStockQuote>();
  const filteredBonds: string[] = [];
  let rejected = 0;

  for (const item of rawRows) {
    const row = record(item);
    if (!row) {
      rejected++;
      continue;
    }

    const rawTicker = typeof row.ticker === "string"
      ? row.ticker.trim().toUpperCase()
      : typeof row.symbol === "string"
      ? row.symbol.trim().toUpperCase()
      : "";

    const rawName = typeof row.name === "string" && row.name.trim()
      ? row.name.trim()
      : typeof row.company_name === "string" && row.company_name.trim()
      ? row.company_name.trim()
      : rawTicker;

    if (!rawTicker || !VALID_EXCHANGE_TICKER_RE.test(rawTicker)) {
      rejected++;
      continue;
    }

    // 1. Strict fixed-income bond exclusion
    if (isFixedIncomeInstrument(rawTicker, rawName)) {
      filteredBonds.push(rawTicker);
      continue;
    }

    const symbol = formatCanonicalStockSymbol(exchange, rawTicker);
    if (!VALID_STOCK_SYMBOL_RE.test(symbol)) {
      rejected++;
      continue;
    }

    const price = numeric(row.price ?? row.last_price ?? row.close);
    if (price === null || price <= 0) {
      rejected++;
      continue;
    }

    // Regional exchanges often have 0% change or null change_pct on quiet sessions
    const rawPct = numeric(row.change_pct ?? row.change_percent ?? row.change, true);
    const pct = rawPct !== null && rawPct > -100 ? rawPct : 0;

    const current = Number(price.toFixed(2));
    const explicitPrev = numeric(row.previous_close ?? row.prev_close ?? row.previous_price);
    const previousPrice = explicitPrev !== null && explicitPrev > 0
      ? Number(explicitPrev.toFixed(2))
      : pct === 0
      ? current
      : Number((current / (1 + pct / 100)).toFixed(2));

    if (current <= 0 || !Number.isFinite(previousPrice) || previousPrice <= 0) {
      rejected++;
      continue;
    }

    const explicitChange = numeric(row.change_abs ?? row.day_change);
    const dayChange = explicitChange !== null
      ? Number(explicitChange.toFixed(2))
      : Number((current - previousPrice).toFixed(2));

    const rawVolume = numeric(row.volume);
    const volume = rawVolume !== null && rawVolume >= 0 ? Math.trunc(rawVolume) : 0;

    const marketCapRaw = numeric(row.market_cap);
    const marketCap = marketCapRaw !== null && marketCapRaw > 0 ? marketCapRaw : null;

    const valuation = record(row.valuation);
    const peRaw = numeric(row.pe_ratio ?? row.pe ?? valuation?.pe);
    const peRatio = peRaw !== null && peRaw > 0 ? Number(peRaw.toFixed(2)) : null;

    const divRaw = numeric(row.dividend_yield ?? valuation?.dividend_yield, true);
    const dividendYield = divRaw !== null && divRaw >= 0 ? Number(divRaw.toFixed(2)) : null;

    const yearHighRaw = numeric(row.year_high ?? row.high_52w ?? row.week_52_high);
    const yearHigh = yearHighRaw !== null && yearHighRaw > 0 ? Number(yearHighRaw.toFixed(2)) : null;

    const yearLowRaw = numeric(row.year_low ?? row.low_52w ?? row.week_52_low);
    const yearLow = yearLowRaw !== null && yearLowRaw > 0 ? Number(yearLowRaw.toFixed(2)) : null;

    const dayHighRaw = numeric(row.day_high ?? row.high);
    const dayLowRaw = numeric(row.day_low ?? row.low);
    const hasValidIntradayRange =
      dayHighRaw !== null &&
      dayLowRaw !== null &&
      dayLowRaw > 0 &&
      dayHighRaw >= dayLowRaw;

    const rowProviderUpdatedAt =
      providerTimestamp(row.updated_at) ||
      providerTimestamp(row.last_updated) ||
      providerTimestamp(row.timestamp) ||
      envelopeTimestamp;

    const asOfDate =
      parseIsoDateOnly(row.date) ||
      parseIsoDateOnly(row.trade_date) ||
      parseIsoDateOnly(row.as_of_date) ||
      (rowProviderUpdatedAt ? rowProviderUpdatedAt.slice(0, 10) : null);

    const rawSector = typeof row.sector === "string" ? row.sector : null;
    const sector = inferStockSector(rawName, rawTicker, rawSector);

    quotes.set(symbol, {
      symbol,
      exchange,
      exchangeTicker: rawTicker,
      name: rawName,
      sector,
      currency: metaConfig.currency,
      countryCode: metaConfig.countryCode,
      price: current,
      previousPrice,
      dayChange,
      dayChangePct: Number(pct.toFixed(2)),
      volume,
      marketCap,
      peRatio,
      dividendYield,
      yearHigh,
      yearLow,
      dayHigh: hasValidIntradayRange ? Number(dayHighRaw!.toFixed(2)) : null,
      dayLow: hasValidIntradayRange ? Number(dayLowRaw!.toFixed(2)) : null,
      source: "primary",
      asOfDate,
      providerUpdatedAt: rowProviderUpdatedAt,
      quoteSource: "mansa",
    });
  }

  return {
    quotes,
    diagnostics: {
      exchange,
      returned: rawRows.length,
      accepted: quotes.size,
      filtered_bonds_count: filteredBonds.length,
      filtered_bonds: filteredBonds,
      rejected,
      provider_updated_at: envelopeTimestamp,
    },
  };
}

export interface MansaThrottleCandidateRow {
  exchange?: string | null;
  quote_source?: string | null;
  updated_at?: string | null;
}

/**
 * Evaluates whether a Mansa exchange fetch should be skipped on a scheduled cron run.
 * Uses our database wall-clock `updated_at` (which is stamped on every HTTP 200 Mansa sync,
 * even when prices are 0.00% unchanged) rather than Mansa's upstream `provider_updated_at`.
 */
export function shouldSkipMansaExchangeRefresh(
  rows: MansaThrottleCandidateRow[],
  exchange: EastAfricanExchange,
  nowMs = Date.now(),
  minIntervalMinutes = 90,
): {
  skip: boolean;
  ageMinutes: number | null;
  lastSyncedAt: string | null;
} {
  const mansaRows = rows.filter(
    (r) => (r.exchange || "NSE").toUpperCase() === exchange && r.quote_source === "mansa" && r.updated_at,
  );

  if (mansaRows.length === 0) {
    return { skip: false, ageMinutes: null, lastSyncedAt: null };
  }

  let latestMs = -Infinity;
  let latestIso: string | null = null;

  for (const row of mansaRows) {
    const parsed = Date.parse(row.updated_at!);
    if (Number.isFinite(parsed) && parsed > latestMs) {
      latestMs = parsed;
      latestIso = row.updated_at!;
    }
  }

  if (!Number.isFinite(latestMs) || !latestIso) {
    return { skip: false, ageMinutes: null, lastSyncedAt: null };
  }

  const ageMinutes = (nowMs - latestMs) / 60_000;
  const roundedAge = Math.max(0, Math.round(ageMinutes));

  if (ageMinutes >= 0 && ageMinutes < minIntervalMinutes) {
    return {
      skip: true,
      ageMinutes: roundedAge,
      lastSyncedAt: latestIso,
    };
  }

  return {
    skip: false,
    ageMinutes: roundedAge,
    lastSyncedAt: latestIso,
  };
}

export const MANSA_BASE_URL = "https://mansaapi.com/api/v1/markets/exchanges";

export async function fetchMansaExchangeStocks(
  mansaApiKey: string,
  exchange: EastAfricanExchange,
  request: typeof fetch = fetch,
) {
  const url = `${MANSA_BASE_URL}/${encodeURIComponent(exchange)}/stocks?limit=200`;
  const response = await request(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${mansaApiKey}`,
      "Accept": "application/json",
      "User-Agent": "KenyaFundFinder-MarketSync/1.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Mansa ${exchange} HTTP ${response.status}${errText ? `: ${errText.slice(0, 180)}` : ""}`);
  }

  const payload = await response.json();
  return parseMansaExchangeStocksResponse(payload, exchange);
}
