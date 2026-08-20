import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-keys.ts";

const allowedOrigins = [
  "https://kenya-fund-finder.lovable.app",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const matched = allowedOrigins.find((o) => origin.startsWith(o));
  return {
    "Access-Control-Allow-Origin": matched || "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// ExchangeRate-API free endpoint (no key needed)
const FX_API = "https://open.er-api.com/v6/latest/KES";

// CoinGecko free API for crypto prices
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

const RAPIDAPI_STOCKS_API = "https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks";
const NSE_MARKET_STATS_PAGE = "https://www.nse.co.ke/dataservices/market-statistics/";
const NSE_MARKET_STATS_AJAX = "https://www.nse.co.ke/dataservices/wp-admin/admin-ajax.php";
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
  KPLC: ["kenya power lighting", "kenya power"],
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

type StockQuoteSource = "primary" | "secondary" | "cache";

type StockQuote = {
  price: number;
  previousPrice: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  source: StockQuoteSource;
  asOfDate: string | null;
};

type StockCacheRow = {
  id: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  year_high: number | null;
  year_low: number | null;
  updated_at: string;
};

type StockDataResult = {
  quotes: Map<string, StockQuote>;
  source: "primary" | "secondary" | "cache" | "mixed";
  fallback: boolean;
  cacheTimestamp: string | null;
  notes: string[];
};

const NSE_XHR_SECTORS = [...new Set(Object.values(NSE_SECTOR_MAP))];
const MONTH_NUMBERS: Record<string, string> = {
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  return cleaned ? Number.parseFloat(cleaned) || 0 : 0;
}

function parseInteger(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d-]/g, "").trim();
  return cleaned ? Number.parseInt(cleaned, 10) || 0 : 0;
}

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

async function fetchRapidApiStockQuotes(rapidApiKey: string) {
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

    const payload = await response.json() as { data?: Array<Record<string, unknown>> };
    const quotes = new Map<string, StockQuote>();

    for (const stock of payload.data || []) {
      const ticker = String(stock.ticker || "").toUpperCase();
      const price = parseNumber(stock.price as string | number | null | undefined);
      const volume = parseInteger(stock.volume as string | number | null | undefined);
      if (!ticker || price <= 0) continue;

      const changeValue = String(stock.change || "0").replace(/\(.*\)/, "").trim();
      const dayChange = parseNumber(changeValue);
      const previousPrice = Number((price - dayChange).toFixed(2));
      const dayChangePct = previousPrice > 0
        ? Number(((dayChange / previousPrice) * 100).toFixed(2))
        : 0;

      quotes.set(ticker, {
        price: Number(price.toFixed(2)),
        previousPrice,
        dayChange: Number(dayChange.toFixed(2)),
        dayChangePct,
        volume,
        source: "primary",
        asOfDate: null,
      });
    }

    return {
      quotes,
      note: `Primary API fetched ${quotes.size} stocks`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      quotes: new Map<string, StockQuote>(),
      note: `Primary API failed: ${message}`,
    };
  }
}

function parseNseSnapshotDate(html: string) {
  const match = html.match(/Statistics as of\s+(\d{2})-([A-Za-z]{3})-(\d{4})/i);
  if (!match) return null;

  const [, day, monthName, year] = match;
  const month = MONTH_NUMBERS[monthName.toLowerCase()];
  return month ? `${year}-${month}-${day}` : null;
}

function parseNseQuoteRows(html: string) {
  const rows: Array<{ company: string; price: number; changePct: number; volume: number }> = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const trHtml = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trHtml)) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, "").trim();
      cells.push(text);
    }
    
    if (cells.length >= 5) {
      const company = cells[0];
      const volume = parseInteger(cells[2]);
      const price = parseNumber(cells[3]);
      const changePct = parseNumber(cells[4]);
      if (company && price > 0) {
        rows.push({ company, volume, price, changePct });
      }
    }
  }
  return rows;
}

