import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

print(f"URL: {SUPABASE_URL}")
# We'll just fetch everything and filter, to avoid any URL encoding issues on the server side
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?select=id,issue_number,tenor_days,auction_date,issue_date,source_url",
    headers=headers,
    timeout=15,
)

if resp.status_code != 200:
    print(f"ERROR: {resp.status_code}")
    print(resp.text)
else:
    data = resp.json()
    issues = ["2695/091", "2669/182", "2624/364"]
    filtered = [r for r in data if r["issue_number"] in issues]
    print(json.dumps(filtered, indent=2))
