import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_PUBLISHABLE_KEY'] || env['SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("--- Starting Data Layer & Background Jobs Verification ---");

  // 1. Check Data Freshness (MMF)
  const { data: mmfs, error: mmfError } = await supabase
    .from('funds')
    .select('id, name, daily_yield')
    .eq('fund_type', 'Money Market')
    .limit(3);
  
  if (mmfError) {
    console.error("MMF Fetch Error:", mmfError);
  } else {
    console.log("✅ MMF Fetch Success:", mmfs.length, "records");
    mmfs.forEach(f => console.log(`   - ${f.name}: Daily=${f.daily_yield}%`));
  }

  // 2. Check Data Freshness (Stocks)
  const { data: stocks, error: stockError } = await supabase
    .from('stocks_public')
    .select('*')
    .limit(3);
  
  if (stockError) {
    console.error("Stocks Fetch Error:", stockError);
  } else {
    console.log("✅ Stocks Fetch Success:", stocks.length, "records");
    stocks.forEach(s => console.log(`   - ${s.symbol || s.ticker}: Price=${s.current_price || s.price}`));
  }

  // 3. Check Data Freshness (FX)
  const { data: fx, error: fxError } = await supabase
    .from('exchange_rates_public')
    .select('*');

  if (fxError) {
    console.error("FX Fetch Error:", fxError);
  } else {
    console.log("✅ FX Fetch Success:", fx.length, "records");
    fx.forEach(f => console.log(`   - ${f.pair || f.currency}: ${f.rate || f.price}`));
  }

  // 4. Test Edge Function: ai-lab-explain (dry run)
  console.log("⏳ Testing Edge Function: ai-lab-explain...");
  const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-lab-explain', {
    body: { query: "What is a Money Market Fund?" }
  });

  if (aiError) {
    console.error("❌ ai-lab-explain Error:", aiError.message);
  } else {
    console.log("✅ ai-lab-explain Success (received response)");
  }

  // 5. Test Edge Function: fetch-news (status check - we don't want to actually run the cron, but see if we can reach it)
  // Most crons have an auth block or return 400 if not sent right payload, this verifies it's alive.
  console.log("⏳ Testing Edge Function: fetch-news (presence check)...");
  const { data: newsData, error: newsError } = await supabase.functions.invoke('fetch-news', {
    body: { dryRun: true }
  });
  
  if (newsError) {
    // We expect it might fail auth if not invoked via pg_net/cron, which is fine, just seeing if it exists.
    console.log("ℹ️ fetch-news returned:", newsError.message, "(expected if auth required)");
  } else {
    console.log("✅ fetch-news Success / Accessible");
  }

  console.log("--- Verification Complete ---");
}

runTests();
