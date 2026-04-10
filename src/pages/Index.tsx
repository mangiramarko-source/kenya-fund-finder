import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Added robust HTML parsing for Deno/Supabase
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const allowedOrigins = ["https://kenya-fund-finder.lovable.app", "https://www.kenyafundfinder.com"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const matched = allowedOrigins.find((o) => origin.startsWith(o));
  return {
    "Access-Control-Allow-Origin": matched || "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const NSE_MARKET_STATS_PAGE = "https://www.nse.co.ke/dataservices/market-statistics/";
const NSE_MARKET_STATS_AJAX = "https://www.nse.co.ke/dataservices/wp-admin/admin-ajax.php";

// ... (Keep your CRYPTO_MAP, PRECIOUS_METALS, and NSE_SECTOR_MAP as they are)

async function fetchNseStockQuotes(): Promise<Record<string, any>> {
  console.log("[fetch-market-data] Starting NSE XHR Fallback Scrape...");

  const pageRes = await fetch(NSE_MARKET_STATS_PAGE);
  const pageHtml = await pageRes.text();
  const nonce = pageHtml.match(/"ajaxnonce":"([^"]+)"/)?.[1];

  if (!nonce) throw new Error("NSE ajax nonce not found");

  const quotes: Record<string, any> = {};
  const sectors = [...new Set(Object.values(NSE_SECTOR_MAP))];

  for (const sector of sectors) {
    console.log(`[fetch-market-data] Scraping sector: ${sector}`);
    const body = new URLSearchParams({ action: "display_prices", security: nonce, sector });

    const response = await fetch(NSE_MARKET_STATS_AJAX, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: body.toString(),
    });

    if (!response.ok) continue;

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) continue;

    const rows = [...doc.querySelectorAll("tr")].slice(1); // Skip header
    for (const tr of rows) {
      const cells = [...tr.querySelectorAll("td")].map((c) => c.textContent?.trim() || "");
      if (cells.length < 5) continue;

      const companyName = cells[0];
      const price = parseFloat(cells[3].replace(/,/g, ""));
      const changePct = parseFloat(cells[4].replace(/,/g, ""));
      const volume = parseInt(cells[2].replace(/,/g, ""), 10) || 0;

      // Match the company name to our symbols (using your logic)
      // For brevity, assume matching logic here or simple map lookup
      // ...
    }
  }
  return quotes;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stockQuotes = new Map<string, any>();
  let rapidApiStatus = "RapidAPI Initializing";

  try {
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    // --- PRIMARY: RAPID API ---
    if (rapidApiKey) {
      const nseRes = await fetch("https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks", {
        headers: { "x-rapidapi-key": rapidApiKey, "x-rapidapi-host": "nairobi-stock-exchange-nse.p.rapidapi.com" },
      });

      if (nseRes.ok) {
        const nseData = await nseRes.json();
        const stocks = nseData?.data || [];
        stocks.forEach((s: any) => {
          const ticker = (s.ticker || "").toUpperCase();
          const price = parseFloat((s.price || "0").replace(/,/g, ""));
          if (ticker && price > 0)
            stockQuotes.set(ticker, { price, volume: parseInt(s.volume) || 0 /* ...rest of mapping */ });
        });
        rapidApiStatus = `RapidAPI Success: ${stockQuotes.size} stocks`;
      } else {
        // FIXED: Explicitly handle 502/Error to trigger fallback
        console.warn(`[fetch-market-data] RapidAPI Failed (${nseRes.status}). Forcing Fallback.`);
        rapidApiStatus = `RapidAPI Failed (${nseRes.status})`;
      }
    }

    // --- FALLBACK: NSE XHR ---
    if (stockQuotes.size === 0) {
      const fallbackData = await fetchNseStockQuotes();
      Object.entries(fallbackData).forEach(([sym, q]) => stockQuotes.set(sym, q));
      rapidApiStatus += " | Fallback Active";
    }

    // --- DB UPDATE ---
    const { data: stockRows } = await supabase.from("stocks").select("id, symbol").eq("is_active", true);

    for (const row of stockRows || []) {
      const quote = stockQuotes.get(row.symbol);
      if (quote && quote.price > 0) {
        await supabase
          .from("stocks")
          .update({
            price: quote.price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        await supabase.from("stock_price_history").upsert(
          {
            stock_id: row.id,
            price: quote.price,
            snapshot_date: new Date().toISOString().split("T")[0],
          },
          { onConflict: "stock_id,snapshot_date" },
        );
      }
    }

    return new Response(JSON.stringify({ success: true, status: rapidApiStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[fetch-market-data] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
