import sys
import os
import requests
import pdfplumber
import io
import re

pdf_url = "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1797505205_RESULTS 2695-091 2669-182 2624-364 DATED 17-08-2026.pdf"

r = requests.get(pdf_url, headers={"User-Agent": "Mozilla/5.0"}, verify=False)
pdf_bytes = r.content

with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
    text = pdf.pages[0].extract_text()
    
def extract_numbers(line_prefix):
    pattern = line_prefix + r".{0,100}?(?=[\d, ]+\.\d{2,4})((?:[\d, ]+\.\d{2,4}%?\s*){3})"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        line = match.group(1)
        numbers = re.findall(r"[\d, ]+\.\d{2,4}", line)
        return [n.replace(" ", "") for n in numbers]
    return []

print(f"URL: {pdf_url}")
print(f"Amount Offered RAW: {extract_numbers('Amount Offered')}")
print(f"Bids Received RAW: {extract_numbers('Bids Received')}")
print(f"Amount Accepted RAW: {extract_numbers('(?:Total )?Amount Accepted')}")
print(f"Performance Rate RAW: {extract_numbers('Performance Rate')}")
print(f"Accepted Rate RAW: {extract_numbers(r'Weighted Average Interest Rate of\s*(?:accepted bids)?')}")

