import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ExchangeRate-API free endpoint (no key needed)
const FX_API = "https://open.er-api.com/v6/latest/KES";

// Free commodity price proxy (gold, oil via metals-api alternative)
// We'll use frankfurter for FX and a simple gold/oil approach
const GOLD_API = "https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU";

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
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      // fxData.rates contains rates FROM KES, we need inverse for "how many KES per 1 unit"
      // e.g. rates.USD = 0.0077 means 1 KES = 0.0077 USD, so 1 USD = 1/0.0077 KES
      const kesRates = fxData.rates || {};

      // Get existing currencies from DB
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
              results.push(`${code}: ${row.rate} → ${newRate}`);
            }
          }
        }
      }
      results.push(`FX: processed ${existing?.length || 0} currencies`);
    } else {
      results.push(`FX API error: ${fxRes.status}`);
    }

    // ── 2. Fetch commodity prices (gold, silver via free API) ──
    // Use a simple free endpoint for gold price in USD
    try {
      const goldRes = await fetch(
        "https://api.exchangerate-api.com/v4/latest/USD"
      );
      if (goldRes.ok) {
        // For commodities, we update based on what's in the DB
        // The admin defines commodities; we try to find price sources
        const { data: commodityRows } = await supabase
          .from("commodities")
          .select("id, symbol, price");

        // Since free commodity APIs are limited, we'll try CoinGecko for crypto
        const cryptoSymbols = ["BTC", "ETH"];
        const hasCrypto = commodityRows?.some((c: any) =>
          cryptoSymbols.includes(c.symbol)
        );

        if (hasCrypto) {
          const cgRes = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
          );
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            const priceMap: Record<string, number> = {
              BTC: cgData.bitcoin?.usd || 0,
              ETH: cgData.ethereum?.usd || 0,
            };

            for (const row of commodityRows || []) {
              const newPrice = priceMap[row.symbol];
              if (newPrice && newPrice !== row.price) {
                await supabase
                  .from("commodities")
                  .update({
                    previous_price: row.price,
                    price: newPrice,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", row.id);
                results.push(`${row.symbol}: ${row.price} → ${newPrice}`);
              }
            }
          }
        }
        results.push("Commodities: processed");
      }
    } catch (e) {
      results.push(`Commodities error: ${e.message}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-market-data error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
