import os
import sys
import json
import requests
import io
import PyPDF2
from supabase import create_client, Client

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def extract_pdf_text(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        pdf_file = io.BytesIO(response.content)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return str(e)

issues_to_check = [
    2694, 2693, # Aug 2026
    2671, 2670, # Jun 2026
    2662, 2661, # Apr 2026
    2654, 2653, # Feb 2026
    2646, 2645, # Dec 2025
    2637, 2636, # Oct 2025
    2629, 2628  # Aug/Sep 2025
]

# Note: The issue numbers don't perfectly align with the months because I'm guessing. 
# Let's query the database to find exact issues in those months!

def get_issues_for_month(year_month, limit=2):
    res = supabase.table('treasury_bill_auctions').select('*').eq('tenor_days', 91).like('auction_date', f'{year_month}%').limit(limit).execute()
    return res.data

def run_audit():
    months = ['2025-08', '2025-09', '2025-10', '2025-12', '2026-02', '2026-04', '2026-06', '2026-08']
    
    selected_auctions = []
    
    # 2 x Aug/Sep 2025
    aug_sep = get_issues_for_month('2025-08', 1) + get_issues_for_month('2025-09', 1)
    selected_auctions.extend(aug_sep)
    
    # 2 x Oct 2025
    oct_25 = get_issues_for_month('2025-10', 2)
    selected_auctions.extend(oct_25)
    
    # 2 x Dec 2025
    dec_25 = get_issues_for_month('2025-12', 2)
    selected_auctions.extend(dec_25)

    # 2 x Feb 2026
    feb_26 = get_issues_for_month('2026-02', 2)
    selected_auctions.extend(feb_26)

    # 2 x Apr 2026
    apr_26 = get_issues_for_month('2026-04', 2)
    selected_auctions.extend(apr_26)
    
    # 2 x Jun 2026
    jun_26 = get_issues_for_month('2026-06', 2)
    selected_auctions.extend(jun_26)
    
    # 2 x Aug 2026
    aug_26 = get_issues_for_month('2026-08', 2)
    selected_auctions.extend(aug_26)
    
    print(f"Selected {len(selected_auctions)} auctions for independent verification.")
    
    for auction in selected_auctions:
        issue_91 = auction['issue_number']
        date = auction['auction_date']
        url = auction['source_url']
        
        # Get all 3 tenors for this date
        res = supabase.table('treasury_bill_auctions').select('*').eq('auction_date', date).execute()
        records = res.data
        
        print(f"\n--- VERIFYING AUCTION {date} ---")
        print(f"URL: {url}")
        
        text = extract_pdf_text(url)
        # We will just print the first 2000 chars of the PDF so we can see it
        print("--- PDF EXTRACT START ---")
        print(text[:2000])
        print("--- PDF EXTRACT END ---")
        
        for r in records:
            print(f"DB Record: Tenor={r['tenor_days']}, Issue={r['issue_number']}, Rate={r['accepted_average_rate']}, Offered={r['amount_offered']}, Bids={r['bids_received']}, Accepted={r['amount_accepted']}")
            
run_audit()
