import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

// Parse .env manually since dotenv is missing
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || env['SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking if cron job exists...");
  
  // We can't query pg_cron directly via postgrest if it's not exposed, 
  // but we can try to call the function via RPC if there's a helper,
  // or we can just try to see if there are any articles from the last hour.
  
  const { data, error } = await supabase
    .from('news_articles')
    .select('created_at, title')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching articles:", error);
  } else {
    console.log("Most recent article:", data);
  }
}

main();
