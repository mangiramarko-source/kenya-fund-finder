import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Yahoo Finance v8 quote endpoint
const YAHOO_QUOTE_API = "https://query1.finance.yahoo.com/v8/finance/chart/";

const NSE_MARKET_STATS_PAGE = "https://www.nse.co.ke/dataservices/market-statistics/";
const NSE_MARKET_STATS_AJAX = "https://www.nse.co.ke/dataservices/wp-admin/admin-ajax.php";

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

// NSE stock symbols → Yahoo Finance tickers (.NR suffix for Nairobi)
const NSE_YAHOO_MAP: Record<string, string> = {
  SCOM: "SCOM.NBO", EQTY: "EQTY.NBO", KCB: "KCB.NBO", COOP: "COOP.NBO",
  ABSA: "ABSA.NBO", EABL: "EABL.NBO", BAT: "BAT.NBO", KNRE: "KNRE.NBO",
  KPLC: "KPLC.NBO", BAMB: "BAMB.NBO", SASN: "SASN.NBO", TOTL: "TOTL.NBO",
  NCBA: "NCBA.NBO", SCBK: "SCBK.NBO", SBIC: "SBIC.NBO", IMH: "IMH.NBO",
  KEGN: "KEGN.NBO", BKG: "BKG.NBO", DTK: "DTK.NBO", BRIT: "BRIT.NBO",
  JUB: "JUB.NBO", KQ: "KQ.NBO", HFCK: "HFCK.NBO", CIC: "CIC.NBO",
  CTUM: "CTUM.NBO", KUKZ: "KUKZ.NBO", CRWN: "CRWN.NBO", PORT: "PORT.NBO",
  CARB: "CARB.NBO", NSE20: "NSE.NBO", CGEN: "CGEN.NBO", LBTY: "LBTY.NBO",
  WTK: "WTK.NBO", SMER: "SMER.NBO", TPSE: "TPSE.NBO", KAPC: "KAPC.NBO",
  NMG: "NMG.NBO", BOC: "BOC.NBO", UNGA: "UNGA.NBO", SLAM: "SLAM.NBO",
  TCL: "TCL.NBO", LKL: "LKL.NBO", SGL: "SGL.NBO", KPC: "KPC.NBO",
  UMME: "UMME.NBO",
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

async function fetchNseStockQuotes(): Promise<Record<string, {
  price: number;
  previousPrice: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
}>> {
  console.log("[fetch-market-data] Fetching NSE market statistics page...");
  const nseHeaders: Record<string, string> = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };
  const pageRes = await fetch(NSE_MARKET_STATS_PAGE, { headers: nseHeaders });
  if (!pageRes.ok) {
    console.error(`[fetch-market-data] NSE page fetch failed: ${pageRes.status} ${pageRes.statusText}`);
    throw new Error(`NSE market stats page failed: ${pageRes.status}`);
  }

  const pageHtml = await pageRes.text();
  const nonce = pageHtml.match(/"ajaxnonce":"([^"]+)"/)?.[1];
  if (!nonce) {
    console.error("[fetch-market-data] NSE ajax nonce not found in page HTML (length: " + pageHtml.length + ")");
    throw new Error("NSE ajax nonce not found");
  }
  console.log(`[fetch-market-data] NSE nonce found, fetching ${[...new Set(Object.values(NSE_SECTOR_MAP))].length} sectors...`);

  const sectorRows = new Map<string, Array<{ company: string; price: number; changePct: number; volume: number }>>();
  const sectors = [...new Set(Object.values(NSE_SECTOR_MAP))];

  for (const sector of sectors) {
    const body = new URLSearchParams({
      action: "display_prices",
      security: nonce,
      sector,
    });

    const response = await fetch(NSE_MARKET_STATS_AJAX, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "text/html, */*",
        "Referer": NSE_MARKET_STATS_PAGE,
      },
      body: body.toString(),
    });

    if (!response.ok) continue;

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rows = [...(doc?.querySelectorAll("tr") || [])]
      .map((tr) => [...tr.querySelectorAll("th, td")].map((cell) => cell.textContent?.trim() || ""))
      .filter((cells) => cells.length >= 5 && cells[0] !== "Company")
      .map((cells) => ({
        company: cells[0],
        volume: Number(cells[2].replace(/,/g, "")) || 0,
        price: Number(cells[3].replace(/,/g, "")) || 0,
        changePct: Number(cells[4].replace(/,/g, "")) || 0,
      }))
      .filter((row) => row.company && row.price > 0);

    sectorRows.set(sector, rows);
  }

  const quotes: Record<string, { price: number; previousPrice: number; dayChange: number; dayChangePct: number; volume: number }> = {};

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

    quotes[symbol] = {
      price: Number(row.price.toFixed(2)),
      previousPrice,
      dayChange,
      dayChangePct: Number(row.changePct.toFixed(2)),
      volume: row.volume,
    };
  }

  return quotes;
}

