import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('funds').select('name, updated_at, daily_yield, annual_yield').order('updated_at', { ascending: false }).limit(1);
  console.log("funds updated_at:", data);
}
check();
