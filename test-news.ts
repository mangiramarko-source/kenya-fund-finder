import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching news_articles...");
  const { data: d1, error: e1 } = await supabase.from('news_articles').select('*').limit(1);
  console.log('news_articles error:', e1?.message);
  console.log('news_articles data len:', d1?.length);
  
  console.log("Fetching news_articles_public...");
  const { data: d2, error: e2 } = await supabase.from('news_articles_public').select('*').limit(1);
  console.log('news_articles_public error:', e2?.message);
  console.log('news_articles_public data len:', d2?.length);
}
run();
