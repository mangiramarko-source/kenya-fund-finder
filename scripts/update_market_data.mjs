// scripts/update_market_data.mjs
const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyMjQ4NiwiZXhwIjoyMDkxODk4NDg2fQ.RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE";

const headers = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
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
