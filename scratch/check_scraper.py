import urllib.request
import re
import pdfplumber
import io
import sys
sys.path.append('data_pipeline')
from src.scrapers.tbill_scraper import TBillAuctionScraper

url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

pdf_urls = []
import bs4
soup = bs4.BeautifulSoup(html, 'html.parser')
for a in soup.find_all('a', href=True):
    if 'RESULTS' in a['href'] and '.pdf' in a['href'].lower() and 'historical_treasury_bill_results' in a['href']:
        full = "https://www.centralbank.go.ke" + a['href'] if a['href'].startswith('/') else a['href']
        if full not in pdf_urls:
            pdf_urls.append(full)

import urllib.parse
for pdf_url in pdf_urls[:3]:
    print(f"--- {pdf_url} ---")
    safe_url = urllib.parse.quote(pdf_url, safe=":/")
    pdf_bytes = urllib.request.urlopen(urllib.request.Request(safe_url, headers={'User-Agent': 'Mozilla/5.0'})).read()
    
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        text = pdf.pages[0].extract_text()
        print("RAW PDF TEXT SNIPPET (RATES):")
        for line in text.split('\n'):
            if '%' in line or 'Rate' in line or 'Average' in line:
                print(line)
                
    scraper = TBillAuctionScraper()
    parsed = scraper.extract_data_from_pdf(pdf_bytes)
    print("PARSER OUTPUT:")
    print("Market Average Rate:", parsed.get('market_average_rate'))
    print("Accepted Average Rate:", parsed.get('accepted_average_rate'))
    print()
