"""
Fetch and dump COMPLETE raw text from a CBK Treasury Bill PDF.
Used to understand the full document structure for parser design.
"""
import sys
import io
import urllib.request
import urllib.parse
from pdfminer.high_level import extract_text

urls = {
    "issue_2694_aug_2026": "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1883166998_RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf",
    "issue_2644_aug_2025": "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1837291982_RESULTS 2644-091 2618-182 2572-364 DATED 25-08-2025.pdf",
    "issue_2662_dec_2025": "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/523183319_RESULTS 2662-091 2636-182 2591-364 DATED 29-12-2025.pdf",
    "issue_2661_dec_2025": "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/74192338_RESULTS 2661-091 2635-182 2590-364 DATED 22-12-2025.pdf",
}

for label, url in urls.items():
    print(f"\n{'='*80}")
    print(f"PDF: {label}")
    print(f"URL: {url}")
    print('='*80)
    try:
        encoded_url = urllib.parse.quote(url, safe=":/%")
        req = urllib.request.Request(encoded_url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=20)
        pdf_bytes = resp.read()
        text = extract_text(io.BytesIO(pdf_bytes))
        # Print full text with line numbers
        for i, line in enumerate(text.split('\n'), 1):
            print(f"{i:4d}: {repr(line)}")
    except Exception as e:
        print(f"ERROR: {e}")
