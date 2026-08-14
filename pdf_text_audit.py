import urllib.request
from urllib.parse import quote
from pdfminer.high_level import extract_text
import io

urls = [
    "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1837291982_RESULTS 2644-091 2618-182 2572-364 DATED 25-08-2025.pdf",
    "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/1956245095_RESULTS 2653-091 2627-182 2581-364 DATED 27-10-2025.pdf",
    "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1171311949_RESULTS 2652-091 2626-182 2580-364 DATED 20-10-2025.pdf",
    "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/523183319_RESULTS 2662-091 2636-182 2591-364 DATED 29-12-2025.pdf",
    "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/74192338_RESULTS 2661-091 2635-182 2590-364 DATED 22-12-2025.pdf",
    "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1797505205_RESULTS%202695-091%202669-182%202624-364%20DATED%2017-08-2026.pdf",
    "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/1883166998_RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf"
]

for url in urls:
    try:
        # handle spaces in URL
        encoded_url = quote(url, safe=":/%")
        req = urllib.request.Request(encoded_url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, timeout=15)
        pdf_bytes = response.read()
        
        text = extract_text(io.BytesIO(pdf_bytes))
        
        # We just want to extract a snippet that shows the values to verify.
        # Find where the numbers are.
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        print(f"\n==== URL: {url} ====")
        # Print lines that look like they contain data
        for i, line in enumerate(lines):
            if "Amount offered" in line or "Bids received" in line or "Amount Accepted" in line or "Average Rate of Accepted" in line or "91 DAYS" in line:
                print(line)
            # Also print numbers that contain commas and dots
            if any(c.isdigit() for c in line) and ('.' in line or ',' in line):
                print(line)
                
    except Exception as e:
        print(f"Error on {url}: {e}")
