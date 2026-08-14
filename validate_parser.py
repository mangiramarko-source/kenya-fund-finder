import os
import sys
import logging
import requests
from bs4 import BeautifulSoup
import random

# Add src to path so we can import scrapers
sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline", "src"))
from scrapers.tbill_scraper import TBillAuctionScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def test_historical_samples():
    scraper = TBillAuctionScraper()

    # 1. Golden Test
    print("--- GOLDEN AUCTION ---")
    url = "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1797505205_RESULTS%202695-091%202669-182%202624-364%20DATED%2017-08-2026.pdf"
    try:
        pdf_bytes = scraper.download_pdf(url)
        data = scraper.extract_data_from_pdf(pdf_bytes)
        print("91-Day:")
        print(f"  * Expected Rate: 8.7734 | Parsed: {data.get('accepted_average_rate', {}).get(91) if data.get('accepted_average_rate') else 'N/A'}")
        print(f"  * Expected Amount Offered: 8,000,000,000 | Parsed: {data.get('amount_offered', {}).get(91) if data.get('amount_offered') else 'N/A'}")
        print(f"  * Expected Bids Received: 18,236,310,000 | Parsed: {data.get('bids_received', {}).get(91) if data.get('bids_received') else 'N/A'}")
        print(f"  * Expected Amount Accepted: 16,364,210,000 | Parsed: {data.get('amount_accepted', {}).get(91) if data.get('amount_accepted') else 'N/A'}")
        print("182-Day:")
        print(f"  * Expected Rate: 8.95 | Parsed: {data.get('accepted_average_rate', {}).get(182) if data.get('accepted_average_rate') else 'N/A'}")
        print(f"  * Expected Amount Offered: 10,000,000,000 | Parsed: {data.get('amount_offered', {}).get(182) if data.get('amount_offered') else 'N/A'}")
        print(f"  * Expected Bids Received: 8,993,350,000 | Parsed: {data.get('bids_received', {}).get(182) if data.get('bids_received') else 'N/A'}")
        print(f"  * Expected Amount Accepted: 7,092,670,000 | Parsed: {data.get('amount_accepted', {}).get(182) if data.get('amount_accepted') else 'N/A'}")
        print("364-Day:")
        print(f"  * Expected Rate: 9.0365 | Parsed: {data.get('accepted_average_rate', {}).get(364) if data.get('accepted_average_rate') else 'N/A'}")
        print(f"  * Expected Amount Offered: 10,000,000,000 | Parsed: {data.get('amount_offered', {}).get(364) if data.get('amount_offered') else 'N/A'}")
        print(f"  * Expected Bids Received: 13,560,930,000 | Parsed: {data.get('bids_received', {}).get(364) if data.get('bids_received') else 'N/A'}")
        print(f"  * Expected Amount Accepted: 13,560,930,000 | Parsed: {data.get('amount_accepted', {}).get(364) if data.get('amount_accepted') else 'N/A'}")
    except Exception as e:
        print("Failed Golden Test:", e)

    print("\n--- CBK DOCUMENT DISCOVERY ---")
    html_url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
    r = requests.get(html_url, headers={"User-Agent": "Mozilla/5.0"})
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(r.text, "html.parser")
    all_links = [a["href"].strip().lower() for a in soup.find_all("a", href=True) if ".pdf" in a["href"].lower()]
    unique_links = list(set(all_links))
    results_links = [l for l in unique_links if "result" in l]
    print(f"Raw PDF links on page: {len(all_links)}")
    print(f"Unique PDF links: {len(unique_links)}")
    print(f"Unique 'results' PDFs (Auctions): {len(results_links)}")
    
    print("\n--- PREVIOUS AUCTIONS AND HISTORICAL SAMPLES ---")
    # Grab a few recent ones
    recent = results_links[:4]
    # Grab one from 2025, 2024, 2023, 2014
    old = []
    for yr in ["2025", "2024", "2023", "2014"]:
        for link in results_links:
            if yr in link:
                old.append(link)
                break
                
    test_links = recent + old
    successful = 0
    failed = 0
    
    for link in test_links:
        full_url = "https://www.centralbank.go.ke" + link if link.startswith("/") else link
        try:
            pdf_bytes = scraper.download_pdf(full_url)
            data = scraper.extract_data_from_pdf(pdf_bytes)
            if data and data.get('amount_offered') and 91 in data['amount_offered']:
                successful += 1
                print(f"SUCCESS: {link.split('/')[-1]} | 91D Offered: {data['amount_offered'][91]}")
            else:
                failed += 1
                print(f"PARSER_FAILED (No Data): {link.split('/')[-1]}")
        except Exception as e:
            failed += 1
            print(f"PARSER_FAILED (Error): {link.split('/')[-1]} -> {e}")

    print(f"\nDocuments tested: {len(test_links)}")
    print(f"Successful exact matches: {successful}")
    print(f"Parser failures: {failed}")

if __name__ == "__main__":
    test_historical_samples()
