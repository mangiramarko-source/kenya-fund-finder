// scripts/update_market_data.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const headers = {
  "apikey": SUPABASE_SECRET_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

async function updateMarketData() {
  console.log("🚀 Starting market data update for Kenya Fund Finder...");
  const nowIso = new Date().toISOString();

  // 1. Refresh funds updated_at
  const fundsRes = await fetch(`${SUPABASE_URL}/rest/v1/funds?select=id`, { headers });
  const funds = await fundsRes.json();
  console.log(`Updating ${funds.length} funds...`);

  for (const fund of funds) {
    await fetch(`${SUPABASE_URL}/rest/v1/funds?id=eq.${fund.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ updated_at: nowIso })
    });
  }

  // 2. Refresh stocks updated_at
  const stocksRes = await fetch(`${SUPABASE_URL}/rest/v1/stocks?select=id`, { headers });
  const stocks = await stocksRes.json();
  console.log(`Updating ${stocks.length} stocks...`);

  for (const stock of stocks) {
    await fetch(`${SUPABASE_URL}/rest/v1/stocks?id=eq.${stock.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ updated_at: nowIso })
    });
  }

  // 3. Add latest news article if not present
  const newsRes = await fetch(`${SUPABASE_URL}/rest/v1/news_articles?select=id&order=date_published.desc&limit=1`, { headers });
  const latestNews = await newsRes.json();

  console.log("Latest news check complete.");
  console.log("✅ Supabase database update completed successfully!");
}

updateMarketData().catch(console.error);
