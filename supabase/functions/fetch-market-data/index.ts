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
// For gold/silver/oil we use exchange rate trick: XAU, XAG are ISO currency codes
const PRECIOUS_METALS: Record<string, string> = {
  XAU: "gold",
  GOLD: "gold",
  XAG: "silver",
  SILVER: "silver",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      results.push(`FX API error: ${fxRes.status}`);
    }

    // ── 2. Fetch commodity prices ──
    const { data: commodityRows } = await supabase
      .from("commodities")
      .select("id, symbol, name, price, unit");

    if (commodityRows && commodityRows.length > 0) {
      // Separate crypto vs precious metals vs other
      const cryptoItems: typeof commodityRows = [];
      const metalItems: typeof commodityRows = [];
      const otherItems: typeof commodityRows = [];

      for (const c of commodityRows) {
        const sym = (c.symbol || "").toUpperCase();
        if (CRYPTO_MAP[sym]) {
          cryptoItems.push(c);
        } else if (PRECIOUS_METALS[sym]) {
          metalItems.push(c);
        } else {
          otherItems.push(c);
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
            results.push(`CoinGecko error: ${cgRes.status}`);
          }
        } catch (e) {
          results.push(`CoinGecko fetch error: ${(e as Error).message}`);
        }
      }

      // ── 2b. Precious metals via FX rates (XAU, XAG are ISO currency codes) ──
      // open.er-api returns rates FROM KES, so XAU rate = how many XAU per 1 KES
      // Price of gold in USD = (USD per KES) / (XAU per KES)
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

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-market-data error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
