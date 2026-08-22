"""
Automated Treasury Updater for KenyaFundFinder
Fetches, verifies, parses, and upserts official Central Bank of Kenya (CBK)
Treasury Bill auction data into Supabase.

Safeguards:
- Idempotent (upserts on natural keys: issue_number + tenor_days)
- Date semantics enforced: auction_date and issue_date extracted independently
  from the CBK PDF — never from filename alone, never by subtraction
- Parser validation (fails safely without overwriting good data)
- Preserves raw source provenance (source_url, source_document)
- Does not substitute mock or zero values
- Scheduler NOT deployed — this script is invoked manually or by CI trigger
"""

import os
import sys
import re
import io
import logging
import time
from datetime import datetime, date as date_type, timezone
import requests
import pdfplumber

# Add parent src/ to path so we can import the scraper
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scrapers.tbill_scraper import TBillAuctionScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Environment
# ──────────────────────────────────────────────────────────────────────────────

def load_local_env():
    env_path = os.path.join(os.path.dirname(__file__), "../../../.env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("'\""))

load_local_env()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    logger.error("CRITICAL: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

CBK_PAGES_TO_CHECK = [
    "https://www.centralbank.go.ke/",
    "https://www.centralbank.go.ke/bills-bonds/treasury-bills/",
]


# ──────────────────────────────────────────────────────────────────────────────
# DB helpers
# ──────────────────────────────────────────────────────────────────────────────

def fetch_html(url: str) -> str | None:
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        return r.text
    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return None


def extract_pdf_urls(html_content: str) -> list[str]:
    if not html_content:
        return []
    pattern = r'href=["\']([^"\']+\.pdf)["\']'
    matches = re.findall(pattern, html_content)
    urls = []
    for m in matches:
        if "result" not in m.lower():
            continue
        if not m.startswith("http"):
            m = "https://www.centralbank.go.ke" + (m if m.startswith("/") else "/" + m)
        if m not in urls:
            urls.append(m)
    return urls


def check_db_latest_tbill() -> dict | None:
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions"
            "?select=issue_number,auction_date,issue_date"
            "&order=auction_date.desc&limit=1",
            headers=HEADERS,
            timeout=10,
        )
        if r.status_code == 200 and r.json():
            return r.json()[0]
    except Exception as e:
        logger.error(f"Error checking DB state: {e}")
    return None


def start_update_run(trigger_type: str = "SCHEDULED") -> str | None:
    try:
        payload = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "status": "RUNNING",
            "trigger_type": trigger_type,
        }
        req_headers = HEADERS.copy()
        req_headers["Prefer"] = "return=representation"
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/treasury_update_runs",
            headers=req_headers, json=payload, timeout=10
        )
        r.raise_for_status()
        if r.status_code == 201 and r.json():
            return r.json()[0]["id"]
    except Exception as e:
        logger.error(f"Failed to create update run: {e}")
    return None