async function fetchNseXhrStockQuotes() {
  const sectorRows = new Map<string, Array<{ company: string; price: number; changePct: number; volume: number }>>();
  let snapshotDate: string | null = null;

  const responses = await Promise.all(
    NSE_XHR_SECTORS.map(async (sector) => {
      try {
        const response = await fetchWithRetry(
          NSE_MARKET_STATS_AJAX,
          {
            method: "POST",
            headers: {
              ...STOCK_REQUEST_HEADERS,
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "Referer": NSE_MARKET_STATS_PAGE,
            },
            body: new URLSearchParams({
              action: "display_prices",
              sector,
            }).toString(),
          },
          2,
        );

        return { sector, html: await response.text() };
      } catch (error) {
        console.error(`[fetch-market-data] NSE XHR failed for sector ${sector}:`, error);
        return { sector, html: "" };
      }
    }),
  );

  for (const { sector, html } of responses) {
    if (!html) continue;
    snapshotDate = snapshotDate || parseNseSnapshotDate(html);

    const rows = parseNseQuoteRows(html);
    if (rows.length > 0) {
      sectorRows.set(sector, rows);
    }
  }

  const quotes = new Map<string, StockQuote>();

  for (const [symbol, sector] of Object.entries(NSE_SECTOR_MAP)) {
    const patterns = NSE_SYMBOL_PATTERNS[symbol] || [symbol.toLowerCase()];
    const row = (sectorRows.get(sector) || []).find((entry) => {
      const normalizedCompany = normalizeText(entry.company);
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
    });
  }

  return {
    quotes,
    note: `NSE XHR fetched ${quotes.size} stocks${snapshotDate ? ` (${snapshotDate})` : ""}`,
  };
}

function getQuoteSource(quotes: Map<string, StockQuote>) {
  const sources = new Set(Array.from(quotes.values(), (quote) => quote.source));
  if (sources.size > 1) return "mixed" as const;
  if (sources.has("primary")) return "primary" as const;
  if (sources.has("secondary")) return "secondary" as const;
  return "cache" as const;
}

