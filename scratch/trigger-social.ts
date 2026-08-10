const text = await Deno.readTextFile(".env");
const urlMatch = text.match(/VITE_SUPABASE_URL="?([^"\n]+)/);
const keyMatch = text.match(/VITE_SUPABASE_ANON_KEY="?([^"\n]+)/);
const url = urlMatch ? urlMatch[1] : "";
const anonKey = keyMatch ? keyMatch[1] : "";

console.log("URL:", url);
console.log("Triggering fetch-social-news...");
try {
  const res = await fetch(`${url}/functions/v1/fetch-social-news`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (res.ok) {
    console.log("Success:", await res.json());
  } else {
    console.log("Error status:", res.status);
    console.log("Error text:", await res.text());
  }
} catch (e) {
  console.error("Fetch failed:", e);
}
