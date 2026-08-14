import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: mmfs } = await supabase.from('money_market_funds').select('id, updated_at').order('updated_at', { ascending: false }).limit(1);
  console.log("money_market_funds table:", mmfs);

  const { data: fx } = await supabase.from('exchange_rates').select('*').order('updated_at', { ascending: false }).limit(1);
  console.log("exchange_rates table:", fx);
}
check();
