import { createClient } from '@supabase/supabase-js';

// Load .env file natively
import { readFileSync } from 'fs';
const envFile = readFileSync('.env', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Invoking fetch-news edge function...");
  const { data, error } = await supabase.functions.invoke('fetch-news', {
    method: 'POST'
  });
  
  if (error) {
    console.error("Function Error:", error);
    return;
  }
  console.log("Function Response:", data);
  
  console.log("Fetching latest 5 news_articles...");
  const { data: articles, error: e1 } = await supabase.from('news_articles')
    .select('title, summary, content')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (e1) {
    console.error('DB error:', e1?.message);
    return;
  }
  
  for (const a of articles) {
    console.log("---");
    console.log("TITLE:", a.title);
    console.log("CONTENT:\n", a.content);
  }
}
run();
