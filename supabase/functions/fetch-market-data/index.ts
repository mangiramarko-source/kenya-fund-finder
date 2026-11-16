import { createClient, type SupabaseClient } from "../_shared/supabase-client.ts";
import { calculateMarketSummary } from "../_shared/market-summary.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-keys.ts";
import { evaluateStockQuoteDrift, matchRapidApiStocks, parseRapidApiStockResponse, type QuoteSource, type StockQuote } from "./stock-quotes.ts";
import {
  compute52WeekRange,
  insertBackfillHistoryBatch,
  insertNewMansaStock,
  persistStockQuote,
  type StockWriteOperations,
} from "./stock-writes.ts";
import { fetchNseSector, parseNseQuoteRows, parseNseSnapshotDate, summarizeNseFallback } from "./nse-fallback.ts";
import {
  EAST_AFRICAN_EXCHANGE_META,
  EAST_AFRICAN_EXCHANGES,
  fetchMansaExchangeStocks,
  fetchMansaStockHistory,
  REGIONAL_MANSA_EXCHANGES,
  shouldSkipMansaExchangeRefresh,
  VALID_MANSA_HISTORY_RANGES,
  type EastAfricanExchange,
  type MansaHistoryRange,
  type MansaStockQuote,
} from "./mansa-stocks.ts";
import {
  fetchSerrariAllFundsData,
  getVerifiedSourceGroups,
  hasFundMetricsChanged,
  shouldAdvanceFlatFundDate,
} from "./serrari-funds.ts";

const allowedOrigins = new Set([
  "https://kenya-fund-finder.lovable.app",
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4180",
  "http://127.0.0.1:4180",
]);

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+--e72d5937-d879-434f-ab8d-95e8c43f9adf\.lovable\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const matched = isOriginAllowed(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": matched,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// ExchangeRate-API free endpoint (no key needed)
const FX_API = "https://open.er-api.com/v6/latest/KES";

// CoinGecko free API for crypto prices
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

const RAPIDAPI_STOCKS_API = "https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks";
const STOCK_REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json",
};

// Map of common commodity symbols to CoinGecko IDs
const CRYPTO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  USDT: "tether",
  USDC: "usd-coin",
};

// Map commodity symbols to free data sources
const PRECIOUS_METALS: Record<string, string> = {
  XAU: "gold",
  GOLD: "gold",
  XAG: "silver",
  SILVER: "silver",
};

// Yahoo Finance futures tickers for commodities (metals, energy, agriculture)
// Used by name-match fallback when symbol isn't in this map.
const YAHOO_COMMODITY_MAP: Record<string, string> = {
  XAU: "GC=F", GOLD: "GC=F",
  XAG: "SI=F", SILVER: "SI=F",
  BRENT: "BZ=F",
  WTI: "CL=F", CRUDE: "CL=F", OIL: "CL=F",
  NG: "NG=F", NATGAS: "NG=F",
  HG: "HG=F", COPPER: "HG=F",
  KC: "KC=F", COFFEE: "KC=F",
  CC: "CC=F", COCOA: "CC=F",
  SB: "SB=F", SUGAR: "SB=F",
  ZC: "ZC=F", CORN: "ZC=F",
  ZW: "ZW=F", WHEAT: "ZW=F",
  ZS: "ZS=F", SOY: "ZS=F", SOYBEAN: "ZS=F",
  PL: "PL=F", PLATINUM: "PL=F",
  PA: "PA=F", PALLADIUM: "PA=F",
};

// Name-keyword fallback when symbol isn't recognized
const YAHOO_NAME_KEYWORDS: Array<{ keywords: string[]; ticker: string }> = [
  { keywords: ["gold"], ticker: "GC=F" },
  { keywords: ["silver"], ticker: "SI=F" },
  { keywords: ["brent"], ticker: "BZ=F" },
  { keywords: ["wti", "crude"], ticker: "CL=F" },
  { keywords: ["natural gas", "natgas"], ticker: "NG=F" },
  { keywords: ["copper"], ticker: "HG=F" },
  { keywords: ["coffee"], ticker: "KC=F" },
  { keywords: ["cocoa"], ticker: "CC=F" },
  { keywords: ["sugar"], ticker: "SB=F" },
  { keywords: ["corn"], ticker: "ZC=F" },
  { keywords: ["wheat"], ticker: "ZW=F" },
  { keywords: ["soy"], ticker: "ZS=F" },
  { keywords: ["platinum"], ticker: "PL=F" },
  { keywords: ["palladium"], ticker: "PA=F" },
];

function resolveYahooTicker(symbol: string, name: string): string | null {
  const sym = (symbol || "").toUpperCase();
  if (YAHOO_COMMODITY_MAP[sym]) return YAHOO_COMMODITY_MAP[sym];
  const lowerName = (name || "").toLowerCase();
  for (const { keywords, ticker } of YAHOO_NAME_KEYWORDS) {
    if (keywords.some((k) => lowerName.includes(k))) return ticker;
  }
  return null;
}

// NSE stock symbols → Yahoo Finance tickers (.NR suffix for Nairobi)
const NSE_YAHOO_MAP: Record<string, string> = {
  SCOM: "SCOM.NR", EQTY: "EQTY.NR", KCB: "KCB.NR", COOP: "COOP.NR",
  ABSA: "ABSA.NR", EABL: "EABL.NR", BAT: "BAT.NR", KNRE: "KNRE.NR",
  KPLC: "KPLC.NR", BAMB: "BAMB.NR", SASN: "SASN.NR", TOTL: "TOTL.NR",
  NCBA: "NCBA.NR", SCBK: "SCBK.NR", SBIC: "SBIC.NR", IMH: "IMH.NR",
  KEGN: "KEGN.NR", BKG: "BKG.NR", DTK: "DTK.NR", BRIT: "BRIT.NR",
  JUB: "JUB.NR", KQ: "KQ.NR", HFCK: "HFCK.NR", CIC: "CIC.NR",
  CTUM: "CTUM.NR", KUKZ: "KUKZ.NR", CRWN: "CRWN.NR", PORT: "PORT.NR",
  CARB: "CARB.NR", NSE20: "NSE.NR", CGEN: "CGEN.NR", LBTY: "LBTY.NR",
  WTK: "WTK.NR", SMER: "SMER.NR", TPSE: "TPSE.NR", KAPC: "KAPC.NR",
  NMG: "NMG.NR", BOC: "BOC.NR", UNGA: "UNGA.NR", SLAM: "SLAM.NR",
  TCL: "TCL.NR", LKL: "LKL.NR", SGL: "SGL.NR", KPC: "KPC.NR",
  UMME: "UMME.NR",
};

const NSE_SECTOR_MAP: Record<string, string> = {
  SCOM: "tele",
  EQTY: "bank",
  KCB: "bank",
  COOP: "bank",
  ABSA: "bank",
  EABL: "manu",
  BAT: "manu",
  KNRE: "insr",
  KPLC: "energy",
  BAMB: "const",
  SASN: "agric",
  TOTL: "energy",
  KPC: "energy",
  NCBA: "bank",
  SCBK: "bank",
  SBIC: "bank",
  IMH: "bank",
  KEGN: "energy",
  BKG: "bank",
  DTK: "bank",
  BRIT: "insr",
  JUB: "insr",
  KQ: "comm",
  HFCK: "bank",
  CIC: "insr",
  CTUM: "invest",
  KUKZ: "agric",
  CRWN: "const",
  PORT: "const",
  CARB: "manu",
  NSE20: "investse",
  CGEN: "auto",
  LBTY: "insr",
  WTK: "agric",
  SMER: "manu",
  TPSE: "comm",
  KAPC: "agric",
  NMG: "comm",
  BOC: "manu",
  UNGA: "manu",
  SLAM: "insr",
  TCL: "invest",
  LKL: "comm",
  SGL: "comm",
  UMME: "energy",
};

