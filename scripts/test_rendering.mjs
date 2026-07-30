// scripts/test_rendering.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testPageData() {
  console.log("Checking Overview Page Data Requirements...");
  const [rates, comms, stocks, funds, news, rateHist, fundSnap, stockHist] = await Promise.all([
    supabase.from("exchange_rates_public").select("*").order("sort_order"),
    supabase.from("commodities_public").select("*").order("sort_order"),
    supabase.from("stocks_public").select("*").order("sort_order"),
    supabase.from("funds_public").select("*").eq("is_published", true).order("annual_yield", { ascending: false }),
    supabase.from("news_articles_public").select("*").order("date_published", { ascending: false }).limit(4),
    supabase.from("exchange_rate_history_public").select("*").limit(10),
    supabase.from("fund_yield_snapshots").select("*").limit(10),
    supabase.from("stock_price_history").select("*").limit(10),
  ]);

  console.log(`- FX Rates: ${rates.data?.length ?? 0}`);
  console.log(`- Commodities: ${comms.data?.length ?? 0}`);
  console.log(`- Stocks: ${stocks.data?.length ?? 0}`);
  console.log(`- Published Funds: ${funds.data?.length ?? 0}`);
  console.log(`- News Articles Preview: ${news.data?.length ?? 0}`);
  console.log(`- Rate History Points: ${rateHist.data?.length ?? 0}`);
  console.log(`- Fund Yield Snapshots: ${fundSnap.data?.length ?? 0}`);
  console.log(`- Stock Price History: ${stockHist.data?.length ?? 0}`);
}

testPageData();
