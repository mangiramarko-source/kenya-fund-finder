import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if(!supabaseKey) throw new Error('Missing key');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: allItems, error } = await supabase
    .from('news_articles_public')
    .select('title, summary, source, category, related_stock_id')
    .order('date_published', { ascending: false })
    .limit(300);

  if (error) throw error;

  const getFiltered = (tab) => {
    let filtered = [...allItems];
    if (tab === "Stocks") {
      filtered = filtered.filter(a => !!a.related_stock_id); // Approximation of relatedStock
    } else if (tab === "MMFs") {
      const mmfRegex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|yield|interest rate)\b/i;
      filtered = filtered.filter(a => a.category === "Yield Updates" || a.category === "Fund Announcements" || mmfRegex.test(a.title));
    } else if (tab === "FX Rates") {
      const fxRegex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
      filtered = filtered.filter(a => a.category === "FX & Currency" || fxRegex.test(a.title));
    } else if (tab === "Commodities") {
      const commoditiesRegex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
      filtered = filtered.filter(a => commoditiesRegex.test(a.title));
    } else if (tab === "General") {
      filtered = filtered;
    }
    return filtered.slice(0, 5);
  };

  const categories = ["Stocks", "MMFs", "FX Rates", "Commodities", "General"];
  let total = 0;
  
  for (const cat of categories) {
    console.log(`\n--- ${cat} (Newest 5) ---`);
    const articles = getFiltered(cat);
    articles.forEach(a => {
      console.log(`[${a.source}] ${a.title} (RawCat: ${a.category})`);
    });
    total += articles.length;
  }
}

run();
