import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as dotenv from 'https://deno.land/std/dotenv/mod.ts'

const env = await dotenv.load({ envPath: './supabase/.env', export: true, allowEmptyValues: true })
const supabaseUrl = env['SUPABASE_URL'] || Deno.env.get('SUPABASE_URL')
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

console.log("Invoking edge function for commodities...");
const { data, error } = await supabase.functions.invoke('fetch-market-data', {
  body: { fetch_type: "commodities", cron_secret: supabaseKey }
})

console.log("Error:", error);
console.log("Data:", data);
