import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('news_articles_public').select('*');
  console.log("Error:", error);
  console.log("Data count:", data ? data.length : 0);
  if (data && data.length > 0) console.log("First row:", data[0]);
}
run();
