set -a
source .env
set +a
curl -s -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_URL/rest/v1/news_articles_public?select=id,title,created_at,date_published&limit=5&order=date_published.desc"
