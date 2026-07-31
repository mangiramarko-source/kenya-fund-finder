import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://caawgzuofnujrznwbuxk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing news_articles_public with full api.ts select query...");
  const { data, error } = await supabase.from("news_articles_public")
    .select("id, title, summary, content, source, date_published, url, category, read_time, is_featured, status, image_url")
    .limit(1);
    
  if (error) {
    console.error("ERROR FETCHING:", error);
  } else {
    console.log("SUCCESS. Row count:", data.length);
    if (data.length > 0) {
      console.log("Sample Data:", data[0]);
    }
  }
}
test();
