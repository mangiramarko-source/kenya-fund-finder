import os
import json
import requests
from dotenv import load_dotenv

load_dotenv("/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=representation"}

def fetch_all():
    res = requests.get(f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?select=*", headers=HEADERS)
    res.raise_for_status()
    return res.json()

def main():
    # 1. Pre-repair snapshot
    records = fetch_all()
    with open("pre_repair_snapshot.json", "w") as f:
        json.dump(records, f, indent=2)
    print(f"Saved {len(records)} records to pre_repair_snapshot.json")
    
    # 2. Load the preview data to get the true auction dates
    # The preview data correctly mapped source_url -> tenors
    with open("/Users/markomangira/.gemini/antigravity/brain/fa9b13d5-442c-4a41-a92d-23e05cc39969/date_repair_preview.json", "r") as f:
        preview = json.load(f)
    
    # Map issue_number -> detected_auction_date & source
    issue_to_date = {}
    for pub in preview["publications"]:
        for t in pub["tenors"]:
            if t["requires_correction"]:
                issue_to_date[t["issue_number"]] = {
                    "new_auction_date": t["detected_auction_date"],
                    "source": t["auction_date_source"],
                    "source_url": pub["source_url"]
                }
    
    # Generate manifest
    manifest = []
    untouched = []
    for rec in records:
        issue_no = rec["issue_number"]
        if issue_no in issue_to_date:
            info = issue_to_date[issue_no]
            manifest.append({
                "id": rec["id"],
                "issue_number": issue_no,
                "tenor_days": rec["tenor_days"],
                "current_auction_date": rec["auction_date"],
                "new_auction_date": info["new_auction_date"],
                "issue_date": rec["issue_date"],
                "source_url": rec["source_url"],
                "evidence": info["source"]
            })
        else:
            untouched.append(rec)
            
    with open("update_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"Manifest generated with {len(manifest)} updates and {len(untouched)} untouched records.")
    
    # Validation
    assert len(records) == 159, f"Expected 159 total records, got {len(records)}"
    assert len(manifest) == 156, f"Expected 156 updates, got {len(manifest)}"
    assert len(untouched) == 3, f"Expected 3 untouched, got {len(untouched)}"
    
    for m in manifest:
        assert m["evidence"] in ["pdf_footer", "pdf_header", "explicit_text"], f"Record {m['issue_number']} lacks authoritative evidence: {m['evidence']}"
        assert m["current_auction_date"] != m["new_auction_date"], "Proposed date equals current date"
        
    print("ALL PRE-CONDITIONS MET. MANIFEST IS READY.")

if __name__ == "__main__":
    main()