async function fetchYahooQuote(ticker: string): Promise<{
  price: number;
  previousClose: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  marketCap: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  peRatio: number | null;
  dividendYield: number | null;
} | null> {
  try {
    const res = await fetch(
      `${YAHOO_QUOTE_API}${ticker}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; KenyaFundFinder/1.0)",
        },
      }
    );
    if (!res.ok) {
      console.error(`Yahoo Finance ${ticker}: HTTP ${res.status}`);
      await res.text();
      return null;
    }
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
    const dayChange = price - previousClose;
    const dayChangePct = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

    return {
      price: parseFloat(price.toFixed(2)),
      previousClose: parseFloat(previousClose.toFixed(2)),
      dayChange: parseFloat(dayChange.toFixed(2)),
      dayChangePct: parseFloat(dayChangePct.toFixed(2)),
      volume: meta.regularMarketVolume ?? 0,
      marketCap: meta.marketCap ?? null,
      yearHigh: meta.fiftyTwoWeekHigh ?? null,
      yearLow: meta.fiftyTwoWeekLow ?? null,
      peRatio: meta.trailingPE ?? null,
      dividendYield: meta.dividendYield ?? null,
    };
  } catch (e) {
    console.error(`Yahoo Finance error for ${ticker}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authentication: allow cron jobs (via service role or anon JWT) and admin users
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  // Check if this is a service-level / cron call
  let isCronCall = false;
  
  // Method 1: Check for cron secret in body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* no body is fine */ }
  
  const cronSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (body?.cron_secret === cronSecret && cronSecret) {
    isCronCall = true;
    console.log("[fetch-market-data] Cron call authenticated via secret");
  }

  // Method 2: Check JWT role claim (anon/service_role from pg_net)
  if (!isCronCall) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.role === "anon" || payload.role === "service_role") {
          isCronCall = true;
          console.log(`[fetch-market-data] Cron call detected (role: ${payload.role})`);
        }
      }
    } catch {
      // Not a standard JWT
    }
  }

  // Method 3: Check getClaims for authenticated admin user
  if (!isCronCall) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[fetch-market-data] Auth failed:", claimsError?.message || "no claims");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      console.error("[fetch-market-data] User is not admin:", userId);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[fetch-market-data] Admin user authenticated:", userId);
  }

  const fetchType = (body as Record<string, unknown>)?.fetch_type as string | undefined;
  const results: string[] = [];
  console.log(`[fetch-market-data] Starting data fetch cycle... (type: ${fetchType || "all"})`);

  const shouldFetchFx = !fetchType || fetchType === "fx";
  const shouldFetchCommodities = !fetchType || fetchType === "commodities";
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
      const metalItems: typeof commodityRows = [];

      for (const c of commodityRows) {
        const sym = (c.symbol || "").toUpperCase();
        if (CRYPTO_MAP[sym]) {
          cryptoItems.push(c);
        } else if (PRECIOUS_METALS[sym]) {
          metalItems.push(c);
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

      // ── 2b. Precious metals via FX rates ──
      if (metalItems.length > 0 && Object.keys(kesRates).length > 0) {
        const usdPerKes = kesRates["USD"] || 0;
        const metalFxMap: Record<string, string> = {
          XAU: "XAU", GOLD: "XAU",
          XAG: "XAG", SILVER: "XAG",
        };

        for (const row of metalItems) {
          const sym = (row.symbol || "").toUpperCase();
          const fxCode = metalFxMap[sym];
          const metalRate = fxCode ? kesRates[fxCode] : undefined;

          if (metalRate && metalRate > 0 && usdPerKes > 0) {
            const priceUsd = parseFloat((usdPerKes / metalRate).toFixed(2));
            if (priceUsd !== row.price) {
              await supabase
                .from("commodities")
                .update({
                  previous_price: row.price,
                  price: priceUsd,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", row.id);
              results.push(`Metal ${row.symbol}: ${row.price} → ${priceUsd}`);
            }
          }
        }
      }

      results.push(`Commodities: processed ${commodityRows.length} items`);
    }
    } // end shouldFetchCommodities

    // ── 3. Fetch Kenyan stock prices (RapidAPI NSE primary, Yahoo fallback) ──
    if (shouldFetchStocks) {
    const { data: stockRows } = await supabase
      .from("stocks")
      .select("id, symbol, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low")
      .eq("is_active", true);

    if (stockRows && stockRows.length > 0) {
      let stocksUpdated = 0;
      const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

      // Build a lookup from RapidAPI NSE data
      let rapidApiQuotes: Map<string, { price: number; change: string; volume: number }> = new Map();

      if (rapidApiKey) {
        try {
          const nseRes = await fetch("https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks", {
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": "nairobi-stock-exchange-nse.p.rapidapi.com",
              "x-rapidapi-key": rapidApiKey,
            },
          });

          if (nseRes.ok) {
            const nseData = await nseRes.json();
            const stocks = nseData?.data || [];
            for (const s of stocks) {
              const ticker = (s.ticker || "").toUpperCase();
              const price = parseFloat((s.price || "0").replace(/,/g, ""));
              const volume = parseInt((s.volume || "0").replace(/,/g, ""), 10) || 0;
              if (ticker && price > 0) {
                rapidApiQuotes.set(ticker, { price, change: s.change || "0", volume });
              }
            }
            console.log(`[fetch-market-data] RapidAPI NSE: ${rapidApiQuotes.size} stocks fetched`);
          } else {
            console.error(`[fetch-market-data] RapidAPI NSE failed: ${nseRes.status}`);
            await nseRes.text();
          }
        } catch (e) {
          console.error("[fetch-market-data] RapidAPI NSE error:", e);
        }
      } else {
        console.warn("[fetch-market-data] RAPIDAPI_KEY not set, skipping RapidAPI");
      }

      // Update stocks from RapidAPI data
      for (const row of stockRows) {
        const sym = (row.symbol || "").toUpperCase();
        const quote = rapidApiQuotes.get(sym);

        if (quote && quote.price > 0) {
          // Parse change value (e.g. "+0.25" or "-3.25")
          const changeStr = (quote.change || "0").replace(/\(.*\)/, "").trim();
          const dayChange = parseFloat(changeStr) || 0;
          const previousPrice = parseFloat((quote.price - dayChange).toFixed(2));
          const dayChangePct = previousPrice > 0 ? parseFloat(((dayChange / previousPrice) * 100).toFixed(2)) : 0;

          const updateData: Record<string, unknown> = {
            previous_price: previousPrice,
            price: quote.price,
            day_change: dayChange,
            day_change_percent: dayChangePct,
            updated_at: new Date().toISOString(),
          };
          if (quote.volume > 0) updateData.volume = quote.volume;

          await supabase.from("stocks").update(updateData).eq("id", row.id);
          stocksUpdated++;
        }
      }

      // Yahoo Finance: price fallback for missing stocks + fundamentals enrichment for ALL stocks
      console.log(`[fetch-market-data] Running Yahoo Finance enrichment for fundamentals...`);
      let yahooEnriched = 0;
      for (const row of stockRows) {
        const sym = (row.symbol || "").toUpperCase();
        const yahooTicker = NSE_YAHOO_MAP[sym];
        if (!yahooTicker) continue;

        const wasUpdatedByRapid = rapidApiQuotes.has(sym);

        try {
          const yq = await fetchYahooQuote(yahooTicker);
          if (!yq || yq.price <= 0) continue;

          const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };

          // If RapidAPI didn't update this stock, use Yahoo for price data too
          if (!wasUpdatedByRapid) {
            updateData.previous_price = yq.previousClose;
            updateData.price = yq.price;
            updateData.day_change = yq.dayChange;
            updateData.day_change_percent = yq.dayChangePct;
            if (yq.volume > 0) updateData.volume = yq.volume;
            stocksUpdated++;
          }

          // Always enrich with fundamentals from Yahoo (fields RapidAPI doesn't have)
          if (yq.yearHigh) updateData.year_high = yq.yearHigh;
          if (yq.yearLow) updateData.year_low = yq.yearLow;
          if (yq.marketCap) updateData.market_cap = yq.marketCap;
          if (yq.peRatio) updateData.pe_ratio = yq.peRatio;
          if (yq.dividendYield) updateData.dividend_yield = yq.dividendYield;

          await supabase.from("stocks").update(updateData).eq("id", row.id);
          yahooEnriched++;
        } catch (e) {
          console.error(`[fetch-market-data] Yahoo failed for ${sym}:`, e);
        }
      }

      results.push(`Stocks: ${stocksUpdated}/${stockRows.length} prices, Yahoo enriched ${yahooEnriched}`);
      console.log(`[fetch-market-data] Stocks: ${stocksUpdated}/${stockRows.length} prices, Yahoo enriched ${yahooEnriched}`);
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
