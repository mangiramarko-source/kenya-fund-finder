import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/std@0.193.0/dotenv/load.ts";

const supabase = createClient(
  Deno.env.get("VITE_SUPABASE_URL")!,
  Deno.env.get("VITE_SUPABASE_ANON_KEY")!
);

async function check() {
  const { data: stocks } = await supabase.from('stocks').select('updated_at').limit(1);
  const { data: fx } = await supabase.from('exchange_rates').select('updated_at').limit(1);
  const { data: cmd } = await supabase.from('commodities').select('updated_at').limit(1);
  
  console.log("Stocks:", stocks?.[0]?.updated_at);
  console.log("FX:", fx?.[0]?.updated_at);
  console.log("Commodities:", cmd?.[0]?.updated_at);
}

check();
