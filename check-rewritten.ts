import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync('.env', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('news_articles')
    .select('title, content')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error("DB Error:", error);
    return;
  }
    
  for (const a of data) {
    if (a.content) {
      console.log("--- ARTICLE ---");
      console.log("TITLE:", a.title);
      console.log("CONTENT:\n", a.content.substring(0, 300));
    }
  }
}
run();
