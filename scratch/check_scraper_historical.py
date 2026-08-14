import urllib.request
import re
import pdfplumber
import io
import sys
import urllib.parse
import bs4

sys.path.append('data_pipeline')
from src.scrapers.tbill_scraper import TBillAuctionScraper

url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

soup = bs4.BeautifulSoup(html, 'html.parser')
pdf_urls = []
for a in soup.find_all('a', href=True):
    if 'RESULTS' in a['href'] and '.pdf' in a['href'].lower() and 'historical_treasury_bill_results' in a['href']:
        full = "https://www.centralbank.go.ke" + a['href'] if a['href'].startswith('/') else a['href']
        if full not in pdf_urls:
            pdf_urls.append(full)

# Find 2694, mid-2026, and Christmas 2025
target_urls = []
for u in pdf_urls:
    if "2694" in u:
        target_urls.append(u)
    elif "14-05-2026" in u or "15-05-2026" in u or "01-06-2026" in u or "DATED%2014-05-2026" in u or "2682" in u:
        # mid 2026
        target_urls.append(u)
    elif "25-12-2025" in u or "30-12-2025" in u or "29-12-2025" in u or "2662" in u:
        # xmas 2025
        target_urls.append(u)

# Fallback manually
if len(target_urls) < 3:
    target_urls = []
    for u in pdf_urls:
        if "2694" in u:
            target_urls.append(u)
        if "04-05-2026" in u:
            target_urls.append(u)
        if "29-12-2025" in u:
            target_urls.append(u)

print("Targets found:", len(target_urls))
for pdf_url in target_urls[:3]:
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
