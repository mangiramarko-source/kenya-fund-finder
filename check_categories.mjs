import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: articles } = await supabase.from('news_articles_public').select('*');
  const { data: stocks } = await supabase.from('stocks').select('symbol');

  const stats = {
    Stocks: { count: 0, newest: null, oldest: null },
    MMFs: { count: 0, newest: null, oldest: null },
    FX: { count: 0, newest: null, oldest: null },
    Commodities: { count: 0, newest: null, oldest: null },
    General: { count: 0, newest: null, oldest: null },
  };

  articles.forEach(a => {
    const pubDate = new Date(a.date_published || a.created_at);
    
    // logic mirrored from UI
    let matched = false;
    const t = a.title.toLowerCase();

    // Stocks
    let isStock = false;
    if (a.related_stock_id) isStock = true;
    else {
      const found = stocks.find(s => a.title.toUpperCase().includes(s.symbol));
      if (found) isStock = true;
    }

    if (isStock) {
       stats.Stocks.count++;
       if (!stats.Stocks.newest || pubDate > stats.Stocks.newest) stats.Stocks.newest = pubDate;
       if (!stats.Stocks.oldest || pubDate < stats.Stocks.oldest) stats.Stocks.oldest = pubDate;
       matched = true;
    }
    
    // MMFs
    if (a.category === "Yield Updates" || a.category === "Fund Announcements" || t.includes("fund") || t.includes("unit trust") || t.includes("yield")) {
       stats.MMFs.count++;
       if (!stats.MMFs.newest || pubDate > stats.MMFs.newest) stats.MMFs.newest = pubDate;
       if (!stats.MMFs.oldest || pubDate < stats.MMFs.oldest) stats.MMFs.oldest = pubDate;
       matched = true;
    }

    // FX
    if (a.category === "International" || t.includes("shilling") || t.includes("dollar") || t.includes("forex") || t.includes("currency") || t.includes("eurobond")) {
       stats.FX.count++;
       if (!stats.FX.newest || pubDate > stats.FX.newest) stats.FX.newest = pubDate;
       if (!stats.FX.oldest || pubDate < stats.FX.oldest) stats.FX.oldest = pubDate;
       matched = true;
    }

    // Commodities
    if (t.includes("oil") || t.includes("gold") || t.includes("tea") || t.includes("coffee") || t.includes("agriculture")) {
       stats.Commodities.count++;
       if (!stats.Commodities.newest || pubDate > stats.Commodities.newest) stats.Commodities.newest = pubDate;
       if (!stats.Commodities.oldest || pubDate < stats.Commodities.oldest) stats.Commodities.oldest = pubDate;
       matched = true;
    }

    // General
    if (!matched) {
       stats.General.count++;
       if (!stats.General.newest || pubDate > stats.General.newest) stats.General.newest = pubDate;
       if (!stats.General.oldest || pubDate < stats.General.oldest) stats.General.oldest = pubDate;
    }
  });

  console.table(stats);
}
check();