async function getStockData(stockRows: StockCacheRow[]): Promise<StockDataResult> {
  const quotes = new Map<string, StockQuote>();
  const notes: string[] = [];
  const cachedQuotes = buildCachedStockQuotes(stockRows);
  const cacheTimestamp = getLatestCacheTimestamp(stockRows);
  const stockSymbols = stockRows
    .map((row) => (row.symbol || "").toUpperCase())
    .filter(Boolean);

  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
  if (rapidApiKey) {
    const primary = await fetchRapidApiStockQuotes(rapidApiKey);
    notes.push(primary.note);
    primary.quotes.forEach((quote, symbol) => quotes.set(symbol, quote));
  } else {
    notes.push("Primary API key missing");
  }

  const missingAfterPrimary = stockSymbols.filter((symbol) => !quotes.has(symbol));
  if (missingAfterPrimary.length > 0) {
    const secondary = await fetchNseXhrStockQuotes();
    notes.push(secondary.note);

    for (const symbol of missingAfterPrimary) {
      const quote = secondary.quotes.get(symbol);
      if (quote) {
        quotes.set(symbol, quote);
      }
    }
  }

  const missingAfterSecondary = stockSymbols.filter((symbol) => !quotes.has(symbol));
  let cacheHits = 0;

  for (const symbol of missingAfterSecondary) {
    const cached = cachedQuotes.get(symbol);
    if (!cached) continue;
    quotes.set(symbol, cached);
    cacheHits++;
  }

  if (cacheHits > 0) {
    notes.push(`Cache supplied ${cacheHits} stocks${cacheTimestamp ? ` from ${cacheTimestamp}` : ""}`);
  }

  if (quotes.size === 0 && cachedQuotes.size > 0) {
    cachedQuotes.forEach((quote, symbol) => quotes.set(symbol, quote));
    notes.push(`All providers failed, serving cached data${cacheTimestamp ? ` from ${cacheTimestamp}` : ""}`);
  }

  return {
    quotes,
    source: getQuoteSource(quotes),
    fallback: Array.from(quotes.values()).some((quote) => quote.source === "cache"),
    cacheTimestamp,
    notes,
  };
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

  const fetchType = (body as Record<string, unknown>)?.fetch_type as string | undefined;
  const results: string[] = [];
  console.log(`[fetch-market-data] Starting data fetch cycle... (type: ${fetchType || "all"})`);

  const shouldFetchFx = !fetchType || fetchType === "fx";
  // The DB cron schedules 'fx' with the intent of fetching both FX and commodities every hour (lightweight)
  const shouldFetchCommodities = !fetchType || fetchType === "commodities" || fetchType === "fx";
  const shouldFetchStocks = !fetchType || fetchType === "stocks";

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
        }
      }

      results.push(`Commodities: processed ${commodityRows.length} items (crypto=${cryptoItems.length}, yahoo=${yahooItems.length})`);
    }
    } // end shouldFetchCommodities

    // ── 3. Fetch Kenyan stock prices (RapidAPI NSE primary, Yahoo fallback) ──
    if (shouldFetchStocks) {
    const { data: stockRows } = await supabase
      .from("stocks")
      .select("id, symbol, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low, updated_at")
      .eq("is_active", true);

    if (stockRows && stockRows.length > 0) {
      let stocksUpdated = 0;
      const stockData = await getStockData(stockRows as StockCacheRow[]);
      const fallbackCount = Array.from(stockData.quotes.values()).filter((quote) => quote.source === "cache").length;
      const freshCount = stockData.quotes.size - fallbackCount;

      results.push(...stockData.notes);

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

      // Update stocks from fresh data, falling back to cached DB values when providers fail
      for (const row of stockRows) {
        const sym = (row.symbol || "").toUpperCase();
        const quote = stockData.quotes.get(sym);

        if (quote && quote.price > 0) {
          if (quote.source === "cache") {
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

          const snapshotDate = quote.asOfDate || new Date().toISOString().split("T")[0];
          const updatedAt = new Date().toISOString();
          const updateData: Record<string, unknown> = {
            previous_price: quote.previousPrice,
            price: quote.price,
            day_change: quote.dayChange,
            day_change_percent: quote.dayChangePct,
            year_high: yearHigh,
            year_low: yearLow,
            updated_at: updatedAt,
          };
          if (quote.volume > 0) updateData.volume = quote.volume;

          await supabase.from("stocks").update(updateData).eq("id", row.id);
          await supabase
            .from("stock_price_history")
            .upsert(
              {
                stock_id: row.id,
                price: quote.price,
                snapshot_date: snapshotDate,
              },
              { onConflict: "stock_id,snapshot_date" }
            );
          stocksUpdated++;
        }
      }

      // Calculate Market Aggregates for today
      if (stocksUpdated > 0 || fallbackCount > 0) {
        let totalMarketCap = 0;
        let sumPE = 0;
        let countPE = 0;
        let advances = 0;
        let declines = 0;
        let unchanged = 0;

        for (const row of stockRows) {
          const sym = (row.symbol || "").toUpperCase();
          const quote = stockData.quotes.get(sym);
          const dayChange = quote?.dayChange ?? row.day_change;

          if (dayChange > 0) advances++;
          else if (dayChange < 0) declines++;
          else unchanged++;

          if (row.market_cap) totalMarketCap += row.market_cap;
          if (row.pe_ratio) {
            sumPE += row.pe_ratio;
            countPE++;
          }
        }

        const averagePE = countPE > 0 ? Number((sumPE / countPE).toFixed(2)) : 0;
        const snapshotDate = new Date().toISOString().split("T")[0];

        await supabase.from("market_summary_history").upsert(
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
        results.push(`Inserted daily market summary history for ${snapshotDate}`);
      }

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
    }
    } // end shouldFetchStocks

    console.log(`[fetch-market-data] Completed successfully: ${results.length} operations`);
    return new Response(JSON.stringify({ success: true, results }), {
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
