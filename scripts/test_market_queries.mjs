// scripts/test_market_queries.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testQueries() {
  console.log("--- Testing exchange_rates_public ---");
  const ratesRes = await supabase
    .from("exchange_rates_public")
    .select("id, currency_code, currency_name, rate, previous_rate, updated_at")
    .order("sort_order");
  console.log("Rates count:", ratesRes.data?.length, "Error:", ratesRes.error?.message);

  console.log("\n--- Testing commodities_public ---");
  const commRes = await supabase
    .from("commodities_public")
    .select("id, name, symbol, price, previous_price, unit, updated_at")
    .order("sort_order");
  console.log("Commodities count:", commRes.data?.length, "Error:", commRes.error?.message);

  console.log("\n--- Testing stocks_public ---");
  const stocksRes = await supabase
    .from("stocks_public")
    .select("id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap, updated_at")
    .order("sort_order");
  console.log("Stocks count:", stocksRes.data?.length, "Error:", stocksRes.error?.message);

  console.log("\n--- Testing funds_public ---");
  const fundsRes = await supabase
    .from("funds_public")
    .select("*")
    .order("annual_yield", { ascending: false });
  console.log("Funds count:", fundsRes.data?.length, "Error:", fundsRes.error?.message);

  console.log("\n--- Testing news_articles_public ---");
  const newsRes = await supabase
    .from("news_articles_public")
    .select("*")
    .order("date_published", { ascending: false })
    .limit(10);
  console.log("News count:", newsRes.data?.length, "Error:", newsRes.error?.message);
}

testQueries();
