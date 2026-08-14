import os
import sys
import logging
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
import json
import urllib.parse
from collections import defaultdict
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline", "src"))
from scrapers.tbill_scraper import TBillAuctionScraper

logging.basicConfig(level=logging.INFO, format="%(message)s")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

def date_from_string(s):
    s = s.replace(".", "-").replace("_", "-")
    match = re.search(r"(\d{1,2})-(\d{1,2})-(\d{4})", s)
    if match:
        part1 = int(match.group(1))
        part2 = int(match.group(2))
        yr = int(match.group(3))
        try:
            if part2 > 12:
                return datetime(yr, part1, part2)
            else:
                return datetime(yr, part2, part1)
        except ValueError:
            pass
    match = re.search(r"(\d{1,2})-(\w{3})-(\d{4})", s)
    if match:
        try:
            return datetime.strptime(match.group(0), "%d-%b-%Y")
        except:
            pass
    match = re.search(r"(\d{1,2})-(\d{1,2})-(\d{2})(?!\d)", s)
    if match:
        part1 = int(match.group(1))
        part2 = int(match.group(2))
        yr = int(match.group(3))
        yr = yr + 2000 if yr < 50 else yr + 1900
        try:
            if part2 > 12:
                return datetime(yr, part1, part2)
            else:
                return datetime(yr, part2, part1)
        except ValueError:
            pass
    return None

def issue_from_string(s):
    # Extracts the 91-day issue number (usually e.g. 2695-091 or 2695-91)
    match = re.search(r"(\d{4})-(?:091|91)", s)
    if match:
        return int(match.group(1))
    return None

def is_in_period(url, start_date, end_date):
    url_decoded = urllib.parse.unquote(url).lower()
    dt = date_from_string(url_decoded)
    if dt:
        return start_date <= dt <= end_date
    return False

def get_db_records():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase credentials for comparison.")
        return []
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    url = f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?select=*"
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        print(f"Failed to fetch DB records: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error fetching DB records: {e}")
    return []

def run_dry_run():
    print("Starting Discovery...")
    scraper = TBillAuctionScraper()
    
    html_url = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"
    r = requests.get(html_url, headers={"User-Agent": "Mozilla/5.0"})
    soup = BeautifulSoup(r.text, "html.parser")
    all_links = [a["href"].strip() for a in soup.find_all("a", href=True) if ".pdf" in a["href"].lower()]
    
    unique_links = list(set(all_links))
    results_links = [l for l in unique_links if "result" in l.lower()]
    
    start_date = datetime(2025, 8, 14)
    end_date = datetime(2026, 8, 14)
    
    relevant_links_dict = {}
    for link in results_links:
        if is_in_period(link, start_date, end_date):
            url_decoded = urllib.parse.unquote(link).lower()
            dt = date_from_string(url_decoded)
            if dt:
                # Deduplicate by auction date
                date_str = dt.strftime("%Y-%m-%d")
                if date_str not in relevant_links_dict:
                    relevant_links_dict[date_str] = link

    relevant_links = list(relevant_links_dict.values())
            
    print(f"Raw matching URLs: {len(all_links)}")
    print(f"Unique URLs: {len(unique_links)}")
    print(f"Unique auction publications (all-time): {len(results_links)}")
    print(f"Relevant 12-month auction publications: {len(relevant_links)}")
    
    observations = []
    statuses = defaultdict(int)
    
    samples = {
        "AugSep25": [], "Oct25": [], "Dec25": [], "Feb26": [], "Apr26": [], "Jun26": [], "Aug26": []
    }
    
    print("\nProcessing publications...")
    for link in relevant_links:
        full_url = "https://www.centralbank.go.ke" + link if link.startswith("/") else link
        url_decoded = urllib.parse.unquote(link).lower()
        dt = date_from_string(url_decoded)
        base_issue = issue_from_string(url_decoded)
        
        try:
            pdf_bytes = scraper.download_pdf(full_url)
            data = scraper.extract_data_from_pdf(pdf_bytes)
            
            if data and "amount_offered" in data and len(data["amount_offered"]) > 0:
                statuses["PARSED"] += 1
                
                if dt:
                    bucket = None
                    if dt.year == 2025 and dt.month in [8, 9]: bucket = "AugSep25"
                    elif dt.year == 2025 and dt.month == 10: bucket = "Oct25"
                    elif dt.year == 2025 and dt.month == 12: bucket = "Dec25"
                    elif dt.year == 2026 and dt.month == 2: bucket = "Feb26"
                    elif dt.year == 2026 and dt.month == 4: bucket = "Apr26"
                    elif dt.year == 2026 and dt.month == 6: bucket = "Jun26"
                    elif dt.year == 2026 and dt.month == 8: bucket = "Aug26"
                    
                    if bucket and len(samples[bucket]) < 2:
                        samples[bucket].append((full_url, data))
                        
                # Extract for each tenor
                for tenor in [91, 182, 364]:
                    if tenor in data.get("amount_offered", {}):
                        # Approximate the issue numbers for 182 and 364 if base_issue is found
                        issue_num = "UNKNOWN"
                        if base_issue:
                            if tenor == 91: issue_num = base_issue
                            elif tenor == 182: issue_num = base_issue - 26
                            elif tenor == 364: issue_num = base_issue - 71

                        obs = {
                            "tenor": tenor,
                            "issue_number": issue_num,
                            "date": dt.strftime("%Y-%m-%d") if dt else "UNKNOWN",
                            "rate": data.get("accepted_average_rate", {}).get(tenor),
                            "offered": data.get("amount_offered", {}).get(tenor),
                            "received": data.get("bids_received", {}).get(tenor),
                            "accepted": data.get("amount_accepted", {}).get(tenor),
                            "performance_rate": data.get("performance_rate", {}).get(tenor),
                            "market_average_rate": data.get("market_average_rate", {}).get(tenor),
                            "url": full_url
                        }
                        observations.append(obs)
            else:
                statuses["PARSER_FAILED"] += 1
        except requests.exceptions.RequestException:
            statuses["HTTP_FAILED"] += 1
        except Exception as e:
            statuses["PARSER_FAILED"] += 1

    print("\n--- RESULTS ---")
    print(f"PARSED: {statuses['PARSED']}")
    print(f"PARSER_FAILED: {statuses['PARSER_FAILED']}")
    print(f"HTTP_FAILED: {statuses['HTTP_FAILED']}")
    
    succ_rate = statuses['PARSED'] / len(relevant_links) * 100 if relevant_links else 0
    print(f"Successful parse rate: {succ_rate:.2f}%")
    
    with open("dry_run_samples.json", "w") as f:
        json.dump(samples, f, indent=2)
        
    with open("dry_run_observations.json", "w") as f:
        json.dump(observations, f, indent=2)

    db_records = get_db_records()
    print(f"\nExisting database records: {len(db_records)}")

if __name__ == "__main__":
    run_dry_run()
