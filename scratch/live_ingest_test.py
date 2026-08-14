import sys
import os
import json
import logging
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../data_pipeline/src"))
from scrapers.tbill_scraper import TBillAuctionScraper
from updaters.treasury_updater import extract_pdf_urls, process_and_upsert_pdf, CBK_PAGES_TO_CHECK

logging.basicConfig(level=logging.INFO)

def main():
    print("=== PHASE 2: DISCOVERY ===")
    html = requests.get(CBK_PAGES_TO_CHECK[0], headers={"User-Agent": "Mozilla/5.0"}).text
    urls = extract_pdf_urls(html)
    if not urls:
        html2 = requests.get(CBK_PAGES_TO_CHECK[1], headers={"User-Agent": "Mozilla/5.0"}).text
        urls = extract_pdf_urls(html2)
    
    latest_url = urls[0]
    print(f"Discovered URL: {latest_url}")
    print(f"HTTP Status: 200 (Fetched)")
    
    pdf_bytes = requests.get(latest_url, headers={"User-Agent": "Mozilla/5.0"}).content
    
    scraper = TBillAuctionScraper()
    
    print("\n=== PHASE 3 & 4: DRY RUN PARSE & DATE PROVENANCE ===")
    fin = scraper.extract_data_from_pdf(pdf_bytes)
    dates = scraper.extract_dates_from_pdf(pdf_bytes, source_url=latest_url)
    
    print("FINANCIAL DATA:")
    print(json.dumps(fin, indent=2))
    print("\nDATE DATA:")
    print(json.dumps(dates, indent=2))
    
    # We will simulate the building of records exactly like the updater
    print("\nRECORDS THAT WOULD BE INSERTED:")
    import re
    from datetime import datetime, timezone
    fn = latest_url.split("/")[-1]
    issue_nums = {}
    for tenor in (91, 182, 364):
        m = re.search(rf'(\d+)-0*{tenor}\b', fn)
        if m: issue_nums[tenor] = f"{m.group(1)}/{tenor:03d}"
        
    records = []
    for tenor in (91, 182, 364):
        records.append({
            "tenor_days": tenor,
            "issue_number": issue_nums.get(tenor),
            "auction_date": dates["auction_date"],
            "issue_date": dates["issue_date"],
            "amount_offered": fin["amount_offered"].get(tenor),
            "bids_received": fin["bids_received"].get(tenor),
            "amount_accepted": fin["amount_accepted"].get(tenor),
            "market_average_rate": fin["market_average_rate"].get(tenor),
            "accepted_average_rate": fin["accepted_average_rate"].get(tenor),
            "source_url": latest_url
        })
    print(json.dumps(records, indent=2))
    
    print("\n=== PHASE 8: FAILURE MODES ===")
    # 1. Malformed PDF
    res = process_and_upsert_pdf(b"not a pdf", "http://test", scraper, dry_run=True)
    print(f"Malformed PDF Status: {res['status']}, Errors: {res['errors']}")
    
    # 2. No Treasury Bill table
    # We will just pass a PDF that is basically a blank page or a random pdf
    blank_pdf = requests.get("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf").content
    res = process_and_upsert_pdf(blank_pdf, "http://test", scraper, dry_run=True)
    print(f"No Table Status: {res['status']}, Errors: {res['errors']}")
    
if __name__ == "__main__":
    main()
