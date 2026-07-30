// scripts/check_db_counts.mjs
const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyMjQ4NiwiZXhwIjoyMDkxODk4NDg2fQ.RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE";

const headers = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
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
