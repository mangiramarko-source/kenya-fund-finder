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
    with open("update_manifest.json", "r") as f:
        manifest = json.load(f)
        
    print(f"Executing repair for {len(manifest)} records...")
    
    updated_count = 0
    skipped_count = 0
    errors = 0
    
    for m in manifest:
        rec_id = m["id"]
        new_date = m["new_auction_date"]
        
        # Make sure we don't have a calculation logic, just strict assignment from manifest
        # Ensure we have the authoritative evidence check from manifest
        if not new_date or m["evidence"] not in ["pdf_footer", "pdf_header", "explicit_text"]:
            print(f"Skipping {m['issue_number']} due to lack of strict evidence")
            skipped_count += 1
            continue
            
        # Perform the actual update on auction_date only, using unique ID
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?id=eq.{rec_id}",
            headers=HEADERS,
            json={"auction_date": new_date}
        )
        if res.status_code in [200, 204]:
            updated_count += 1
            print(f"UPDATED: {rec_id} ({m['issue_number']}) -> {new_date}")
        else:
            print(f"ERROR updating {rec_id}: {res.text}")
            errors += 1

    print("\nRepair completed.")
    print(f"Rows updated: {updated_count}")
    print(f"Rows skipped: {skipped_count}")
    print(f"Errors: {errors}")
    print(f"Rows untouched (intended): {159 - len(manifest)}")

    print("\n--- Running Post-Repair Integrity Check ---")
    post_records = fetch_all()
    with open("post_repair_snapshot.json", "w") as f:
        json.dump(post_records, f, indent=2)
        
    print(f"Total post-repair records: {len(post_records)}")
    
    # Load pre-repair
    with open("pre_repair_snapshot.json", "r") as f:
        pre_records = json.load(f)
        
    pre_map = {r["id"]: r for r in pre_records}
    post_map = {r["id"]: r for r in post_records}
    
    assert len(pre_map) == len(post_map) == 159, "Record count changed!"
    
    tenor_counts = {91: 0, 182: 0, 364: 0}
    null_auction_dates = 0
    null_issue_dates = 0
    auction_gt_issue = 0
    equal_dates = 0
    
    for r in post_records:
        tenor_counts[r["tenor_days"]] += 1
        if not r.get("auction_date"): null_auction_dates += 1
        if not r.get("issue_date"): null_issue_dates += 1
        
        # auction > issue?
        if r.get("auction_date") and r.get("issue_date"):
            if r["auction_date"] > r["issue_date"]:
                auction_gt_issue += 1
            elif r["auction_date"] == r["issue_date"]:
                equal_dates += 1
                
    print(f"91-day: {tenor_counts[91]}, 182-day: {tenor_counts[182]}, 364-day: {tenor_counts[364]}")
    print(f"Null dates: {null_auction_dates} auction, {null_issue_dates} issue")
    print(f"auction_date > issue_date: {auction_gt_issue}")
    print(f"auction_date == issue_date: {equal_dates}")
    
    assert tenor_counts[91] == 53 and tenor_counts[182] == 53 and tenor_counts[364] == 53
    assert null_auction_dates == 0 and null_issue_dates == 0
    assert auction_gt_issue == 0
    
    print("\nVerifying NO UNINTENDED CHANGES...")
    manifest_map = {m["id"]: m for m in manifest}
    
    unintended_changes = False
    for rec_id, pre in pre_map.items():
        post = post_map[rec_id]
        
        for k, v in pre.items():
            if k == "auction_date":
                if rec_id in manifest_map:
                    if post[k] != manifest_map[rec_id]["new_auction_date"]:
                        print(f"Unintended auction_date for {rec_id}. Expected {manifest_map[rec_id]['new_auction_date']}, got {post[k]}")
                        unintended_changes = True
                else:
                    if post[k] != pre[k]:
                        print(f"Unintended auction_date change on untouched record {rec_id}: {pre[k]} -> {post[k]}")
                        unintended_changes = True
            else:
                if pre[k] != post[k]:
                    print(f"UNINTENDED CHANGE on {rec_id} field '{k}': {pre[k]} -> {post[k]}")
                    unintended_changes = True

    if not unintended_changes:
        print("SUCCESS! No unintended changes detected.")
    else:
        print("FAILED! Unintended changes detected.")

if __name__ == "__main__":
    main()
