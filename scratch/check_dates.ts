import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caawgzuofnujrznwbuxk.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: fx } = await supabase.from('exchange_rates').select('updated_at').limit(1);
  const { data: comm } = await supabase.from('commodities').select('updated_at').limit(1);
  const { data: stocks } = await supabase.from('stocks').select('updated_at').limit(1);
  
  console.log("FX Date:", fx?.[0]?.updated_at);
  console.log("Commodities Date:", comm?.[0]?.updated_at);
  console.log("Stocks Date:", stocks?.[0]?.updated_at);
}

check();
