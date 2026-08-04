import { createClient } from "npm:@supabase/supabase-js";
import 'npm:dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkNews() {
  const { data, error } = await supabase.from('news_articles').select('*').limit(5).order('created_at', { ascending: false });
  console.log(data, error);
}

checkNews();
