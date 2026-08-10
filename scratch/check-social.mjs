import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('news').select('*').eq('type', 'social').order('published_at', { ascending: false }).limit(5);
  if (error) console.error(error);
  console.log("Social posts count (latest 5):", data?.length);
  if (data?.length > 0) {
    console.log("Latest post:", data[0].title);
    console.log("Latest source:", data[0].source);
  } else {
    console.log("No social posts found in DB.");
  }
}
check();
