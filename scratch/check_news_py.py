import os
import requests

url = ""
key = ""
with open('.env') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_URL='):
            url = line.strip().split('=', 1)[1]
        elif line.startswith('VITE_SUPABASE_ANON_KEY='):
            key = line.strip().split('=', 1)[1]

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Range": "0-999"
}

resp = requests.get(f"{url}/rest/v1/news_articles_public?select=category", headers=headers)
print(resp.status_code, resp.text[:200])
