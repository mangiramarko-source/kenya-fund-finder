import os, io, requests, re
from pdfminer.high_level import extract_text
from dotenv import load_dotenv

load_dotenv("/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

URLS = [
    ("August 2025", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1837291982_RESULTS 2644-091 2618-182 2572-364 DATED 25-08-2025.pdf"),
    ("September 2025", "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/2051037404_RESULTS 2648-091 2622-182 2576-364 DATED 22-09-2025.pdf"),
    ("December 2025 (Christmas)", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/523183319_RESULTS 2662-091 2636-182 2591-364 DATED 29-12-2025.pdf"),
    ("January 2026 (New Year)", "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/632178852_RESULTS 2663-091 2637-182 2592-364 DATED 05-01-2026.pdf"),
    ("Early/Mid 2026", "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/684355991_RESULTS 2677-091 2651-182 2606-364 DATED 13-04-2026.pdf"),
    ("Recent 2026", "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1045804532_RESULTS 2690-091 2664-182 2619-364 DATED 13-07-2026.pdf"),
    ("Issue 2694", "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1883166998_RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf")
]

def get_db(url):
    encoded = requests.utils.quote(url)
    res = requests.get(f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?source_url=eq.{encoded}&select=*", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    return res.json()

print("# Independent Verification Report\n")
for name, url in URLS:
    r = requests.get(url.replace(" ", "%20"), headers={'User-Agent': 'Mozilla/5.0'})
    text = extract_text(io.BytesIO(r.content))
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # Financial extraction (simplified assumption based on CBK tables)
    # usually: Amount Offered (Kshs. M) \n [91] \n [182] \n [364]
    offered = []
    received = []
    accepted = []
    
    for i, line in enumerate(lines):
        if "Amount Offered" in line:
            for j in range(1, 15):
                val = lines[i+j].replace(",", "")
                if re.match(r"^\d+(\.\d+)?$", val):
                    offered.append(float(val))
                if len(offered) == 3: break
        elif "Bids Received" in line:
            for j in range(1, 15):
                val = lines[i+j].replace(",", "")
                if re.match(r"^\d+(\.\d+)?$", val):
                    received.append(float(val))
                if len(received) == 3: break
        elif "Total Amount Accepted" in line:
            for j in range(1, 15):
                val = lines[i+j].replace(",", "")
                if re.match(r"^\d+(\.\d+)?$", val):
                    accepted.append(float(val))
                if len(accepted) == 3: break
                
    db_recs = get_db(url)
    print(f"### {name}")
    print(f"**URL:** {url}")
    print("#### Extracted Dates")
    header = lines[0] if lines else ""
    footer = [l for l in lines[-10:] if re.match(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}', l)]
    deadline = [l for l in lines if "Bids must be submitted" in l]
    print(f"- **Section A (Issue Date context):** `{header}`")
    print(f"- **Footer (Auction Date context):** `{footer[0] if footer else 'None'}`")
    print(f"- **Deadline (Next Auction context):** `{deadline[0] if deadline else 'None'}`")
    print("\n| Tenor | Offered (PDF vs DB) | Received (PDF vs DB) | Accepted (PDF vs DB) | Status |")
    print("|---|---|---|---|---|")
    
    # Map DB records to tenors
    db_map = {r['tenor_days']: r for r in db_recs}
    for idx, t in enumerate([91, 182, 364]):
        o_pdf = offered[idx] if len(offered) > idx else 0
        r_pdf = received[idx] if len(received) > idx else 0
        a_pdf = accepted[idx] if len(accepted) > idx else 0
        
        db_rec = db_map.get(t, {})
        o_db = db_rec.get('amount_offered', 0)
        r_db = db_rec.get('bids_received', 0)
        a_db = db_rec.get('amount_accepted', 0)
        
        status = "PASS" if (o_pdf == o_db and r_pdf == r_db and a_pdf == a_db) else "FAIL"
        print(f"| {t} | {o_pdf} vs {o_db} | {r_pdf} vs {r_db} | {a_pdf} vs {a_db} | {status} |")
    print("\n")
    
