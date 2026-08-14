import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("Missing URL or Key");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("category, title, summary, related_stock_id");

  if (error) {
    console.error(error);
    return;
  }

  console.log("Total articles in view:", data.length);

  const stats: Record<string, number> = {};
  for (const a of data) {
    const c = a.category || "None";
    stats[c] = (stats[c] || 0) + 1;
  }
  console.log("Categories:", stats);

  const stocks = data.filter(a => !!a.related_stock_id);
  console.log("Stocks (by related_stock_id):", stocks.length);

  const mmfRegex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
  const mmfs = data.filter(a => mmfRegex.test(a.title) || (a.summary && mmfRegex.test(a.summary)));
  console.log("MMFs (by regex):", mmfs.length);

  const fxRegex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
  const fx = data.filter(a => a.category === "FX & Currency" || fxRegex.test(a.title));
  console.log("FX (by regex/category):", fx.length);

  const comRegex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
  const commodities = data.filter(a => comRegex.test(a.title));
  console.log("Commodities (by regex):", commodities.length);
}

check();
