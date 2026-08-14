import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: tables } = await supabase.from('news_articles_public').select('*').limit(1);
  console.log("News table sample:", tables);
  
  const { data: stocks } = await supabase.from('stocks').select('symbol, updated_at').order('updated_at', { ascending: false }).limit(1);
  console.log("stocks table:", stocks);

  const { data: mmfs } = await supabase.from('mmfs').select('id, updated_at').order('updated_at', { ascending: false }).limit(1);
  console.log("mmfs table:", mmfs);

  const { data: fx } = await supabase.from('fx_rates').select('currency, updated_at').order('updated_at', { ascending: false }).limit(1);
  console.log("fx table:", fx);

  const { data: comms } = await supabase.from('commodities').select('symbol, updated_at').order('updated_at', { ascending: false }).limit(1);
  console.log("commodities table:", comms);
}
check();
