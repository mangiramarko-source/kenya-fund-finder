import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import pdfplumber
import io
import re

base_url = "https://www.centralbank.go.ke"
url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read()
soup = BeautifulSoup(html, 'html.parser')

links = []
for a in soup.find_all('a', href=True):
    if 'Auction Results' in a.text or 'T-Bill Results' in a.text or '.pdf' in a['href'].lower():
        if 'treasury-bills' in a['href'] or 'results' in a['href'].lower():
            full_url = urllib.parse.urljoin(base_url, a['href'])
            # fix spaces in url
            full_url = urllib.parse.quote(full_url, safe="%/:=&?~#+!$,;'@()*[]")
            if full_url not in [lnk['url'] for lnk in links]:
                links.append({'text': a.text.strip(), 'url': full_url})

# Grab top 6 to find a few examples
for link in links[:6]:
    print(f"\n--- {link['text']} --- URL: {link['url']}")
    try:
        pdf_req = urllib.request.Request(link['url'], headers={'User-Agent': 'Mozilla/5.0'})
        pdf_bytes = urllib.request.urlopen(pdf_req).read()
        
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            text = pdf.pages[0].extract_text()
            print("==== EXTRACTED TEXT ====")
            print(text)
    except Exception as e:
        print(e)
