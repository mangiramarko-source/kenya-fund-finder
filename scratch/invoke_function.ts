import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caawgzuofnujrznwbuxk.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Initialize with service role key if available
const supabase = createClient(supabaseUrl, supabaseKey as string)

async function run() {
  console.log("Invoking fetch-market-data edge function...");
  const { data, error } = await supabase.functions.invoke('fetch-market-data', {
    body: { fetch_type: "fx", cron_secret: supabaseKey }
  })
  
  if (error) {
    console.error("Function Error:", error)
  } else {
    console.log("Function Success:", data)
  }
}

run();
