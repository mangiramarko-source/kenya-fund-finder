import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: news, error } = await supabase.from('news_articles_public').select('*').order('date_published', { ascending: false });
  if (error) throw error;
  
  const allArticles = news;
  const categories = {
    "Stocks": (a) => !!a.related_stock_id,
    "MMFs": (a) => {
      const regex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
      return regex.test(a.title) || (a.summary && regex.test(a.summary));
    },
    "FX Rates": (a) => {
      const regex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
      return a.category === "FX & Currency" || regex.test(a.title);
    },
    "Commodities": (a) => {
      const regex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
      return regex.test(a.title);
    }
  };

  for (const [name, filterFn] of Object.entries(categories)) {
    const total = allArticles.filter(filterFn);
    const beforeFix = allArticles.slice(0, 60).filter(filterFn);
    
    console.log(`| ${name} | ${beforeFix.length} | ${total.length} | ${total.length > 0 ? new Date(total[total.length-1].date_published).toISOString().split('T')[0] : 'N/A'} |`);
  }
}

run().catch(console.error);
