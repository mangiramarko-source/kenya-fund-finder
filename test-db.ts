import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterday = new Date(now - oneDayMs).toISOString();

  const { data, error } = await supabase
    .from("news_articles_public")
    .select("created_at, date_published, source, title")
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error querying DB:", error);
    return;
  }

  console.log(`Found ${data.length} articles inserted in the last 24 hours.`);
  if (data.length > 0) {
    console.log("Most recent:", data[0].title);
    console.log("Time inserted:", data[0].created_at);
  } else {
    // Check when the actual last article was inserted
    const { data: lastData } = await supabase
      .from("news_articles_public")
      .select("created_at, date_published, source, title")
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (lastData && lastData.length > 0) {
      console.log("Most recent article ever in DB:");
      console.log("Time inserted:", lastData[0].created_at);
      console.log("Source:", lastData[0].source);
    }
  }
}

check();
