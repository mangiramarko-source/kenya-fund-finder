import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envFile = fs.readFileSync(envPath, "utf8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [key, ...val] = line.split("=");
  if (key && val) {
    env[key.trim()] = val.join("=").trim();
  }
});

const supabaseUrl = env["VITE_SUPABASE_URL"] || env["SUPABASE_URL"];
const supabaseKey = env["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(supabaseUrl, supabaseKey);

const RSS_FEEDS = [
  { url: "https://www.businessdailyafrica.com/service/search/edp/21010-420078!/feed.rss", source: "Business Daily" },
  { url: "https://www.standardmedia.co.ke/rss/business.php", source: "Standard Media" },
  { url: "https://www.the-star.co.ke/rss/business", source: "The Star" },
  { url: "https://nation.africa/kenya/rss/business", source: "Nation" },
  { url: "https://www.capitalfm.co.ke/business/feed/", source: "Capital FM" },
  { url: "https://www.tuko.co.ke/rss/business.rss", source: "Tuko News" },
  { url: "https://citizen.digital/feed/business", source: "Citizen Digital" },
  { url: "https://www.kbc.co.ke/category/business/feed/", source: "KBC" },
  { url: "https://www.pd.co.ke/category/business/feed/", source: "People Daily" },
  { url: "https://kenyanwallstreet.com/feed/", source: "Kenyan Wall Street" },
  { url: "https://www.bizna.co.ke/feed/", source: "Bizna Kenya" },
  { url: "https://african.business/feed", source: "African Business" },
  { url: "https://www.theafricareport.com/feed/", source: "The Africa Report" },
  { url: "https://furtherafrica.com/feed/", source: "Further Africa" },
  { url: "https://www.ft.com/world/africa?format=rss", source: "Financial Times Africa" },
  { url: "https://techcabal.com/category/startups/feed/", source: "TechCabal" },
  { url: "https://techweez.com/feed/", source: "TechWeez" },
  { url: "https://news.google.com/rss/search?q=Kenya+economy+OR+NSE+OR+CBK+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" },
  { url: "https://news.google.com/rss/search?q=Kenya+shilling+OR+%22unit+trust%22+OR+%22money+market%22+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" }
];

async function main() {
  console.log("=== 1. DATABASE ARTICLES OVERVIEW ===");
  const { data: allArticles, error } = await supabase
    .from("news_articles")
    .select("id, title, source, created_at, date_published, status");

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  console.log(`Total articles in DB: ${allArticles.length}`);

  // Breakdown by source
  const sourceMap = {};
  allArticles.forEach((a) => {
    const src = a.source || "Unknown";
    if (!sourceMap[src]) {
      sourceMap[src] = { count: 0, latestCreated: a.created_at, publishedCount: 0, draftCount: 0 };
    }
    sourceMap[src].count++;
    if (a.status === "published") sourceMap[src].publishedCount++;
    else sourceMap[src].draftCount++;

    if (new Date(a.created_at) > new Date(sourceMap[src].latestCreated)) {
      sourceMap[src].latestCreated = a.created_at;
    }
  });

  console.table(
    Object.keys(sourceMap).map((src) => ({
      Source: src,
      TotalArticles: sourceMap[src].count,
      Published: sourceMap[src].publishedCount,
      Drafts: sourceMap[src].draftCount,
      LatestFetch: sourceMap[src].latestCreated,
    }))
  );

  console.log("\n=== 2. TESTING RSS FEEDS LIVE HTTP STATUS ===");
  for (const feed of RSS_FEEDS) {
    try {
      const start = Date.now();
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(6000),
      });
      const elapsed = Date.now() - start;
      if (!res.ok) {
        console.log(`❌ [HTTP ${res.status}] ${feed.source} (${feed.url}) - ${elapsed}ms`);
      } else {
        const xml = await res.text();
        const itemCount = (xml.match(/<item/g) || []).length;
        console.log(`✅ [HTTP ${res.status}] ${feed.source} - ${itemCount} items found (${elapsed}ms)`);
      }
    } catch (err) {
      console.log(`💥 [ERROR] ${feed.source} (${feed.url}): ${err.message}`);
    }
  }

  console.log("\n=== 3. INVOKING FETCH-NEWS EDGE FUNCTION ===");
  try {
    const { data: funcData, error: funcError } = await supabase.functions.invoke("fetch-news", {
      body: { cron_secret: supabaseKey },
    });
    if (funcError) {
      console.error("fetch-news Edge Function Error:", funcError);
    } else {
      console.log("fetch-news Edge Function Result:", funcData);
    }
  } catch (err) {
    console.error("Failed to call fetch-news:", err);
  }
}

main();
