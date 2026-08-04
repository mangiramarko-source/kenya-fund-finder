import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caawgzuofnujrznwbuxk.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey as string)

async function check() {
  const { data, error } = await supabase.from('site_pages_public').select('slug, last_update_date, is_live');
  if (error) console.error(error);
  console.log("Pages:", data);
}

check();
