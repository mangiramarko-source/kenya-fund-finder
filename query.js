import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await client.from('news').select('id, title, summary, content, ai_insight').or('title.ilike.%6m%,summary.ilike.%6m%,content.ilike.%6m%').limit(5);
  console.log("ERROR:", error);
  console.log(JSON.stringify(data, null, 2));
}
await run();