def finalize_update_run(run_id, status, error_code=None,
                        error_message=None, records_detected=0,
                        records_inserted=0):
    if not run_id:
        return
    try:
        payload = {
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "status": status,
            "records_detected": records_detected,
            "records_inserted": records_inserted,
        }
        if error_code:
            payload["error_code"] = error_code
            payload["error_message"] = str(error_message)
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/treasury_update_runs?id=eq.{run_id}",
            headers=HEADERS, json=payload, timeout=10
        )
    except Exception as e:
        logger.error(f"Failed to finalize update run: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# Date validation
# ──────────────────────────────────────────────────────────────────────────────

class DateExtractionError(ValueError):
    """Raised when dates cannot be reliably extracted from a CBK PDF."""
    pass


def validate_extracted_dates(date_info: dict, source_url: str) -> tuple[str, str]:
    """
    Validate the result of extract_dates_from_pdf() and return
    (auction_date, issue_date) as ISO strings.

    Raises DateExtractionError if any of the following are true:
      - auction_date is None   → cannot proceed without authoritative source
      - issue_date is None     → cannot proceed without settlement date
      - confidence is CONFLICT → two authoritative sources disagree
      - auction_date >= issue_date → order violation

    Logs a WARNING (but does not raise) for:
      - MEDIUM confidence
      - UNUSUAL_GAP warnings
    """
    confidence = date_info.get("confidence", "LOW")
    warnings   = date_info.get("warnings", [])

    if not date_info.get("auction_date"):
        raise DateExtractionError(
            f"MISSING_AUCTION_DATE: PDF footer date not found in {source_url}\n"
            f"Warnings: {warnings}"
        )

    if not date_info.get("issue_date"):
        raise DateExtractionError(
            f"MISSING_ISSUE_DATE: DATED header/URL date not found in {source_url}\n"
            f"Warnings: {warnings}"
        )

    if confidence == "CONFLICT":
        raise DateExtractionError(
            f"DATE_SOURCE_CONFLICT: Dates in {source_url} are contradictory.\n"
            f"Warnings: {warnings}"
        )

    if confidence in ("LOW",):
        raise DateExtractionError(
            f"LOW_CONFIDENCE: Could not reliably extract dates from {source_url}\n"
            f"Warnings: {warnings}"
        )

    # Non-fatal: log but continue
    if confidence == "MEDIUM":
        logger.warning(
            f"MEDIUM confidence for {source_url}: {warnings}"
        )
    for w in warnings:
        if "UNUSUAL_GAP" in w:
            logger.warning(f"UNUSUAL_SETTLEMENT_GAP in {source_url}: {w}")

    return date_info["auction_date"], date_info["issue_date"]


# ──────────────────────────────────────────────────────────────────────────────
# PDF processing pipeline
# ──────────────────────────────────────────────────────────────────────────────

def process_and_upsert_pdf(
    pdf_bytes: bytes,
    source_url: str,
    scraper: TBillAuctionScraper,
    dry_run: bool = False,
) -> dict:
    """
    Full pipeline for one CBK T-Bill results PDF:
      1. Extract financial data (amounts, rates)
      2. Extract dates independently (auction_date, issue_date)
      3. Validate both — fail safely rather than insert corrupted data
      4. Upsert all three tenors (91, 182, 364) into treasury_bill_auctions

    Returns a summary dict with counts and status.
    """
    result = {
        "source_url": source_url,
        "status": "UNKNOWN",
        "new": 0,
        "changed": 0,
        "unchanged": 0,
        "writes": 0,
        "auction_date": None,
        "issue_date": None,
        "errors": [],
    }

    # ── Step 1: Financial data ─────────────────────────────────────────────────
    try:
        financial = scraper.extract_data_from_pdf(pdf_bytes)
    except Exception as e:
        result["status"] = "PARSER_FAILED"
        result["errors"].append(f"FINANCIAL_PARSE_ERROR: {e}")
        logger.error(f"Financial parsing failed for {source_url}: {e}")
        return result

    required_keys = {"amount_offered", "bids_received", "amount_accepted",
                     "market_average_rate", "accepted_average_rate"}
    missing = required_keys - set(financial.keys())
    if missing:
        result["status"] = "PARSER_INCOMPLETE"
        result["errors"].append(f"MISSING_FINANCIAL_FIELDS: {missing}")
        logger.error(f"Incomplete parse for {source_url}: missing {missing}")
        return result

    # ── Step 2: Date extraction ────────────────────────────────────────────────
    try:
        date_info = scraper.extract_dates_from_pdf(pdf_bytes, source_url=source_url)
        auction_date, issue_date = validate_extracted_dates(date_info, source_url)
        result["auction_date"] = auction_date
        result["issue_date"]   = issue_date
    except DateExtractionError as e:
        result["status"] = "DATE_EXTRACTION_FAILED"
        result["errors"].append(str(e))
        logger.error(f"Date extraction failed for {source_url}:\n{e}")
        # STOP — do not insert with corrupted dates
        return result

    # ── Step 3: Build records ──────────────────────────────────────────────────
    # Extract issue numbers from source URL filename
    # e.g. "RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf"
    import urllib.parse
    fn = urllib.parse.unquote(source_url.split("/")[-1])
    issue_nums = {}
    for tenor in (91, 182, 364):
        m = re.search(rf'\b(\d+)-0*{tenor}\b', fn)
        if m:
            issue_nums[tenor] = f"{m.group(1)}/{tenor:03d}"

    records_to_upsert = []
    for tenor in (91, 182, 364):
        ao = financial["amount_offered"].get(tenor)
        br = financial["bids_received"].get(tenor)
        aa = financial["amount_accepted"].get(tenor)
        mr = financial["market_average_rate"].get(tenor)
        ar = financial["accepted_average_rate"].get(tenor)

        if ao is None or br is None or aa is None:
            logger.warning(f"Tenor {tenor} missing financial data for {source_url} — skipping")
            continue

        record = {
            "tenor_days":            tenor,
            "issue_number":          issue_nums.get(tenor, f"UNKNOWN/{tenor}"),
            "auction_date":          auction_date,
            "issue_date":            issue_date,
            "amount_offered":        ao,
            "bids_received":         br,
            "amount_accepted":       aa,
            "market_average_rate":   mr,
            "accepted_average_rate": ar,
            "source_url":            source_url,
            "retrieved_at":          datetime.now(timezone.utc).isoformat(),
        }
        records_to_upsert.append(record)

    result["records_detected"] = len(records_to_upsert)

    # ── Step 4: Existing-record lookup & classification ────────────────────────
    import urllib.parse
    
    # Batch query production for these exact issue numbers & tenors
    # E.g. issue_number in (2695/091, 2669/182, 2624/364)
    # We will fetch all existing matches.
    existing_records = {}
    issue_number_list = [r["issue_number"] for r in records_to_upsert]
    if issue_number_list:
        try:
            # use explicit REST filter, quoting values to handle special chars like /
            issue_nums_query = ",".join(f'"{num}"' for num in issue_number_list)
            # URL encode the query string
            encoded_query = urllib.parse.quote(f"in.({issue_nums_query})")
            
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?issue_number={encoded_query}",
                headers=HEADERS,
                timeout=15,
            )
            r.raise_for_status()
            for row in r.json():
                key = (row["issue_number"], row["tenor_days"])
                existing_records[key] = row
        except Exception as e:
            result["status"] = "LOOKUP_FAILED"
            result["errors"].append(f"DB_LOOKUP_ERROR: {e}")
            logger.error(f"Failed to lookup existing records: {e}")
            return result

    # Classify each parsed record
    material_fields = [
        "auction_date", "issue_date", "amount_offered", "bids_received",
        "amount_accepted", "market_average_rate", "accepted_average_rate"
    ]
    
    records_to_insert = []
    abort_publication = False

    for record in records_to_upsert:
        key = (record["issue_number"], record["tenor_days"])
        existing = existing_records.get(key)
        
        if not existing:
            result["new"] += 1
            records_to_insert.append(record)
            continue
            
        # Check for differences
        differences = []
        for field in material_fields:
            parsed_val = record[field]
            existing_val = existing.get(field)
            
            # Type alignment for comparison (float vs float/int, date str vs date str)
            if isinstance(parsed_val, (int, float)) and existing_val is not None:
                if abs(float(parsed_val) - float(existing_val)) > 0.0001:
                    differences.append((field, existing_val, parsed_val))
            elif str(parsed_val) != str(existing_val):
                differences.append((field, existing_val, parsed_val))
                
        if not differences:
            result["unchanged"] += 1
            logger.info(f"UNCHANGED: {key[0]} {key[1]}d already exists identically. Skipping.")
        else:
            result["changed"] += 1
            abort_publication = True
            logger.error("FLAG_EXISTING_RECORD_DIFFERENCE")
            for diff in differences:
                logger.error(f"issue_number: {record['issue_number']}\n"
                             f"tenor_days: {record['tenor_days']}\n"
                             f"field: {diff[0]}\n"
                             f"production_value: {diff[1]}\n"
                             f"newly_parsed_value: {diff[2]}\n"
                             f"source_url: {source_url}\n")
                             
    if dry_run:
        logger.info(f"DRY RUN — new: {result['new']}, changed: {result['changed']}, unchanged: {result['unchanged']}")
        result["status"] = "DRY_RUN_OK"
        return result

    if abort_publication:
        result["status"] = "ABORTED_CHANGES_DETECTED"
        result["errors"].append("Publication contains changed values for existing records. Aborting to protect historical data.")
        logger.error("ABORTED: Refusing to automatically overwrite verified historical data.")
        return result

    # ── Step 5: Atomic Batch Write ───────────────────────────────────────────────
    if records_to_insert:
        try:
            # We explicitly add on_conflict to ensure the unique constraint handles races
            req_headers = HEADERS.copy()
            req_headers["Prefer"] = "resolution=merge-duplicates" 
            
            # PostgREST bulk insert
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions?on_conflict=issue_number,tenor_days",
                headers=req_headers,
                json=records_to_insert,
                timeout=15,
            )
            r.raise_for_status()
            result["writes"] = len(records_to_insert)
            logger.info(f"Successfully bulk inserted {result['writes']} new records.")
        except Exception as e:
            result["errors"].append(f"BULK_UPSERT_ERROR: {e}")
            logger.error(f"Bulk upsert failed: {e}")

    result["status"] = "SUCCESS" if not result["errors"] else "PARTIAL_SUCCESS"
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def run_updater(trigger_type: str = "SCHEDULED",
                mock_pdf_bytes: bytes = None,
                dry_run: bool = False):
    logger.info(f"Starting Treasury update check (trigger={trigger_type}, dry_run={dry_run})")
    run_id = start_update_run(trigger_type)
    scraper = TBillAuctionScraper()

    try:
        db_latest = check_db_latest_tbill()
        logger.info(f"Latest stored T-Bill auction in DB: {db_latest}")

        # ── Discover PDFs ──────────────────────────────────────────────────────
        pdf_urls = []
        if mock_pdf_bytes is None:
            for page_url in CBK_PAGES_TO_CHECK:
                html = fetch_html(page_url)
                for u in extract_pdf_urls(html or ""):
                    if u not in pdf_urls:
                        pdf_urls.append(u)
            logger.info(f"Discovered {len(pdf_urls)} T-Bill result PDFs on CBK")
            if not pdf_urls:
                finalize_update_run(run_id, "SUCCESS_NO_CHANGE")
                return

            latest_pdf_url = pdf_urls[0]
            logger.info(f"Processing: {latest_pdf_url}")
            r = requests.get(latest_pdf_url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            pdf_bytes = r.content
        else:
            pdf_bytes = mock_pdf_bytes
            latest_pdf_url = "mock://test"

        # ── Process PDF ────────────────────────────────────────────────────────
        result = process_and_upsert_pdf(
            pdf_bytes, latest_pdf_url, scraper, dry_run=dry_run
        )

        if result["status"] in ("PARSER_FAILED", "PARSER_INCOMPLETE",
                                 "DATE_EXTRACTION_FAILED"):
            finalize_update_run(
                run_id, result["status"],
                error_code=result["status"],
                error_message="; ".join(result["errors"]),
            )
        else:
            finalize_update_run(
                run_id, "SUCCESS_NEW_DATA",
                records_detected=result.get("records_detected", 0),
                records_inserted=result.get("writes", 0),
            )

        logger.info(f"Treasury update complete: {result}")

    except Exception as e:
        logger.error(f"Unexpected failure: {e}")
        finalize_update_run(run_id, "FETCH_FAILED",
                            error_code="FETCH_ERR", error_message=str(e))


if __name__ == "__main__":
    # Default: run in dry_run mode for safety; pass --live to write to DB
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true",
                    help="Actually write to production (default: dry-run)")
    ap.add_argument("--trigger", default="MANUAL")
    args = ap.parse_args()
    run_updater(trigger_type=args.trigger, dry_run=not args.live)
