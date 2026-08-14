import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}
url = f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?select=*"
response = requests.get(url, headers=headers)
if response.status_code != 200:
    print(f"Failed to fetch DB records: {response.text}")
    exit(1)

db_records = response.json()
# Key: (issue_number, tenor_days)
db_map = {(rec["issue_number"], rec["tenor_days"]): rec for rec in db_records}

with open("dry_run_observations.json", "r") as f:
    candidates = json.load(f)

new = 0
exact_duplicate = 0
conflict = 0
existing_verified_modified = 0

for cand in candidates:
    if cand['issue_number'] == "UNKNOWN":
        print(f"UNKNOWN issue number for tenor {cand['tenor']} on {cand['date']}")
        continue

    issue = cand['issue_number']
    tenor = cand['tenor']
    key = (issue, tenor)
    
    if key not in db_map:
        new += 1
    else:
        db_rec = db_map[key]
        # Compare rates
        c_rate = cand['rate']
        d_rate = db_rec['accepted_average_rate']
        if c_rate is not None and d_rate is not None and abs(float(c_rate) - float(d_rate)) < 0.001:
            exact_duplicate += 1
        else:
            conflict += 1
            print(f"CONFLICT for {key}: DB rate {d_rate} != Cand rate {c_rate}")
            existing_verified_modified += 1

print(f"\nExisting production records: {len(db_records)}")
print(f"Candidate observations: {len(candidates)}")
print(f"NEW: {new}")
print(f"EXACT_DUPLICATE: {exact_duplicate}")
print(f"CONFLICT: {conflict}")
print(f"Existing verified records that would be modified: {existing_verified_modified}")
