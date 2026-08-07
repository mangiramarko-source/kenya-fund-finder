import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('news_articles_public')
    .select('id, title, created_at, date_published')
    .order('date_published', { ascending: false })
    .limit(3);
    
  console.log("Error:", error);
  console.log("Data:", data);
}

main();
