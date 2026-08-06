import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkNews() {
  const { data, error } = await supabase.from('news_articles').select('id, title, summary, created_at').limit(3).order('created_at', { ascending: false });
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error(error);
}

checkNews();
