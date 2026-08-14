import sys
import os
import json
import logging
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../data_pipeline/src"))
from scrapers.tbill_scraper import TBillAuctionScraper
from updaters.treasury_updater import process_and_upsert_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("audit_live")

def test_dry_run():
    logger.info("=== PHASE 2: DISCOVERY & PHASE 3 & 4: DRY RUN PARSE ===")
    from updaters.treasury_updater import run_updater
    
    # We will just run the updater with dry_run=True and see its logs.
    run_updater(trigger_type="DRY_RUN_AUDIT", dry_run=True)

def test_failure_modes():
    logger.info("\n=== PHASE 8: FAILURE MODES ===")
    scraper = TBillAuctionScraper()
    # 1. Malformed PDF
    res = process_and_upsert_pdf(b"not a pdf", "http://test/123.pdf", scraper, dry_run=True)
    logger.info(f"Malformed PDF Status: {res['status']}, Errors: {res['errors']}")
    
    # 2. No Treasury Bill table
    blank_pdf = requests.get("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf").content
    res = process_and_upsert_pdf(blank_pdf, "http://test/456.pdf", scraper, dry_run=True)
    logger.info(f"No Table Status: {res['status']}, Errors: {res['errors']}")
    
if __name__ == "__main__":
    test_dry_run()
    test_failure_modes()
