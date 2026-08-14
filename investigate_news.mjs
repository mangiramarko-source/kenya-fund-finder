import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const categories = ['Stocks', 'MMFs', 'FX', 'Commodities', 'General'];
  const results = {};

  for (const cat of categories) {
    let query = supabase.from('news_articles_public').select('*').order('date_published', { ascending: false }).limit(5);
    
    if (cat === 'Stocks') {
      query = query.or('category.ilike.%Stocks%,category.ilike.%Equities%,category.ilike.%NSE%');
    } else if (cat === 'MMFs') {
      query = query.or('category.ilike.%Money Market%,category.ilike.%Yield%,category.ilike.%Fund%,category.ilike.%MMF%');
    } else if (cat === 'FX') {
      query = query.or('category.ilike.%FX%,category.ilike.%Forex%,category.ilike.%Currency%,category.ilike.%Shilling%,category.ilike.%Dollar%');
    } else if (cat === 'Commodities') {
      query = query.or('category.ilike.%Commodities%,category.ilike.%Gold%,category.ilike.%Oil%,category.ilike.%Agriculture%,category.ilike.%Energy%');
    } else {
      query = query.eq('category', 'General');
    }

    const { data, error } = await query;
    if (error) console.error(error);
    results[cat] = data || [];
  }

  const { data: top30 } = await supabase.from('news_articles_public').select('*').order('date_published', { ascending: false }).limit(30);

  const companies = [
    { symbol: 'SCOM', name: 'Safaricom' },
    { symbol: 'EQTY', name: 'Equity' },
    { symbol: 'KCB', name: 'KCB' },
    { symbol: 'EABL', name: 'East African Breweries' },
    { symbol: 'COOP', name: 'Co-op' }
  ];

  const stockResults = {};
  for (const comp of companies) {
    const { data, error } = await supabase.from('news_articles_public')
      .select('id, title, date_published')
      .or(`title.ilike.%${comp.symbol}%,title.ilike.%${comp.name}%,summary.ilike.%${comp.symbol}%,summary.ilike.%${comp.name}%`)
      .order('date_published', { ascending: false });
    
    stockResults[comp.symbol] = data || [];
  }

  console.log(JSON.stringify({ results, top30, stockResults }, null, 2));
}

run();
