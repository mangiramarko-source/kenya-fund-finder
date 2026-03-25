import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ExchangeRate-API free endpoint (no key needed)
const FX_API = "https://open.er-api.com/v6/latest/KES";

// CoinGecko free API for crypto prices
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Yahoo Finance v8 quote endpoint
const YAHOO_QUOTE_API = "https://query1.finance.yahoo.com/v8/finance/chart/";

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

async function fetchYahooQuote(ticker: string): Promise<{
  price: number;
  previousClose: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  marketCap: number | null;
  yearHigh: number | null;
  yearLow: number | null;
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
    if (!res.ok) return null;
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
      marketCap: null, // not available in chart endpoint
      yearHigh: meta.fiftyTwoWeekHigh ?? null,
      yearLow: meta.fiftyTwoWeekLow ?? null,
    };
  } catch (e) {
    console.error(`Yahoo Finance error for ${ticker}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authentication: require either a valid admin user or an anon/service-role JWT (cron job)
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  // Check if this is a service-level call (cron job via pg_net sends anon key as JWT)
  // Decode the JWT payload to check the role claim
  let isCronCall = false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // If the role is "anon" or "service_role", it's a system call not a user call
    if (payload.role === "anon" || payload.role === "service_role") {
      isCronCall = true;
    }
  } catch { /* not a valid JWT, will fall through to user auth */ }

  if (!isCronCall) {
    // Verify the caller is an authenticated admin
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const results: string[] = [];

  try {
    // ── 1. Fetch FX rates ──
    const fxRes = await fetch(FX_API);
    let kesRates: Record<string, number> = {};
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      kesRates = fxData.rates || {};

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
    } else {
      results.push(`FX API returned non-OK status`);
    }

    // ── 2. Fetch commodity prices ──
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

    // ── 3. Fetch Kenyan stock prices from Yahoo Finance ──
    const { data: stockRows } = await supabase
      .from("stocks")
      .select("id, symbol, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low")
      .eq("is_active", true);

    if (stockRows && stockRows.length > 0) {
      let stocksUpdated = 0;
      for (const row of stockRows) {
        const yahooTicker = NSE_YAHOO_MAP[(row.symbol || "").toUpperCase()];
        if (!yahooTicker) continue;

        const quote = await fetchYahooQuote(yahooTicker);
        if (!quote || quote.price <= 0) continue;

        // Only update if price actually changed
        if (quote.price !== Number(row.price)) {
          const updateData: Record<string, unknown> = {
            previous_price: row.price,
            price: quote.price,
            day_change: quote.dayChange,
            day_change_percent: quote.dayChangePct,
            updated_at: new Date().toISOString(),
          };
          if (quote.volume > 0) updateData.volume = quote.volume;
          if (quote.yearHigh != null) updateData.year_high = quote.yearHigh;
          if (quote.yearLow != null) updateData.year_low = quote.yearLow;

          await supabase.from("stocks").update(updateData).eq("id", row.id);
          results.push(`Stock ${row.symbol}: ${row.price} → ${quote.price} (${quote.dayChangePct > 0 ? "+" : ""}${quote.dayChangePct}%)`);
          stocksUpdated++;
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 300));
      }
      results.push(`Stocks: updated ${stocksUpdated}/${stockRows.length}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-market-data error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
