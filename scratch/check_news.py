import os
import json
import urllib.request
import urllib.error

# parse .env
env = {}
with open('.env') as f:
    for line in f:
        if line.strip() and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v

url = f"{env['VITE_SUPABASE_URL']}/rest/v1/news_articles?select=id,title,summary,created_at&order=created_at.desc&limit=3"
req = urllib.request.Request(url, headers={
    'apikey': env['VITE_SUPABASE_PUBLISHABLE_KEY'],
    'Authorization': f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}"
})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode()}")
