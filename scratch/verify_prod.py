import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()
url = 'https://caawgzuofnujrznwbuxk.supabase.co/rest/v1/treasury_bill_auctions?select=issue_number,tenor_days,market_average_rate,accepted_average_rate,auction_date'
req = urllib.request.Request(url, headers={'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + os.environ['SUPABASE_SERVICE_ROLE_KEY']})
data = json.loads(urllib.request.urlopen(req).read())

total = len(data)
t91 = len([d for d in data if d.get('tenor_days') == 91])
t182 = len([d for d in data if d.get('tenor_days') == 182])
t364 = len([d for d in data if d.get('tenor_days') == 364])

# Find duplicates
keys = [(d['issue_number'], d['tenor_days']) for d in data]
duplicates = len(keys) - len(set(keys))

# 2695
r2695 = [d for d in data if d['issue_number'] == '2695/091'][0]

print(f"Total: {total}")
print(f"91-day: {t91}")
print(f"182-day: {t182}")
print(f"364-day: {t364}")
print(f"Duplicates: {duplicates}")
print(f"2695: {r2695}")
