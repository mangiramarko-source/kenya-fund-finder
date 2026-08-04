import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/std@0.212.0/dotenv/load.ts";

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Invoking fetch-news edge function...");
  const { data, error } = await supabase.functions.invoke('fetch-news', {
    body: { cron_secret: Deno.env.get("CRON_SECRET") || supabaseKey }
  });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

run();
