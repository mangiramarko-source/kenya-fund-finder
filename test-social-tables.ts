import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || env['VITE_SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Testing post_likes insert...");
  const { data: likeData, error: likeErr } = await supabase.from('post_likes').insert({
    post_id: "news-test123",
    device_id: "test-device"
  }).select();

  if (likeErr) {
    console.error("Failed to insert like:", likeErr.message);
  } else {
    console.log("Like inserted successfully:", likeData);
  }

  console.log("Testing post_comments insert...");
  const { data: commentData, error: commentErr } = await supabase.from('post_comments').insert({
    post_id: "news-test123",
    content: "This is a test comment",
    author_name: "Test User",
    device_id: "test-device"
  }).select();

  if (commentErr) {
    console.error("Failed to insert comment:", commentErr.message);
  } else {
    console.log("Comment inserted successfully:", commentData);
  }

  // Cleanup
  console.log("Cleaning up test data...");
  await supabase.from('post_likes').delete().eq('post_id', "news-test123");
  await supabase.from('post_comments').delete().eq('post_id', "news-test123");
  console.log("Cleanup done.");
}

check();
