// scripts/check_nulls.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function checkNulls() {
  const { data: rates } = await supabase.from("exchange_rates_public").select("*");
  const { data: comms } = await supabase.from("commodities_public").select("*");
  const { data: stocks } = await supabase.from("stocks_public").select("*");

  console.log("Rates with null/invalid rate:", rates?.filter(r => r.rate == null || typeof r.rate !== 'number'));
  console.log("Comms with null/invalid price:", comms?.filter(c => c.price == null || typeof c.price !== 'number'));
  console.log("Stocks with null/invalid price:", stocks?.filter(s => s.price == null || typeof s.price !== 'number'));
}

checkNulls();
