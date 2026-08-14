import os
import sys
import logging
import requests
import re
from bs4 import BeautifulSoup

# Add src to path so we can import scrapers
sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline", "src"))
from scrapers.tbill_scraper import TBillAuctionScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def dry_run_backfill():
    url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
    logging.info(f"Fetching {url}")
    
    r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    
    soup = BeautifulSoup(r.text, "html.parser")
    pdf_links = []
    
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if "result" in href.lower() and ".pdf" in href.lower():
            if not href.startswith("http"):
                href = "https://www.centralbank.go.ke" + (href if href.startswith("/") else "/" + href)
            if href not in pdf_links:
                pdf_links.append(href)
                
    logging.info(f"Discovered {len(pdf_links)} historical T-Bill result PDFs without guessing paths.")
    
    # Take the top 3 as a test
    scraper = TBillAuctionScraper()
    for i, link in enumerate(pdf_links[:3]):
        logging.info(f"--- Processing {i+1}/3: {link} ---")
        try:
            pdf_bytes = scraper.download_pdf(link)
            data = scraper.extract_data_from_pdf(pdf_bytes)
            logging.info(f"Parsed Successfully:")
            logging.info(f"Amount Offered: {data.get('amount_offered')}")
            logging.info(f"Bids Received: {data.get('bids_received')}")
        except Exception as e:
            logging.error(f"Failed to parse {link}: {e}")

if __name__ == "__main__":
    dry_run_backfill()
