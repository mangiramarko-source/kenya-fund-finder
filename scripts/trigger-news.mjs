import { createClient } from "@supabase/supabase-js";


import fs from 'fs';
import path from 'path';

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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Triggering fetch-news edge function...");
  // Pass cron_secret to bypass user-auth check
  const { data, error } = await supabase.functions.invoke('fetch-news', {
    body: { cron_secret: supabaseKey }
  });

  if (error) {
    console.error("❌ Error triggering function:", error.message || error);
  } else {
    console.log("✅ Function executed successfully!");
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

main();