const NSE_SYMBOL_PATTERNS: Record<string, string[]> = {
  SCOM: ["safaricom"],
  EQTY: ["equity bank", "equity group"],
  KCB: ["kenya commercial bank", "kcb"],
  COOP: ["co operative bank", "co-operative bank"],
  ABSA: ["absa"],
  EABL: ["east african breweries"],
  BAT: ["british american tobacco"],
  KNRE: ["kenya re insurance", "kenya re-insurance", "kenya re"],
  KPLC: [
    "kenya power and lighting co plc ord",
    "kenya power lighting co plc ord",
    "the kenya power and lighting co plc ord",
    "the kenya power lighting co plc ord",
    "kenya power ord",
    "kenya power lighting ord",
    "kenya power and lighting ord",
    "kenya power",
  ],
  BAMB: ["bamburi cement"],
  SASN: ["sasini"],
  TOTL: ["total kenya", "totalenergies"],
  KPC: ["kenya pipeline"],
  NCBA: ["ncba"],
  SCBK: ["standard chartered"],
  SBIC: ["stanbic"],
  IMH: ["i m group", "i&m group"],
  KEGN: ["kengen"],
  BKG: ["bk group"],
  DTK: ["diamond trust"],
  BRIT: ["britam"],
  JUB: ["jubilee"],
  KQ: ["kenya airways"],
  HFCK: ["hf group"],
  CIC: ["cic insurance"],
  CTUM: ["centum investment"],
  KUKZ: ["kakuzi"],
  CRWN: ["crown berger", "crown paints"],
  PORT: ["east african portland", "portland cement"],
  CARB: ["carbacid"],
  NSE20: ["nairobi securities exchange"],
  CGEN: ["car and general"],
  LBTY: ["liberty insurance", "liberty kenya"],
  WTK: ["williamson tea"],
  SMER: ["sameer"],
  TPSE: ["tps eastern africa"],
  KAPC: ["kapchorua tea"],
  NMG: ["nation media"],
  BOC: ["b o c kenya", "boc kenya"],
  UNGA: ["unga"],
  SLAM: ["sanlam"],
  TCL: ["trans century", "trans-century"],
  LKL: ["longhorn"],
  SGL: ["standard group"],
  UMME: ["umeme"],
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

type StockCacheRow = {
  id: string;
  symbol: string;
  exchange?: string | null;
  exchange_ticker?: string | null;
  currency?: string | null;
  country_code?: string | null;
  sector?: string | null;
  name?: string;
  is_active?: boolean;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  pe_ratio: number | null;
  year_high: number | null;
  year_low: number | null;
  updated_at: string;
  provider_updated_at: string | null;
  quote_source: QuoteSource | null;
};

type StockDataResult = {
  quotes: Map<string, StockQuote>;
  mansaQuotes: Map<string, MansaStockQuote>;
  fetchedMansaExchanges: Set<EastAfricanExchange>;
  source: "primary" | "secondary" | "cache" | "mixed";
  fallback: boolean;
  cacheTimestamp: string | null;
  notes: string[];
  fallbackDiagnostics: ReturnType<typeof summarizeNseFallback> | null;
};

const NSE_XHR_SECTORS = [...new Set(Object.values(NSE_SECTOR_MAP))];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildCachedStockQuotes(stockRows: StockCacheRow[]) {
  const quotes = new Map<string, StockQuote>();

  for (const row of stockRows) {
    const symbol = (row.symbol || "").toUpperCase();
    if (!symbol || row.price <= 0) continue;

    const previousPrice = row.previous_price ?? Number((row.price - row.day_change).toFixed(2));
    quotes.set(symbol, {
      price: Number(row.price.toFixed(2)),
      previousPrice,
      dayChange: Number(row.day_change.toFixed(2)),
      dayChangePct: Number(row.day_change_percent.toFixed(2)),
      volume: row.volume || 0,
      source: "cache",
      asOfDate: row.updated_at ? row.updated_at.split("T")[0] : null,
      providerUpdatedAt: row.provider_updated_at,
      quoteSource: row.quote_source,
    });
  }

  return quotes;
}

function getLatestCacheTimestamp(stockRows: StockCacheRow[]) {
  return stockRows.reduce<string | null>((latest, row) => {
    if (!row.updated_at) return latest;
    return !latest || row.updated_at > latest ? row.updated_at : latest;
  }, null);
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 2) {
  let lastError = `Request failed for ${url}`;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const errorBody = await response.text();
      lastError = `HTTP ${response.status}${errorBody ? `: ${errorBody.slice(0, 200)}` : ""}`;
      console.error(`[fetch-market-data] Request failed (${attempt}/${attempts}) ${url}: ${lastError}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`[fetch-market-data] Request error (${attempt}/${attempts}) ${url}:`, error);
    }

    if (attempt < attempts) {
      await sleep(300 * attempt);
    }
  }

  throw new Error(lastError);
}

async function fetchRapidApiStockQuotes(rapidApiKey: string, stockSymbols: string[]) {
  try {
    const response = await fetchWithRetry(
      RAPIDAPI_STOCKS_API,
      {
        headers: {
          ...STOCK_REQUEST_HEADERS,
          "Content-Type": "application/json",
          "x-rapidapi-host": "nairobi-stock-exchange-nse.p.rapidapi.com",
          "x-rapidapi-key": rapidApiKey,
        },
      },
      2,
    );

    const parsed = parseRapidApiStockResponse(await response.json());
    const { quotes, rejectedAliases } = matchRapidApiStocks(stockSymbols, parsed.quotes);
    console.info("[fetch-market-data] RapidAPI stock response", {
      ...parsed.diagnostics,
      matched_stocks: quotes.size,
      rejected_aliases: rejectedAliases,
    });
    if (rejectedAliases.length || parsed.diagnostics.rejected) {
      console.warn("[fetch-market-data] Some RapidAPI instruments failed validation", {
        rejected: parsed.diagnostics.rejected, rejected_aliases: rejectedAliases,
      });
    }

    return {
      quotes,
      note: `Primary API returned ${parsed.diagnostics.returned} instruments, matched ${quotes.size} stocks, rejected ${parsed.diagnostics.rejected} invalid records and ${rejectedAliases.length} aliases`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      quotes: new Map<string, StockQuote>(),
      note: `Primary API failed: ${message}`,
    };
  }
}

async function fetchNseXhrStockQuotes() {
  const sectorRows = new Map<string, Array<{ company: string; price: number; changePct: number; volume: number }>>();
  let snapshotDate: string | null = null;

  const responses = await Promise.all(
    NSE_XHR_SECTORS.map((sector) => fetchNseSector(sector)),
  );

  for (const response of responses) {
    const { sector, html } = response;
    if (!html) continue;
    snapshotDate = snapshotDate || parseNseSnapshotDate(html);

    const rows = parseNseQuoteRows(html);
    if (rows.length > 0) {
      sectorRows.set(sector, rows);
    } else {
      response.errorCode = "NO_QUOTE_ROWS";
    }
  }

  const quotes = new Map<string, StockQuote>();

  for (const [symbol, sector] of Object.entries(NSE_SECTOR_MAP)) {
    const patterns = NSE_SYMBOL_PATTERNS[symbol] || [symbol.toLowerCase()];
    const row = (sectorRows.get(sector) || []).find((entry) => {
      const normalizedCompany = normalizeText(entry.company);
      if (symbol === "KPLC" && /\bpref\b|\bpreference\b/i.test(normalizedCompany)) {
        return false;
      }
      return patterns.some((pattern) => normalizedCompany.includes(normalizeText(pattern)));
    });

    if (!row) continue;

    const previousPrice = row.changePct === -100
      ? row.price
      : Number((row.price / (1 + row.changePct / 100)).toFixed(2));
    const dayChange = Number((row.price - previousPrice).toFixed(2));

    quotes.set(symbol, {
      price: Number(row.price.toFixed(2)),
      previousPrice,
      dayChange,
      dayChangePct: Number(row.changePct.toFixed(2)),
      volume: row.volume,
      source: "secondary",
      asOfDate: snapshotDate,
      providerUpdatedAt: null,
      quoteSource: "nse",
    });
  }

  const diagnostics = summarizeNseFallback(responses, quotes.size);
  if (diagnostics.status !== "available") {
    console.warn("[fetch-market-data] Official NSE fallback degraded", diagnostics);
  }
  return {
    quotes,
    diagnostics,
    note: `NSE XHR ${diagnostics.status}: fetched ${quotes.size} stocks, ${diagnostics.sectors_failed}/${diagnostics.sectors_requested} sectors failed${snapshotDate ? ` (${snapshotDate})` : ""}`,
  };
}

function getQuoteSource(quotes: Map<string, StockQuote>) {
  const sources = new Set(Array.from(quotes.values(), (quote) => quote.source));
  if (sources.size > 1) return "mixed" as const;
  if (sources.has("primary")) return "primary" as const;
  if (sources.has("secondary")) return "secondary" as const;
  return "cache" as const;
}

async function getStockData(
  stockRows: StockCacheRow[],
  options: {
    requestedExchanges: EastAfricanExchange[];
    forceMansa: boolean;
    includeMansaNseFallback: boolean;
    dryRun: boolean;
    nowMs: number;
  },
): Promise<StockDataResult> {
  const quotes = new Map<string, StockQuote>();
  const mansaQuotes = new Map<string, MansaStockQuote>();
  const fetchedMansaExchanges = new Set<EastAfricanExchange>();
  const notes: string[] = [];
  let fallbackDiagnostics: StockDataResult["fallbackDiagnostics"] = null;
  const cachedQuotes = buildCachedStockQuotes(stockRows);
  const cacheTimestamp = getLatestCacheTimestamp(stockRows);

  const requestedSet = new Set<EastAfricanExchange>(options.requestedExchanges);
  const mansaApiKey = Deno.env.get("MANSA_API_KEY");

  // ── 3a. Kenyan NSE Stocks (RapidAPI primary, NSE XHR secondary, opt-in Mansa fallback) ──
  if (requestedSet.has("NSE")) {
    const nseSymbols = stockRows
      .filter((row) => (row.exchange || "NSE").toUpperCase() === "NSE")
      .map((row) => (row.symbol || "").toUpperCase())
      .filter(Boolean);

    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (rapidApiKey) {
      const primary = await fetchRapidApiStockQuotes(rapidApiKey, nseSymbols);
      notes.push(primary.note);
      primary.quotes.forEach((quote, symbol) => quotes.set(symbol, quote));
    } else {
      notes.push("Primary API key missing");
    }

    const missingAfterPrimary = nseSymbols.filter((symbol) => !quotes.has(symbol));
    if (missingAfterPrimary.length > 0) {
      const secondary = await fetchNseXhrStockQuotes();
      notes.push(secondary.note);
      fallbackDiagnostics = secondary.diagnostics;

      for (const symbol of missingAfterPrimary) {
        const quote = secondary.quotes.get(symbol);
        if (quote) {
          quotes.set(symbol, quote);
        }
      }
    }

    const missingAfterSecondary = nseSymbols.filter((symbol) => !quotes.has(symbol));
    if (missingAfterSecondary.length > 0 && options.includeMansaNseFallback && mansaApiKey) {
      try {
        const mansaNse = await fetchMansaExchangeStocks(mansaApiKey, "NSE");
        fetchedMansaExchanges.add("NSE");
        let filled = 0;
        for (const symbol of missingAfterSecondary) {
          const mq = mansaNse.quotes.get(symbol);
          if (mq) {
            quotes.set(symbol, mq);
            mansaQuotes.set(symbol, mq);
            filled++;
          }
        }
        notes.push(`Mansa NSE fallback: returned ${mansaNse.diagnostics.returned} rows, filled ${filled} missing NSE symbols`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        notes.push(`Mansa NSE fallback failed: ${msg}`);
      }
    }

    const stillMissingNse = nseSymbols.filter((symbol) => !quotes.has(symbol));
    let nseCacheHits = 0;
    for (const symbol of stillMissingNse) {
      const cached = cachedQuotes.get(symbol);
      if (!cached) continue;
      quotes.set(symbol, cached);
      nseCacheHits++;
    }
    if (nseCacheHits > 0) {
      notes.push(`Cache supplied ${nseCacheHits} NSE stocks${cacheTimestamp ? ` from ${cacheTimestamp}` : ""}`);
    }
  }

  // ── 3b. Regional East African Exchanges (USE, DSE, RSE via Mansa API) ──
  const regionalExchanges = options.requestedExchanges.filter(
    (ex): ex is EastAfricanExchange => ex !== "NSE",
  );

  for (const exchange of regionalExchanges) {
    const exchangeRows = stockRows.filter(
      (row) => (row.exchange || "NSE").toUpperCase() === exchange,
    );
    const exchangeSymbols = exchangeRows
      .map((row) => (row.symbol || "").toUpperCase())
      .filter(Boolean);

    if (!mansaApiKey) {
      notes.push(`Mansa ${exchange}: MANSA_API_KEY missing`);
      for (const sym of exchangeSymbols) {
        const cached = cachedQuotes.get(sym);
        if (cached) quotes.set(sym, cached);
      }
      continue;
    }

    if (!options.forceMansa && !options.dryRun) {
      const throttle = shouldSkipMansaExchangeRefresh(stockRows, exchange, options.nowMs, 90);
      if (throttle.skip) {
        let cachedCount = 0;
        for (const sym of exchangeSymbols) {
          const cached = cachedQuotes.get(sym);
          if (cached) {
            quotes.set(sym, cached);
            cachedCount++;
          }
        }
        notes.push(
          `Mansa ${exchange}: skipped (synced ${throttle.ageMinutes}m ago < 90m quota guard), serving ${cachedCount} cached stocks`,
        );
        continue;
      }
    }

    try {
      const mansaRes = await fetchMansaExchangeStocks(mansaApiKey, exchange);
      fetchedMansaExchanges.add(exchange);
      mansaRes.quotes.forEach((mq, symbol) => {
        quotes.set(symbol, mq);
        mansaQuotes.set(symbol, mq);
      });
      notes.push(
        `Mansa ${exchange}: returned ${mansaRes.diagnostics.returned} rows, accepted ${mansaRes.diagnostics.accepted} equities${
          mansaRes.diagnostics.filtered_bonds_count > 0
            ? `, filtered ${mansaRes.diagnostics.filtered_bonds_count} bonds (${mansaRes.diagnostics.filtered_bonds.join(", ")})`
            : ""
        }`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      notes.push(`Mansa ${exchange} failed: ${msg}`);
      for (const sym of exchangeSymbols) {
        const cached = cachedQuotes.get(sym);
        if (cached) quotes.set(sym, cached);
      }
    }
  }

  if (quotes.size === 0 && cachedQuotes.size > 0) {
    cachedQuotes.forEach((quote, symbol) => quotes.set(symbol, quote));
    notes.push(`All providers failed, serving cached data${cacheTimestamp ? ` from ${cacheTimestamp}` : ""}`);
  }

  return {
    quotes,
    mansaQuotes,
    fetchedMansaExchanges,
    source: getQuoteSource(quotes),
    fallback: Array.from(quotes.values()).some((quote) => quote.source === "cache"),
    cacheTimestamp,
    notes,
    fallbackDiagnostics,
  };
}

async function fetchAllCandidateHistoryRows(
  supabase: SupabaseClient,
  stockIds: string[],
): Promise<Map<string, Array<{ snapshot_date: string; price: number }>>> {
  const map = new Map<string, Array<{ snapshot_date: string; price: number }>>();
  if (stockIds.length === 0) return map;

  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("stock_price_history")
      .select("stock_id, snapshot_date, price")
      .in("stock_id", stockIds)
      .order("snapshot_date", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`History bulk read failed: ${error.code || error.message}`);
    }
    const rows = (data || []) as Array<{ stock_id: string; snapshot_date: string; price: number }>;
    for (const r of rows) {
      const list = map.get(r.stock_id) ?? [];
      list.push({ snapshot_date: String(r.snapshot_date), price: Number(r.price) });
      map.set(r.stock_id, list);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return map;
}

async function handleBackfillHistory(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const mansaApiKey = Deno.env.get("MANSA_API_KEY");
  const dryRun = Boolean(body.dry_run);
  if (!mansaApiKey) {
    return new Response(
      JSON.stringify({ success: false, action: "backfill_history", error: "MANSA_API_KEY secret is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rawExchanges = Array.isArray(body.exchanges) ? body.exchanges : [...REGIONAL_MANSA_EXCHANGES];
  const requestedRegional = rawExchanges
    .map((item) => String(item || "").trim().toUpperCase())
    .filter((ex): ex is EastAfricanExchange =>
      (REGIONAL_MANSA_EXCHANGES as readonly string[]).includes(ex)
    );
  const effectiveExchanges: EastAfricanExchange[] =
    requestedRegional.length > 0 ? requestedRegional : [...REGIONAL_MANSA_EXCHANGES];

  const rawRange = String(body.range || "1Y").trim().toUpperCase();
  const range: MansaHistoryRange = (VALID_MANSA_HISTORY_RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as MansaHistoryRange)
    : "1Y";

  const minExistingRows = Math.max(
    1,
    Math.min(5000, Number.isFinite(Number(body.min_existing_rows)) ? Number(body.min_existing_rows) : 30),
  );
  const maxTickers = Math.max(
    1,
    Math.min(100, Number.isFinite(Number(body.max_tickers)) ? Number(body.max_tickers) : 30),
  );

  const { data: stockData, error: stocksErr } = await supabase
    .from("stocks")
    .select("id, symbol, exchange, exchange_ticker, price, year_high, year_low")
    .eq("is_active", true)
    .in("exchange", effectiveExchanges)
    .order("sort_order", { ascending: true });

  if (stocksErr) {
    throw new Error(`Regional stock query failed: ${stocksErr.code || stocksErr.message}`);
  }

  const regionalRows = (stockData || []) as Array<{
    id: string;
    symbol: string;
    exchange: string;
    exchange_ticker: string | null;
    price: number;
    year_high: number | null;
    year_low: number | null;
  }>;

  const historyByStockId = await fetchAllCandidateHistoryRows(
    supabase,
    regionalRows.map((r) => r.id),
  );

  const candidatesAll = regionalRows.filter(
    (r) => (historyByStockId.get(r.id)?.length ?? 0) < minExistingRows,
  );
  const targets = candidatesAll.slice(0, maxTickers);

  let tierBlocked = false;
  let rateLimited = false;
  let abortedReason: string | null = null;
  let stocksWritten = 0;
  let rowsWritten = 0;
  const referenceDateIso = new Date().toISOString().slice(0, 10);

  const report: Array<{
    symbol: string;
    exchange: string;
    exchange_ticker: string;
    existing_rows: number;
    fetched_points: number;
    inserted_rows: number;
    scale_ratio: number | null;
    status: string;
    error?: string | null;
  }> = [];

  for (const row of targets) {
    const ex = ((row.exchange || "USE").toUpperCase()) as EastAfricanExchange;
    const ticker = (row.exchange_ticker || row.symbol.replace(/^(USE|DSE|RSE)-/i, "")).trim();
    const existing = historyByStockId.get(row.id) ?? [];

    const fetched = await fetchMansaStockHistory(mansaApiKey, ex, ticker, {
      range,
      referencePrice: Number(row.price) || null,
    });

    if (fetched.tierBlocked) {
      tierBlocked = true;
      abortedReason = `Mansa Pro tier or valid key required (HTTP ${fetched.status})`;
      report.push({
        symbol: row.symbol,
        exchange: ex,
        exchange_ticker: ticker,
        existing_rows: existing.length,
        fetched_points: 0,
        inserted_rows: 0,
        scale_ratio: null,
        status: "tier_blocked",
        error: fetched.error,
      });
      break;
    }

    if (fetched.rateLimited) {
      rateLimited = true;
      abortedReason = "Mansa API rate limit (HTTP 429) reached; stopped early to preserve quota";
      report.push({
        symbol: row.symbol,
        exchange: ex,
        exchange_ticker: ticker,
        existing_rows: existing.length,
        fetched_points: 0,
        inserted_rows: 0,
        scale_ratio: null,
        status: "rate_limited",
        error: fetched.error,
      });
      break;
    }

    if (!fetched.ok) {
      report.push({
        symbol: row.symbol,
        exchange: ex,
        exchange_ticker: ticker,
        existing_rows: existing.length,
        fetched_points: fetched.rawCount,
        inserted_rows: 0,
        scale_ratio: fetched.scaleRatio,
        status: fetched.blockedReason === "SCALE_MISMATCH"
          ? "scale_mismatch"
          : fetched.notFound
          ? "not_found"
          : "error",
        error: fetched.error,
      });
      continue;
    }

    const existingDates = new Set(existing.map((e) => e.snapshot_date));
    const toInsert = fetched.points
      .filter((pt) => !existingDates.has(pt.date))
      .map((pt) => ({
        stock_id: row.id,
        price: pt.price,
        snapshot_date: pt.date,
      }));

    if (dryRun) {
      report.push({
        symbol: row.symbol,
        exchange: ex,
        exchange_ticker: ticker,
        existing_rows: existing.length,
        fetched_points: fetched.points.length,
        inserted_rows: toInsert.length,
        scale_ratio: fetched.scaleRatio,
        status: "dry_run_ok",
      });
      continue;
    }

    let writtenForTicker = 0;
    if (toInsert.length > 0) {
      const batchRes = await insertBackfillHistoryBatch(toInsert, (chunk) =>
        supabase
          .from("stock_price_history")
          .upsert(chunk, { onConflict: "stock_id,snapshot_date", ignoreDuplicates: true })
      );
      if (batchRes.error) {
        report.push({
          symbol: row.symbol,
          exchange: ex,
          exchange_ticker: ticker,
          existing_rows: existing.length,
          fetched_points: fetched.points.length,
          inserted_rows: 0,
          scale_ratio: fetched.scaleRatio,
          status: "write_error",
          error: batchRes.error,
        });
        continue;
      }
      writtenForTicker = batchRes.writtenRows;
      rowsWritten += writtenForTicker;
    }

    const combinedPoints = [
      ...existing,
      ...toInsert.map((pt) => ({ snapshot_date: pt.snapshot_date, price: pt.price })),
    ];
    const clampedRange = compute52WeekRange(Number(row.price) || null, combinedPoints, referenceDateIso);
    if (clampedRange.yearHigh != null && clampedRange.yearLow != null) {
      await supabase
        .from("stocks")
        .update({ year_high: clampedRange.yearHigh, year_low: clampedRange.yearLow })
        .eq("id", row.id);
    }

    stocksWritten++;
    report.push({
      symbol: row.symbol,
      exchange: ex,
      exchange_ticker: ticker,
      existing_rows: existing.length,
      fetched_points: fetched.points.length,
      inserted_rows: writtenForTicker,
      scale_ratio: fetched.scaleRatio,
      status: "ok",
    });
  }

  return new Response(
    JSON.stringify({
      success: !tierBlocked && !rateLimited,
      action: "backfill_history",
      dry_run: dryRun,
      exchanges: effectiveExchanges,
      range,
      min_existing_rows: minExistingRows,
      max_tickers: maxTickers,
      total_regional_stocks: regionalRows.length,
      candidates_needing_backfill: candidatesAll.length,
      candidates_processed: report.length,
      stocks_written: stocksWritten,
      rows_written: rowsWritten,
      tier_blocked: tierBlocked,
      rate_limited: rateLimited,
      aborted_reason: abortedReason,
      report,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authorization = await authorizePrivilegedRequest(req, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (accessToken) => {
      const userClient = createClient(supabaseUrl, getSupabasePublishableKey());
      const { data, error } = await userClient.auth.getUser(accessToken);
      return error ? null : data.user?.id ?? null;
    },
    isAdmin: async (userId) => {
      const adminClient = createClient(supabaseUrl, getSupabaseSecretKey());
      const { data } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });

  if (!authorization.ok) {
    return new Response(
      JSON.stringify({ error: authorization.status === 401 ? "Unauthorized" : "Forbidden" }),
      {
        status: authorization.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, getSupabaseSecretKey());
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* no body is fine */ }

  if ((body as Record<string, unknown>)?.action === "backfill_history") {
    try {
      return await handleBackfillHistory(supabase, body, corsHeaders);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({ success: false, action: "backfill_history", error: msg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const fetchType = (body as Record<string, unknown>)?.fetch_type as string | undefined;
  const results: string[] = [];
  let stockRunReport: Record<string, unknown> | null = null;
  let stockWriteErrors = 0;
  const observedAt = new Date().toISOString();
  const quoteObservations: Array<{ asset_type: "stock" | "fx" | "commodity"; asset_id: string; value: number; observed_at: string }> = [];
  const recordQuote = (assetType: "stock" | "fx" | "commodity", assetId: string, value: number) => {
    if (Number.isFinite(value) && value > 0) quoteObservations.push({ asset_type: assetType, asset_id: assetId, value, observed_at: observedAt });
  };
  console.log(`[fetch-market-data] Starting data fetch cycle... (type: ${fetchType || "all"})`);

  const shouldFetchFx = !fetchType || fetchType === "fx";
  // The DB cron schedules 'fx' with the intent of fetching both FX and commodities every hour (lightweight)
  const shouldFetchCommodities = !fetchType || fetchType === "commodities" || fetchType === "fx";
  const shouldFetchStocks = !fetchType || fetchType === "stocks";
  const shouldFetchFunds = !fetchType || fetchType === "funds" || fetchType === "mmf";
  const allowHighDrift = Boolean((body as Record<string, unknown>)?.allow_high_drift);
  // Inspection mode: parse the source and diff against the DB without writing anything.
  const dryRun = Boolean((body as Record<string, unknown>)?.dry_run);
  let fundInspection: Record<string, unknown> | null = null;
  let stockInspection: Record<string, unknown> | null = null;

  try {
    // ── 1. Fetch FX rates ──
    let kesRates: Record<string, number> = {};
    if (shouldFetchFx || shouldFetchCommodities) {
      const fxRes = await fetch(FX_API);
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        kesRates = fxData.rates || {};

        if (shouldFetchFx) {
          const { data: existing } = await supabase
            .from("exchange_rates")
            .select("id, currency_code, rate");

          if (existing && existing.length > 0) {
            for (const row of existing) {
              const code = row.currency_code;
              const apiRate = kesRates[code];
              if (apiRate && apiRate > 0) {
                const newRate = parseFloat((1 / apiRate).toFixed(4));
                if (newRate !== row.rate) {
                  await supabase
                    .from("exchange_rates")
                    .update({
                      previous_rate: row.rate,
                      rate: newRate,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", row.id);
                  results.push(`FX ${code}: ${row.rate} → ${newRate}`);
                } else {
                  // Rate unchanged - still bump updated_at to reflect a successful refresh
                  await supabase
                    .from("exchange_rates")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", row.id);
                }
                recordQuote("fx", row.id, newRate);
              }
            }
          }
          results.push(`FX: processed ${existing?.length || 0} currencies`);
        }
      } else {
        console.error(`[fetch-market-data] FX API failed: ${fxRes.status} ${fxRes.statusText}`);
        results.push(`FX API returned ${fxRes.status}`);
      }
    }

    // ── 2. Fetch commodity prices ──
    if (shouldFetchCommodities) {
    const { data: commodityRows } = await supabase
      .from("commodities")
      .select("id, symbol, name, price, unit");

    if (commodityRows && commodityRows.length > 0) {
      const cryptoItems: typeof commodityRows = [];
      const yahooItems: Array<{ row: typeof commodityRows[number]; ticker: string }> = [];

      for (const c of commodityRows) {
        const sym = (c.symbol || "").toUpperCase();
        if (CRYPTO_MAP[sym]) {
          cryptoItems.push(c);
          continue;
        }
        const ticker = resolveYahooTicker(c.symbol || "", c.name || "");
        if (ticker) {
          yahooItems.push({ row: c, ticker });
        }
      }

      // ── 2a. Crypto via CoinGecko ──
      if (cryptoItems.length > 0) {
        const geckoIds = cryptoItems
          .map((c) => CRYPTO_MAP[(c.symbol || "").toUpperCase()])
          .filter(Boolean);
        const uniqueIds = [...new Set(geckoIds)].join(",");

        try {
          const cgRes = await fetch(
            `${COINGECKO_API}?ids=${uniqueIds}&vs_currencies=usd`
          );
          if (cgRes.ok) {
            const cgData = await cgRes.json();

            for (const row of cryptoItems) {
              const geckoId = CRYPTO_MAP[(row.symbol || "").toUpperCase()];
              const newPrice = cgData[geckoId]?.usd;
              if (newPrice && newPrice !== row.price) {
                await supabase
                  .from("commodities")
                  .update({
                    previous_price: row.price,
                    price: newPrice,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", row.id);
                results.push(`Crypto ${row.symbol}: ${row.price} → ${newPrice}`);
              } else if (newPrice) {
                // Price unchanged — still bump updated_at to reflect a successful refresh
                await supabase
                  .from("commodities")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", row.id);
              }
              if (newPrice) recordQuote("commodity", row.id, Number(newPrice));
            }
          } else {
            results.push(`CoinGecko returned non-OK status`);
          }
        } catch (e) {
          console.error("CoinGecko fetch error:", e);
          results.push(`CoinGecko fetch failed`);
        }
      }

      // ── 2b. Metals, energy, agri via Yahoo Finance chart API (per-ticker) ──
      if (yahooItems.length > 0) {
        const uniqueTickers = [...new Set(yahooItems.map((i) => i.ticker))];
        const priceByTicker: Record<string, number> = {};

        await Promise.all(
          uniqueTickers.map(async (ticker) => {
            try {
              const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
              const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
              if (!r.ok) {
                console.error(`[fetch-market-data] Yahoo chart ${ticker} ${r.status}`);
                return;
              }
              const j = await r.json();
              const meta = j?.chart?.result?.[0]?.meta;
              const p = meta?.regularMarketPrice;
              if (typeof p === "number" && p > 0) {
                priceByTicker[ticker.toUpperCase()] = p;
              }
            } catch (e) {
              console.error(`Yahoo chart ${ticker} fetch error:`, e);
            }
          })
        );

        for (const { row, ticker } of yahooItems) {
          const newPrice = priceByTicker[ticker.toUpperCase()];
          if (!newPrice) continue;
          const rounded = parseFloat(newPrice.toFixed(4));
          if (rounded !== row.price) {
            await supabase
              .from("commodities")
              .update({
                previous_price: row.price,
                price: rounded,
                updated_at: new Date().toISOString(),
              })
              .eq("id", row.id);
            results.push(`Yahoo ${row.symbol} (${ticker}): ${row.price} → ${rounded}`);
          } else {
            await supabase
              .from("commodities")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", row.id);
          }
          recordQuote("commodity", row.id, rounded);
        }
      }

      results.push(`Commodities: processed ${commodityRows.length} items (crypto=${cryptoItems.length}, yahoo=${yahooItems.length})`);
    }
    } // end shouldFetchCommodities

    // ── 3. Fetch East African stock prices (NSE via RapidAPI/NSE XHR; USE, DSE, RSE via Mansa API) ──
    if (shouldFetchStocks) {
    const rawExchangesParam = Array.isArray((body as Record<string, unknown>)?.exchanges)
      ? ((body as Record<string, unknown>).exchanges as unknown[])
      : null;
    const requestedExchanges: EastAfricanExchange[] = rawExchangesParam
      ? rawExchangesParam
          .map((item) => String(item || "").trim().toUpperCase())
          .filter((item): item is EastAfricanExchange =>
            (EAST_AFRICAN_EXCHANGES as readonly string[]).includes(item)
          )
      : [...EAST_AFRICAN_EXCHANGES];
    const effectiveExchanges: EastAfricanExchange[] =
      requestedExchanges.length > 0 ? requestedExchanges : [...EAST_AFRICAN_EXCHANGES];
    const forceMansa = Boolean((body as Record<string, unknown>)?.force_mansa);
    const includeMansaNseFallback = Boolean((body as Record<string, unknown>)?.include_mansa_nse_fallback);

    const { data: stockRowsData, error: stocksReadError } = await supabase
      .from("stocks")
      .select("id, symbol, exchange, exchange_ticker, currency, country_code, sector, name, price, previous_price, day_change, day_change_percent, volume, market_cap, pe_ratio, year_high, year_low, updated_at, provider_updated_at, quote_source, is_active");
    if (stocksReadError) throw new Error(`Stock read failed: ${stocksReadError.code}`);

    const allStockRows = (stockRowsData || []) as StockCacheRow[];
    const stockRows = allStockRows.filter((row) =>
      effectiveExchanges.includes(((row.exchange || "NSE").toUpperCase() as EastAfricanExchange))
    );

    if (allStockRows.length > 0 || effectiveExchanges.some((ex) => ex !== "NSE")) {
      let stocksUpdated = 0;
      let stocksInserted = 0;
      let historyUpdated = 0;
      let skippedDriftCount = 0;
      const successfulStockIds = new Set<string>();
      const writeFailures: Array<{ symbol: string; step: string; code: string }> = [];
      const stockWriter: StockWriteOperations = {
        updateStock: (id, patch) => supabase.from("stocks").update(patch).eq("id", id).select("id").maybeSingle(),
        upsertHistory: (row) => supabase.from("stock_price_history")
          .upsert(row, { onConflict: "stock_id,snapshot_date" }).select("id").maybeSingle(),
        insertStock: (row) => supabase.from("stocks").insert(row).select("id").maybeSingle(),
      };
      const stockData = await getStockData(stockRows, {
        requestedExchanges: effectiveExchanges,
        forceMansa,
        includeMansaNseFallback,
        dryRun,
        nowMs: Date.now(),
      });
      const fallbackCount = Array.from(stockData.quotes.values()).filter((quote) => quote.source === "cache").length;
      const freshCount = stockData.quotes.size - fallbackCount;

      results.push(...stockData.notes);

      const existingSymbols = new Set(allStockRows.map((r) => (r.symbol || "").toUpperCase()));
      const newlyDiscoveredMansaQuotes = Array.from(stockData.mansaQuotes.values()).filter(
        (mq) => mq.exchange !== "NSE" && !existingSymbols.has(mq.symbol.toUpperCase()),
      );

      if (dryRun) {
        const existingInspectionRows = stockRows.map((row) => {
          const sym = (row.symbol || "").toUpperCase();
          const quote = stockData.quotes.get(sym);
          const hasQuote = Boolean(quote && typeof quote.price === "number" && Number.isFinite(quote.price) && quote.price > 0);
          const isCached = quote?.source === "cache";

          const { driftPct, status } = evaluateStockQuoteDrift({
            dbPrice: row.price,
            dbVolume: row.volume,
            dbDayChange: row.day_change,
            quote,
            allowHighDrift,
          });

          return {
            id: row.id,
            symbol: sym,
            exchange: (row.exchange || "NSE").toUpperCase(),
            exchange_ticker: row.exchange_ticker || sym,
            currency: row.currency || "KES",
            name: row.name,
            sector: row.sector || "Other",
            is_active: row.is_active,
            status,
            quote_source: quote?.quoteSource ?? (isCached ? "cache" : null),
            source_price: hasQuote ? quote!.price : null,
            source_previous_price: hasQuote ? quote!.previousPrice : null,
            source_day_change: hasQuote ? quote!.dayChange : null,
            source_day_change_percent: hasQuote ? quote!.dayChangePct : null,
            source_volume: hasQuote ? quote!.volume : null,
            db_price: row.price,
            db_day_change: row.day_change,
            db_day_change_percent: row.day_change_percent,
            db_volume: row.volume,
            drift_pct: driftPct,
            provider_updated_at: quote?.providerUpdatedAt ?? null,
            db_updated_at: row.updated_at,
          };
        });

        const newMansaInspectionRows = newlyDiscoveredMansaQuotes.map((mq) => ({
          id: `new:${mq.symbol}`,
          symbol: mq.symbol,
          exchange: mq.exchange,
          exchange_ticker: mq.exchangeTicker,
          currency: mq.currency,
          name: mq.name,
          sector: mq.sector,
          is_active: true,
          status: "unpriced_or_new" as const,
          quote_source: "mansa" as const,
          source_price: mq.price,
          source_previous_price: mq.previousPrice,
          source_day_change: mq.dayChange,
          source_day_change_percent: mq.dayChangePct,
          source_volume: mq.volume,
          db_price: null,
          db_day_change: null,
          db_day_change_percent: null,
          db_volume: null,
          drift_pct: null,
          provider_updated_at: mq.providerUpdatedAt,
          db_updated_at: observedAt,
        }));

        const inspectionRows = [...existingInspectionRows, ...newMansaInspectionRows];

        const missingFromSource = stockRows
          .filter((row) => {
            const sym = (row.symbol || "").toUpperCase();
            const quote = stockData.quotes.get(sym);
            return !quote || quote.source === "cache" || !quote.price || quote.price <= 0;
          })
          .map((row) => ({
            symbol: row.symbol,
            exchange: (row.exchange || "NSE").toUpperCase(),
            name: row.name,
            is_active: row.is_active,
            db_price: row.price,
            db_updated_at: row.updated_at,
          }));

        const count = (s: string) => inspectionRows.filter((r) => r.status === s).length;
        const summary = {
          total: inspectionRows.length,
          unchanged: count("unchanged"),
          would_update: count("would_update"),
          drift_blocked: count("drift_blocked"),
          cached: count("cached"),
          missing: count("missing"),
          unpriced_or_new: count("unpriced_or_new"),
        };

        stockInspection = {
          source_as_of: stockData.cacheTimestamp || observedAt,
          provider_updated_at: stockData.quotes.values().next().value?.providerUpdatedAt || null,
          source: stockData.source,
          notes: stockData.notes,
          summary,
          rows: inspectionRows,
          missing_from_source: missingFromSource,
        };

        results.push(
          `Stocks dry run: ${inspectionRows.length} stocks inspected (${summary.would_update} would update, ${summary.unpriced_or_new} new/unpriced, ${summary.unchanged} unchanged, ${summary.drift_blocked} drift blocked, ${summary.cached} cached, ${summary.missing} missing)`,
        );
      } else {
        const syncNowIso = new Date().toISOString();
        // Fetch 52-week price history for year_high/year_low calculation
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const { data: priceHistRows } = await supabase
          .from("stock_price_history")
          .select("stock_id, price")
          .gte("snapshot_date", oneYearAgo.toISOString().split("T")[0]);

        // Build lookup: stock_id → { high, low }
        const yearRanges = new Map<string, { high: number; low: number }>();
        if (priceHistRows) {
          for (const ph of priceHistRows) {
            const existing = yearRanges.get(ph.stock_id);
            if (existing) {
              if (ph.price > existing.high) existing.high = ph.price;
              if (ph.price < existing.low) existing.low = ph.price;
            } else {
              yearRanges.set(ph.stock_id, { high: ph.price, low: ph.price });
            }
          }
        }

        // Only update active stocks in live mode
        const targetStockRows = stockRows.filter((r) => r.is_active);

        // Update stocks from fresh data, falling back to cached DB values when providers fail
        for (const row of targetStockRows) {
          const sym = (row.symbol || "").toUpperCase();
          const quote = stockData.quotes.get(sym);

          if (quote && quote.price > 0) {
            if (quote.source === "cache") {
              continue;
            }

            // Drift safety guard
            const { driftPct, status: driftStatus } = evaluateStockQuoteDrift({
              dbPrice: row.price,
              dbVolume: row.volume,
              dbDayChange: row.day_change,
              quote,
              allowHighDrift,
            });
            if (driftStatus === "drift_blocked") {
              skippedDriftCount++;
              results.push(`Stock ${sym}: drift ${driftPct}% > 20% guard (${row.price} → ${quote.price}), skipped`);
              console.warn(`[fetch-market-data] Stock ${sym} skipped by drift guard`, { db: row.price, source: quote.price, driftPct });
              continue;
            }

            // Calculate year_high / year_low including current price
            const hist = yearRanges.get(row.id);
            let yearHigh = row.year_high;
            let yearLow = row.year_low;
            if (hist) {
              yearHigh = Math.max(hist.high, quote.price);
              yearLow = Math.min(hist.low, quote.price);
            } else {
              yearHigh = yearHigh ? Math.max(yearHigh, quote.price) : quote.price;
              yearLow = yearLow ? Math.min(yearLow, quote.price) : quote.price;
            }

            const written = await persistStockQuote(row.id, quote, { yearHigh, yearLow }, stockWriter, syncNowIso);
            if (written.stockWritten) {
              stocksUpdated++;
              successfulStockIds.add(row.id);
              recordQuote("stock", row.id, quote.price);
            }
            if (written.historyWritten) historyUpdated++;
            for (const failure of written.errors) {
              writeFailures.push({ symbol: sym, ...failure });
              console.error("[fetch-market-data] Stock write failed", { stock_id: row.id, symbol: sym, ...failure });
            }
          }
        }

        // Auto-seed newly discovered regional stocks (USE, DSE, RSE) from Mansa API
        if (newlyDiscoveredMansaQuotes.length > 0) {
          const countByExchange = new Map<EastAfricanExchange, number>();
          for (const row of allStockRows) {
            const ex = ((row.exchange || "NSE").toUpperCase() as EastAfricanExchange);
            countByExchange.set(ex, (countByExchange.get(ex) ?? 0) + 1);
          }

          for (const mq of newlyDiscoveredMansaQuotes) {
            const idx = (countByExchange.get(mq.exchange) ?? 0) + 1;
            countByExchange.set(mq.exchange, idx);
            const sortOrder = EAST_AFRICAN_EXCHANGE_META[mq.exchange].baseSortOrder + idx;
            const inserted = await insertNewMansaStock(mq, sortOrder, stockWriter, syncNowIso);
            if (inserted.stockWritten && inserted.stockId) {
              stocksInserted++;
              stocksUpdated++;
              successfulStockIds.add(inserted.stockId);
              recordQuote("stock", inserted.stockId, mq.price);
            }
            if (inserted.historyWritten) historyUpdated++;
            for (const failure of inserted.errors) {
              writeFailures.push({ symbol: mq.symbol, ...failure });
              console.error("[fetch-market-data] Regional stock insert failed", { symbol: mq.symbol, ...failure });
            }
          }
          if (stocksInserted > 0) {
            results.push(`Mansa regional auto-seed: inserted ${stocksInserted} new stocks`);
          }
        }

        // Ensure wall-clock updated_at is stamped for any fetched Mansa exchange even if rows were skipped
        for (const fetchedEx of stockData.fetchedMansaExchanges) {
          if (fetchedEx === "NSE") continue;
          await supabase
            .from("stocks")
            .update({ updated_at: syncNowIso, quote_source: "mansa" })
            .eq("exchange", fetchedEx)
            .eq("is_active", true);
        }

        // Calculate Kenyan NSE Market Aggregates for today (strictly NSE/KES only)
        const nseTargetRows = targetStockRows.filter(
          (row) => (row.exchange || "NSE").toUpperCase() === "NSE",
        );
        if (nseTargetRows.length > 0 && (stocksUpdated > 0 || fallbackCount > 0)) {
          const summaryRows = nseTargetRows.map((row) => {
            const sym = (row.symbol || "").toUpperCase();
            const quote = stockData.quotes.get(sym);
            return {
              dayChange: successfulStockIds.has(row.id) && quote ? quote.dayChange : row.day_change,
              marketCap: row.market_cap,
              peRatio: row.pe_ratio,
            };
          });
          const { totalMarketCap, averagePE, advances, declines, unchanged } =
            calculateMarketSummary(summaryRows);
          const snapshotDate = new Date().toISOString().split("T")[0];

          const { error: summaryError } = await supabase.from("market_summary_history").upsert(
            {
              date: snapshotDate,
              total_market_cap: totalMarketCap,
              average_pe: averagePE,
              advances,
              declines,
              unchanged,
            },
            { onConflict: "date" }
          );
          if (summaryError) {
            writeFailures.push({ symbol: "market_summary", step: "summary_upsert", code: summaryError.code });
            console.error("[fetch-market-data] Stock summary write failed", { code: summaryError.code });
          } else {
            results.push(`Inserted daily market summary history for ${snapshotDate}`);
          }
        }

        const nowIso = new Date().toISOString();
        // Always record verification heartbeat in section_live_status
        await supabase
          .from("section_live_status")
          .upsert(
            {
              section_key: "stocks",
              is_live: true,
              last_verified_at: nowIso,
              ...(stocksUpdated > 0 ? { updated_at: nowIso } : {}),
            },
            { onConflict: "section_key" },
          );

        if (stocksUpdated > 0 || skippedDriftCount > 0) {
          // Keep site_pages (slug = 'live-status') in sync when prices update
          const { data: liveStatusPage } = await supabase
            .from("site_pages")
            .select("meta")
            .eq("slug", "live-status")
            .maybeSingle();

          if (liveStatusPage) {
            const prevMeta = (liveStatusPage.meta as Record<string, unknown>) ?? {};
            const prevSections = (prevMeta.sections as Record<string, Record<string, unknown>>) ?? {};
            const nextMeta = {
              ...prevMeta,
              last_update_date: nowIso.split("T")[0],
              sections: {
                ...prevSections,
                stocks: {
                  ...(prevSections.stocks ?? {}),
                  is_live: true,
                  last_update_date: nowIso.split("T")[0],
                },
              },
            };
            await supabase
              .from("site_pages")
              .update({ meta: nextMeta, updated_at: nowIso })
              .eq("slug", "live-status");
          }

          const { error: logErr } = await supabase.from("change_log").insert({
            entity_type: "stock",
            entity_id: Array.from(successfulStockIds)[0] ?? null,
            action: "stock_quotes_sync",
            new_values: {
              as_of_date: nowIso.split("T")[0],
              updated_count: stocksUpdated,
              cached_count: fallbackCount,
              total_count: targetStockRows.length,
              drift_skipped_count: skippedDriftCount,
              provider_source: stockData.source,
              write_errors: writeFailures.length,
            },
          });
          if (logErr) {
            console.error("[fetch-market-data] Failed to write stock sync to change_log:", logErr);
          }
        }
      } // end !dryRun

      const stillMissing = stockRows
        .map((row) => (row.symbol || "").toUpperCase())
        .filter((symbol) => symbol && !stockData.quotes.has(symbol));
      if (stillMissing.length > 0) {
        results.push(`Stocks missing quotes: ${stillMissing.join(", ")}`);
        console.warn(`[fetch-market-data] Missing quotes for: ${stillMissing.join(", ")}`);
      }

      if (freshCount === 0 && stockData.cacheTimestamp) {
        results.push(`Stocks: served cached data from ${stockData.cacheTimestamp}`);
      } else {
        results.push(`Stocks: refreshed ${stocksUpdated}/${stockRows.length} prices${fallbackCount > 0 ? `, using cache for ${fallbackCount}` : ""}`);
      }
      console.log(`[fetch-market-data] Stocks source=${stockData.source}, refreshed=${stocksUpdated}, cacheFallback=${fallbackCount}, usedCache=${stockData.fallback}`);
      stockWriteErrors = writeFailures.length;
      stockRunReport = {
        status: stockWriteErrors ? "partial_failure"
          : fallbackCount || stillMissing.length || (stockData.fallbackDiagnostics && stockData.fallbackDiagnostics.status !== "available")
          ? "degraded" : "complete",
        tracked: stockRows.length,
        refreshed: stocksUpdated,
        history_written: historyUpdated,
        cache_count: fallbackCount,
        missing: stillMissing,
        write_failures: writeFailures,
        official_fallback: stockData.fallbackDiagnostics ?? { status: "not_requested" },
      };
      console.info("[fetch-market-data] Stock run summary", stockRunReport);
    }
    } // end shouldFetchStocks

    // ── 4. Fetch All Funds (MMFs, Fixed Income, Balanced, Equity from Serrari Group) ──
    let fundSyncError: string | null = null;
    if (shouldFetchFunds) {
      try {
        const serrari = await fetchSerrariAllFundsData();
        results.push(...serrari.notes);

        const { data: existingFunds, error: fundsReadError } = await supabase
          .from("funds")
          .select("id, slug, annual_yield, daily_yield, management_fee, minimum_investment, yield_unit, fact_sheet_date, fund_type, is_published");

        if (fundsReadError) {
          throw new Error(`Funds read failed: ${fundsReadError.message}`);
        }

        const bySlug = new Map<
          string,
          {
            id: string;
            slug: string;
            annual_yield: number;
            daily_yield: number;
            management_fee: number;
            minimum_investment: number;
            yield_unit: string;
            fact_sheet_date: string | null;
          }
        >();
        for (const f of existingFunds || []) {
          bySlug.set(String(f.slug).toLowerCase(), {
            id: f.id,
            slug: f.slug,
            annual_yield: Number(f.annual_yield ?? 0),
            daily_yield: Number(f.daily_yield ?? 0),
            management_fee: Number(f.management_fee ?? 0),
            minimum_investment: Number(f.minimum_investment ?? 0),
            yield_unit: String(f.yield_unit ?? "%"),
            fact_sheet_date: f.fact_sheet_date ?? null,
          });
        }

        const verifiedGroups = getVerifiedSourceGroups(serrari.rows, bySlug);

        if (dryRun) {
          const seen = new Set<string>();
          const rows = serrari.rows.map((row) => {
            const key = row.slug.toLowerCase();
            seen.add(key);
            const existing = bySlug.get(key);
            if (!existing) {
              return { slug: row.slug, name: row.name, fund_type: row.fund_type, currency: row.currency, status: "would_create", source_annual: row.annual_yield, source_daily: row.daily_yield, source_as_of: row.asOfDate, db_annual: null, db_daily: null, db_fact_sheet_date: null, drift_pct: null };
            }
            const prevAnnual = existing.annual_yield;
            const driftPct = prevAnnual > 0 ? Math.abs((row.annual_yield - prevAnnual) / prevAnnual) * 100 : 0;
            const metricsChanged = hasFundMetricsChanged(existing, row);
            const dateAdvance = !metricsChanged && shouldAdvanceFlatFundDate(existing, row, verifiedGroups);
            const status = metricsChanged
              ? !allowHighDrift && prevAnnual > 0 && driftPct > 25
                ? "drift_blocked"
                : "would_update"
              : dateAdvance
              ? "date_only"
              : "unchanged";
            return {
              slug: row.slug, name: row.name, fund_type: row.fund_type, currency: row.currency, status,
              source_annual: row.annual_yield, source_daily: row.daily_yield,
              source_as_of: row.asOfDate,
              db_annual: existing.annual_yield, db_daily: existing.daily_yield,
              db_fact_sheet_date: existing.fact_sheet_date,
              drift_pct: Math.round(driftPct * 100) / 100,
            };
          });
          const missingFromSource = (existingFunds || [])
            .filter((f) => f.fund_type === "money_market" && f.is_published !== false && !seen.has(String(f.slug).toLowerCase()))
            .map((f) => ({ slug: f.slug, db_annual: Number(f.annual_yield ?? 0), db_fact_sheet_date: f.fact_sheet_date ?? null }));
          fundInspection = { source_as_of: serrari.asOfDate, notes: serrari.notes, rows, missing_from_source: missingFromSource };
          results.push(`Funds dry run: ${rows.length} source rows inspected, nothing written`);
        } else {
        let updatedFundCount = 0;
        let createdFundCount = 0;
        let unchangedFundCount = 0;
        let dateVerifiedFundCount = 0;
        let skippedDriftCount = 0;
        const changedFunds: Array<{
          fund_id: string;
          slug: string;
          prev_annual: number;
          new_annual: number;
          prev_daily: number;
          new_daily: number;
        }> = [];
        const nowIso = new Date().toISOString();

        for (const row of serrari.rows) {
          const rowDate = row.asOfDate || serrari.asOfDate;
          const existing = bySlug.get(row.slug.toLowerCase());
          if (existing) {
            if (!hasFundMetricsChanged(existing, row)) {
              unchangedFundCount++;
              if (shouldAdvanceFlatFundDate(existing, row, verifiedGroups)) {
                const { error: dateUpdErr } = await supabase
                  .from("funds")
                  .update({ fact_sheet_date: rowDate })
                  .eq("id", existing.id);
                if (!dateUpdErr) {
                  dateVerifiedFundCount++;
                  await supabase.from("fund_yield_snapshots").upsert(
                    {
                      fund_id: existing.id,
                      annual_yield: row.annual_yield,
                      daily_yield: row.daily_yield,
                      snapshot_date: rowDate,
                    },
                    { onConflict: "fund_id,snapshot_date" },
                  );
                }
              }
              continue;
            }

            const prevAnnual = existing.annual_yield;
            const driftPct = prevAnnual > 0
              ? Math.abs((row.annual_yield - prevAnnual) / prevAnnual) * 100
              : 0;

            if (!allowHighDrift && prevAnnual > 0 && driftPct > 25) {
              skippedDriftCount++;
              results.push(`Fund skipped (>25% drift): ${row.slug} (${prevAnnual} -> ${row.annual_yield})`);
              continue;
            }

            const { error: updErr } = await supabase
              .from("funds")
              .update({
                annual_yield: row.annual_yield,
                daily_yield: row.daily_yield,
                yield_unit: row.yield_unit,
                minimum_investment: row.minimum_investment,
                management_fee: row.management_fee,
                fact_sheet_date: rowDate,
                updated_at: nowIso,
              })
              .eq("id", existing.id);

            if (!updErr) {
              updatedFundCount++;
              changedFunds.push({
                fund_id: existing.id,
                slug: row.slug,
                prev_annual: existing.annual_yield,
                new_annual: row.annual_yield,
                prev_daily: existing.daily_yield,
                new_daily: row.daily_yield,
              });
              await supabase.from("fund_yield_snapshots").upsert(
                {
                  fund_id: existing.id,
                  annual_yield: row.annual_yield,
                  daily_yield: row.daily_yield,
                  snapshot_date: rowDate,
                },
                { onConflict: "fund_id,snapshot_date" },
              );
            }
          } else {
            // Auto-create new fund discovered on Serrari
            const catDesc = row.fund_type === "money_market"
              ? "short-term money market instruments including Kenyan Treasury bills, fixed deposits, and commercial paper"
              : row.fund_type === "fixed_income" || row.fund_type === "bond"
              ? "fixed income securities, government Treasury bonds, and corporate debt"
              : row.fund_type === "balanced"
              ? "a balanced portfolio of equities and fixed income securities"
              : "listed equities on the Nairobi Securities Exchange (NSE)";

            const description = `The ${row.name} is a CMA-regulated collective investment scheme managed by ${row.manager}, investing in ${catDesc}.`;

            const { data: inserted, error: insErr } = await supabase
              .from("funds")
              .insert({
                slug: row.slug,
                name: row.name,
                manager: row.manager,
                fund_type: row.fund_type,
                yield_unit: row.yield_unit,
                annual_yield: row.annual_yield,
                daily_yield: row.daily_yield,
                seven_day_yield: 0,
                thirty_day_yield: 0,
                minimum_investment: row.minimum_investment,
                management_fee: row.management_fee,
                withdrawal_time: row.withdrawal_time,
                website: row.website,
                fact_sheet_date: rowDate,
                cma_licensed: true,
                is_published: true,
                description,
                updated_at: nowIso,
              })
              .select("id")
              .maybeSingle();

            if (!insErr && inserted?.id) {
              createdFundCount++;
              changedFunds.push({
                fund_id: inserted.id,
                slug: row.slug,
                prev_annual: 0,
                new_annual: row.annual_yield,
                prev_daily: 0,
                new_daily: row.daily_yield,
              });
              await supabase.from("fund_yield_snapshots").upsert(
                {
                  fund_id: inserted.id,
                  annual_yield: row.annual_yield,
                  daily_yield: row.daily_yield,
                  snapshot_date: rowDate,
                },
                { onConflict: "fund_id,snapshot_date" },
              );
            }
          }
        }

        // Always record that a verification check ran, but only advance last_update_date & log changes when data actually changed
        await supabase
          .from("section_live_status")
          .upsert(
            {
              section_key: "funds",
              is_live: true,
              last_verified_at: nowIso,
              ...(updatedFundCount > 0 || createdFundCount > 0 ? { updated_at: nowIso } : {}),
            },
            { onConflict: "section_key" },
          );

        if (updatedFundCount > 0 || createdFundCount > 0) {
          // Keep site_pages (slug = 'live-status') in sync ONLY when at least one fund actually updated
          const { data: liveStatusPage } = await supabase
            .from("site_pages")
            .select("meta")
            .eq("slug", "live-status")
            .maybeSingle();

          if (liveStatusPage) {
            const prevMeta = (liveStatusPage.meta as Record<string, unknown>) ?? {};
            const prevSections = (prevMeta.sections as Record<string, Record<string, unknown>>) ?? {};
            const nextMeta = {
              ...prevMeta,
              last_update_date: serrari.asOfDate,
              sections: {
                ...prevSections,
                funds: {
                  ...(prevSections.funds ?? {}),
                  is_live: true,
                  last_update_date: serrari.asOfDate,
                },
              },
            };
            await supabase
              .from("site_pages")
              .update({ meta: nextMeta, updated_at: nowIso })
              .eq("slug", "live-status");
          }

          const { error: logErr } = await supabase.from("change_log").insert({
            entity_type: "fund",
            entity_id: changedFunds[0]?.fund_id ?? null,
            action: "serrari_funds_sync",
            new_values: {
              as_of_date: serrari.asOfDate,
              updated_count: updatedFundCount,
              created_count: createdFundCount,
              unchanged_count: unchangedFundCount,
              date_verified_count: dateVerifiedFundCount,
              changed_funds: changedFunds,
            },
          });
          if (logErr) {
            console.error("[fetch-market-data] Failed to write to change_log:", logErr);
          }
        }

        results.push(
          `Funds (Serrari ${serrari.asOfDate}): updated ${updatedFundCount}, created ${createdFundCount}, unchanged ${unchangedFundCount} (${dateVerifiedFundCount} date-verified), drift-skipped ${skippedDriftCount}`,
        );
        } // end !dryRun
      } catch (fundErr) {
        const msg = fundErr instanceof Error ? fundErr.message : String(fundErr);
        fundSyncError = msg;
        console.error("[fetch-market-data] Serrari funds sync failed:", msg);
        results.push(`Funds sync failed: ${msg}`);
      }
    } // end shouldFetchFunds

    if (quoteObservations.length) {
      const { error: observationsError } = await supabase
        .from("portfolio_market_quote_observations")
        .insert(quoteObservations);
      if (observationsError) {
        console.error("[fetch-market-data] Quote observation write failed", { code: observationsError.code });
      } else {
        results.push(`Recorded ${quoteObservations.length} portfolio quote observations`);
      }
    }

    const hasErrors = stockWriteErrors > 0 || (shouldFetchFunds && fundSyncError !== null);
    const completion = stockWriteErrors ? "Completed with stock write errors"
      : fundSyncError ? `Completed with fund sync error: ${fundSyncError}`
      : stockRunReport?.status === "degraded" ? "Completed with degraded stock data" : "Completed successfully";
    console.log(`[fetch-market-data] ${completion}: ${results.length} operations`);
    return new Response(JSON.stringify({
      success: !hasErrors,
      results,
      ...(fundSyncError ? { fund_error: fundSyncError } : {}),
      ...(stockRunReport ? { stocks: stockRunReport } : {}),
      ...(stockInspection ? { stock_inspection: stockInspection } : {}),
      ...(fundInspection ? { fund_inspection: fundInspection } : {}),
    }), {
      status: hasErrors ? 500 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[fetch-market-data] FATAL error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
