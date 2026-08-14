import requests
from bs4 import BeautifulSoup
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline", "src"))
from scrapers.tbill_scraper import TBillAuctionScraper
import json

scraper = TBillAuctionScraper()
html_url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
r = requests.get(html_url, headers={"User-Agent": "Mozilla/5.0"})
soup = BeautifulSoup(r.text, "html.parser")
all_links = [a["href"].strip() for a in soup.find_all("a", href=True) if ".pdf" in a["href"].lower() and "result" in a["href"].lower()]

target_link = None
for link in all_links:
    if "2695" in link:
        target_link = link
        break

if target_link:
    full_url = "https://www.centralbank.go.ke" + target_link if target_link.startswith("/") else target_link
    print(f"Target URL: {full_url}")
    pdf_bytes = scraper.download_pdf(full_url)
    data = scraper.extract_data_from_pdf(pdf_bytes)
    print(json.dumps(data, indent=2))
else:
    print("Issue 2695 not found in the recent links.")
