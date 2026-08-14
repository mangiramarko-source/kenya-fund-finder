import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase = create_client(url, key)

res = supabase.table("treasury_bill_auctions").select("issue_number,tenor_days,auction_date,issue_date,amount_offered,bids_received,amount_accepted,market_average_rate,accepted_average_rate,previous_rate,performance_rate").order("auction_date", desc=True).limit(10).execute()
for r in res.data:
    print(r)
