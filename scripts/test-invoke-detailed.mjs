import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
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

console.log("URL:", supabaseUrl);
console.log("Key Length:", supabaseKey ? supabaseKey.length : 0);

async function testFetch() {
  const funcUrl = `${supabaseUrl}/functions/v1/fetch-news`;
  console.log("Fetching:", funcUrl);
  try {
    const res = await fetch(funcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ cron_secret: supabaseKey })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

testFetch();
