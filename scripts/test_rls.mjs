// scripts/test_rls.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testRLS() {
  console.log("--- commodity_price_history (base table) ---");
  const baseRes = await supabase.from("commodity_price_history").select("id").limit(1);
  console.log("Count/Error:", baseRes.data?.length, baseRes.error?.message);

  console.log("\n--- commodity_price_history_public (view) ---");
  const viewRes = await supabase.from("commodity_price_history_public").select("id").limit(1);
  console.log("Count/Error:", viewRes.data?.length, viewRes.error?.message);

  console.log("\n--- exchange_rate_history (base table) ---");
  const rateBase = await supabase.from("exchange_rate_history").select("id").limit(1);
  console.log("Count/Error:", rateBase.data?.length, rateBase.error?.message);

  console.log("\n--- exchange_rate_history_public (view) ---");
  const rateView = await supabase.from("exchange_rate_history_public").select("id").limit(1);
  console.log("Count/Error:", rateView.data?.length, rateView.error?.message);
}

testRLS();
