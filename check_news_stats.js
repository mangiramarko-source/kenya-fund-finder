import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNews() {
  const { data: articles, error } = await supabase
    .from('news_articles_public')
    .select('id, title, category, related_stock_id, created_at, date_published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching news:", error);
    return;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = {};
  let totalStocksWithIds = 0;

  articles.forEach(a => {
    const cat = a.category || 'General';
    if (!stats[cat]) {
      stats[cat] = { count: 0, newest: null, oldest: null, last7: 0, last30: 0 };
    }
    const pubDate = new Date(a.date_published || a.created_at);
    
    stats[cat].count++;
    
    if (!stats[cat].newest || pubDate > stats[cat].newest) stats[cat].newest = pubDate;
    if (!stats[cat].oldest || pubDate < stats[cat].oldest) stats[cat].oldest = pubDate;
    
    if (pubDate >= sevenDaysAgo) stats[cat].last7++;
    if (pubDate >= thirtyDaysAgo) stats[cat].last30++;
    
    if (cat.toLowerCase() === 'stocks' || cat.toLowerCase() === 'stock') {
       if (a.related_stock_id) totalStocksWithIds++;
    }
  });

  console.log("=== NEWS STATS BY CATEGORY ===");
  console.table(stats);
  console.log("Total articles with related_stock_id:", totalStocksWithIds);

  const { data: stocks } = await supabase.from('market_data_cache').select('last_updated').eq('type', 'stock').order('last_updated', { ascending: false }).limit(1);
  console.log("Stock market data latest update:", stocks?.[0]?.last_updated);
  
  const { data: mmfs } = await supabase.from('market_data_cache').select('last_updated').eq('type', 'mmf').order('last_updated', { ascending: false }).limit(1);
  console.log("MMF market data latest update:", mmfs?.[0]?.last_updated);
  
  const { data: fx } = await supabase.from('market_data_cache').select('last_updated').eq('type', 'fx').order('last_updated', { ascending: false }).limit(1);
  console.log("FX market data latest update:", fx?.[0]?.last_updated);
  
  const { data: comms } = await supabase.from('market_data_cache').select('last_updated').eq('type', 'commodity').order('last_updated', { ascending: false }).limit(1);
  console.log("Commodities market data latest update:", comms?.[0]?.last_updated);
}

checkNews();
