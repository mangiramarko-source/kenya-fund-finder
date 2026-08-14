import os, requests, json, sys, pdfplumber, io
from dotenv import load_dotenv
load_dotenv(".env")

headers = {"apikey": os.getenv("SUPABASE_SERVICE_ROLE_KEY"), "Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}"}

r = requests.get(f"{os.getenv('SUPABASE_URL')}/rest/v1/treasury_bill_auctions?select=issue_number,auction_date,source_url,market_average_rate,accepted_average_rate&order=auction_date.desc&limit=200", headers=headers)
data = r.json()

samples = []
for d in data:
    if "2694" in d["issue_number"]:
        samples.append(d["source_url"])
        break
for d in data:
    if "2026-06" in d["auction_date"]:
        samples.append(d["source_url"])
        break
for d in data:
    if "2025-12" in d["auction_date"]:
        samples.append(d["source_url"])
        break

sys.path.insert(0, "data_pipeline/src")
from scrapers.tbill_scraper import TBillAuctionScraper
scraper = TBillAuctionScraper()

for url in samples:
    print(f"\n--- Checking URL: {url} ---")
    pdf_bytes = requests.get(url).content
    parsed = scraper.extract_data_from_pdf(pdf_bytes)
    
    db_records = [d for d in data if d["source_url"] == url]
    
    print(f"Tenor | DB Market | Parser Market | DB Accepted | Parser Accepted")
    for db_rec in sorted(db_records, key=lambda x: int(x["issue_number"].split("/")[1])):
        tenor_str = db_rec["issue_number"].split("/")[1]
        tenor_days = int(tenor_str)
        
        p_market = parsed["market_average_rate"].get(str(tenor_days)) or parsed["market_average_rate"].get(tenor_days)
        p_accepted = parsed["accepted_average_rate"].get(str(tenor_days)) or parsed["accepted_average_rate"].get(tenor_days)
        
        print(f"{tenor_days:3d} | {db_rec['market_average_rate']} | {p_market} | {db_rec['accepted_average_rate']} | {p_accepted}")
