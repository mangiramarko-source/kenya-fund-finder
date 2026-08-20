// scripts/check_db_counts.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const headers = {
  "apikey": SUPABASE_SECRET_KEY,
  "Content-Type": "application/json",
  "Prefer": "count=exact"
};

const tables = [
  "funds", "funds_public",
  "fund_yield_snapshots", "fund_historical_yields",
  "stocks", "stocks_public", "stock_price_history",
  "exchange_rates", "exchange_rates_public", "exchange_rate_history",
  "commodities", "commodities_public", "commodity_price_history",
  "news_articles", "news_articles_public",
  "site_pages", "social_links", "social_links_public",
  "ads", "ads_public"
];

async function checkCounts() {
  console.log("=== SUPABASE TABLE COUNTS ===");
  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        method: "HEAD",
        headers
      });
      const contentRange = res.headers.get("content-range");
      const count = contentRange ? contentRange.split("/")[1] : "unknown";
      console.log(`${table.padEnd(28)}: ${count}`);
    } catch (e) {
      console.log(`${table.padEnd(28)}: Error (${e.message})`);
    }
  }
}

checkCounts();
