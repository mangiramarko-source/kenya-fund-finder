import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: latest } = await supabase.from('news_articles_public').select('created_at, title').order('created_at', { ascending: false }).limit(1);
  console.log("Latest Article:", latest);
}
check();
