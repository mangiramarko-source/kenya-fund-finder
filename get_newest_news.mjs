import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('news_articles_public').select('title, source, created_at, date_published, category').order('created_at', { ascending: false }).limit(1);
  if (error) console.error(error);
  else console.log(data);
}
check();
