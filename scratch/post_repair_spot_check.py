import os
import requests
from dotenv import load_dotenv

load_dotenv("/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

URLS = [
    ("August 2025", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1837291982_RESULTS 2644-091 2618-182 2572-364 DATED 25-08-2025.pdf"),
    ("Christmas 2025", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/523183319_RESULTS 2662-091 2636-182 2591-364 DATED 29-12-2025.pdf"),
    ("New Year period", "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/632178852_RESULTS 2663-091 2637-182 2592-364 DATED 05-01-2026.pdf"),
    ("3-day-gap publication", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1742641457_RESULTS 2664-091 2638-182 2593-364 DATED 12-01-2026.pdf"),
    ("Mid 2026", "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/684355991_RESULTS 2677-091 2651-182 2606-364 DATED 13-04-2026.pdf"),
    ("Recent 2026", "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1045804532_RESULTS 2690-091 2664-182 2619-364 DATED 13-07-2026.pdf"),
    ("Issue 2694", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1883166998_RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf")
]

def get_db(url):
    encoded = requests.utils.quote(url)
    res = requests.get(f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?source_url=eq.{encoded}&select=*", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    return res.json()

out = []
out.append("### CBK Verification (Post-Repair)")

for name, url in URLS:
    db_recs = get_db(url)
    out.append(f"\n#### {name}")
    out.append(f"- URL: {url}")
    out.append("| Tenor | DB Issue | DB Auction Date | DB Issue Date |")
    out.append("|---|---|---|---|")
    
    db_map = {r['tenor_days']: r for r in db_recs}
    for t in [91, 182, 364]:
        db_rec = db_map.get(t, {})
        issue_no = db_rec.get('issue_number', 'N/A')
        auction_date = db_rec.get('auction_date', 'N/A')
        issue_date = db_rec.get('issue_date', 'N/A')
        out.append(f"| {t}-Day | {issue_no} | {auction_date} | {issue_date} |")

with open("/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/scratch/post_repair_spot_check_output.md", "w") as f:
    f.write("\n".join(out))

print("Spot check script generated successfully.")
