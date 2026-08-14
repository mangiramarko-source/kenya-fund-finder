#!/usr/bin/env python3
"""
date_repair_preview.py — Phase 4: Read-only repair preview

For every treasury_bill_auctions record where auction_date == issue_date
(the 156 backfilled records with corrupted date semantics), this script:

  1. Fetches the original CBK PDF for each unique publication URL
  2. Extracts the authoritative auction_date and issue_date using the
     enhanced parser (extract_dates_from_pdf)
  3. Reports what WOULD change — without writing anything to production
  4. Groups results by CBK publication (3 tenors per publication)
  5. Flags any ambiguous, conflicting, or unresolvable records

NO PRODUCTION WRITES ARE MADE BY THIS SCRIPT.

Outputs:
  date_repair_preview.json          — structured data (all publications)
  date_repair_preview_report.md     — human-readable summary report
"""

import os
import sys
import json
import time
import requests
import io
import re
import urllib.parse
from datetime import datetime, date, timezone
from collections import defaultdict

# Add data_pipeline/src to path so we can import the scraper
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "data_pipeline", "src"))
from scrapers.tbill_scraper import TBillAuctionScraper

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

RATE_LIMIT_SECONDS = 0.75   # polite pause between PDF downloads
REQUEST_TIMEOUT    = 30     # seconds per HTTP request


# ──────────────────────────────────────────────────────────────────────────────
# Database helpers
# ──────────────────────────────────────────────────────────────────────────────

def _supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

def fetch_all_records():
    """Return all treasury_bill_auctions rows (up to 1000)."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/treasury_bill_auctions"
        "?select=id,issue_number,tenor_days,auction_date,issue_date,"
        "source_url,market_average_rate,amount_offered,bids_received,"
        "amount_accepted,accepted_average_rate"
        "&order=auction_date.desc&limit=1000",
        headers=_supabase_headers(),
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


# ──────────────────────────────────────────────────────────────────────────────
# Report helpers
# ──────────────────────────────────────────────────────────────────────────────

def _row_flag(tenor_row):
    """Return one-line status indicator for a tenor row."""
    if tenor_row["confidence"] == "HIGH" and tenor_row.get("requires_correction"):
        return "✅ CORRECT (ready to repair)"
    if tenor_row["confidence"] == "CONFLICT":
        return "🔴 CONFLICT"
    if tenor_row["confidence"] == "LOW":
        return "🟡 LOW CONFIDENCE"
    if tenor_row.get("requires_correction") is None:
        return "⚠️  AMBIGUOUS"
    if not tenor_row.get("requires_correction"):
        return "✅ ALREADY CORRECT"
    return f"🔵 {tenor_row['confidence']}"


def build_markdown_report(output: dict) -> str:
    s = output["summary"]
    lines = []

    lines.append("# Treasury Bill Date Repair Preview Report")
    lines.append(f"\n_Generated: {output['generated_at']} (READ-ONLY — no production writes)_\n")

    # ── Summary box ──
    lines.append("## Summary\n")
    lines.append("| Metric | Count |")
    lines.append("|--------|-------|")
    lines.append(f"| Publications scanned | {s['publications_scanned']} |")
    lines.append(f"| Records scanned | {s['records_scanned']} |")
    lines.append(f"| Records requiring correction | {s['records_requiring_correction']} |")
    lines.append(f"| Already-correct records (not in scope) | {s['already_correct_count']} |")
    lines.append(f"| High-confidence detections | {s['high_confidence']} |")
    lines.append(f"| Medium-confidence detections | {s['medium_confidence']} |")
    lines.append(f"| Missing auction dates | {s['missing_auction_dates']} |")
    lines.append(f"| Missing issue dates | {s['missing_issue_dates']} |")
    lines.append(f"| Source conflicts | {s['source_conflicts']} |")
    lines.append(f"| Unusual settlement gaps | {s['unusual_settlement_gaps']} |")
    lines.append(f"| Ambiguous publications | {s['ambiguous']} |")
    lines.append(f"| PDF fetch errors | {s['pdf_errors']} |")
    lines.append("")

    # ── Go/no-go decision ──
    blockers = (s['missing_auction_dates'] + s['source_conflicts'] + s['ambiguous']
                + s['pdf_errors'])
    if blockers == 0:
        lines.append("> **GO: No blocking issues found. Preview is clean.**")
        lines.append("> All publications are resolved at HIGH or MEDIUM confidence.")
        lines.append("> Production repair may proceed after independent verification.")
    else:
        lines.append("> **NO-GO: Blocking issues found — see Exceptions section.**")
        lines.append(f"> {blockers} publications cannot be repaired automatically.")
    lines.append("")

    # ── Already-correct records ──
    if output.get("already_correct"):
        lines.append("## Already-Correct Records (not in scope)\n")
        lines.append("These records have `auction_date != issue_date` and will not be touched:\n")
        for r in output["already_correct"]:
            lines.append(f"- `{r['issue_number']}` tenor={r['tenor_days']}d "
                         f"auction={r['auction_date']} issue={r['issue_date']}")
        lines.append("")

    # ── Publications detail ──
    lines.append("## Publications Detail\n")
    lines.append("_Grouped by CBK publication (one PDF = three tenors)._\n")

    for i, pub in enumerate(output["publications"], 1):
        url_short = pub["source_url"].split("/")[-1][:70]
        lines.append(f"### [{i}] `{url_short}`")
        lines.append("")
        lines.append(f"| Field | Value |")
        lines.append("|-------|-------|")
        lines.append(f"| Detected auction_date | `{pub['detected_auction_date'] or 'MISSING'}` |")
        lines.append(f"| Detected issue_date | `{pub['detected_issue_date'] or 'MISSING'}` |")
        lines.append(f"| Footer date | `{pub['footer_date'] or '—'}` |")
        lines.append(f"| Next-auction bids deadline (Section D) | `{pub['next_auction_bids_deadline'] or '—'}` [{pub.get('next_auction_bids_weekday', '—')}] |")
        lines.append(f"| Next-auction closure (Section C table) | `{pub['next_auction_closure_ddmmyyyy'] or '—'}` |")
        lines.append(f"| auction_date source | `{pub['auction_date_source'] or '—'}` |")
        lines.append(f"| issue_date source | `{pub['issue_date_source'] or '—'}` |")
        lines.append(f"| Settlement gap days | `{pub['settlement_gap_days']}` |")
        lines.append(f"| Confidence | `{pub['confidence']}` |")
        if pub["warnings"]:
            lines.append(f"| Warnings | {'; '.join(pub['warnings'])} |")
        lines.append("")

        # Tenor table
        lines.append("| Issue No. | Tenor | Current auction_date | Detected auction_date | Δ | Current issue_date | Detected issue_date | Status |")
        lines.append("|-----------|-------|----------------------|-----------------------|---|-------------------|---------------------|--------|")
        for t in pub["tenors"]:
            delta = "→" if t.get("requires_correction") else "="
            lines.append(
                f"| `{t['issue_number']}` | {t['tenor_days']}d "
                f"| `{t['current_auction_date']}` | `{t['detected_auction_date'] or 'MISSING'}` | {delta} "
                f"| `{t['current_issue_date']}` | `{t['detected_issue_date'] or 'MISSING'}` "
                f"| {_row_flag(t)} |"
            )
        lines.append("")

    # ── Exceptions ──
    if output.get("exceptions"):
        lines.append("## ⛔ Exceptions (must resolve before production repair)\n")
        for exc in output["exceptions"]:
            lines.append(f"- **{exc['source_url'].split('/')[-1][:60]}**")
            lines.append(f"  - Confidence: `{exc['confidence']}`")
            for w in exc["warnings"]:
                lines.append(f"  - ⚠️ {w}")
        lines.append("")

    # ── Notes on date semantics ──
    lines.append("## Notes on CBK PDF Date Semantics\n")
    lines.append("This report uses the following authoritative sources:\n")
    lines.append("| Field | Primary Source | Secondary / Cross-check |")
    lines.append("|-------|----------------|--------------------------|")
    lines.append("| `auction_date` | Footer `Month DD, YYYY` below Director's signature | Section C table `Auction Dates & Bids Closure` (refers to NEXT auction) |")
    lines.append("| `issue_date` | Section A header `DATED DD/MM/YYYY` | URL filename `DATED DD-MM-YYYY` |")
    lines.append("")
    lines.append("**Important:** The `\"Bids must be submitted...\"` text in Section D refers to the **NEXT** auction's bid-closing date, not the current one. It is extracted for documentation only.\n")

    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("TREASURY BILL DATE REPAIR PREVIEW  (READ-ONLY — no DB writes)")
    print("=" * 70)
    print()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL / SUPABASE_KEY not set in environment.")
        sys.exit(1)

    # ── 1. Fetch all records from production ──────────────────────────────────
    print("Fetching all treasury_bill_auctions records from production...")
    all_records = fetch_all_records()
    print(f"  Total records: {len(all_records)}")

    # Partition: affected = auction_date == issue_date (backfilled, wrong)
    affected  = [r for r in all_records if r["auction_date"] == r["issue_date"]]
    correct   = [r for r in all_records if r["auction_date"] != r["issue_date"]]

    print(f"  Affected (auction_date == issue_date): {len(affected)}")
    print(f"  Already correct:                       {len(correct)}")
    print()

    # ── 2. Group affected records by source_url (one PDF = one publication) ──
    by_url = defaultdict(list)
    for r in affected:
        by_url[r["source_url"]].append(r)

    n_pubs = len(by_url)
    print(f"Unique publications to scan: {n_pubs}")
    print()

    scraper = TBillAuctionScraper()

    publications = []
    stats = {
        "publications_scanned": 0,
        "records_scanned": 0,
        "records_requiring_correction": 0,
        "already_correct_count": len(correct),
        "high_confidence": 0,
        "medium_confidence": 0,
        "missing_auction_dates": 0,
        "missing_issue_dates": 0,
        "source_conflicts": 0,
        "unusual_settlement_gaps": 0,
        "ambiguous": 0,
        "pdf_errors": 0,
    }

    for i, (url, records) in enumerate(sorted(by_url.items()), 1):
        fn = url.split("/")[-1][:65]
        print(f"[{i:2d}/{n_pubs}] {fn}")

        pub = {
            "source_url": url,
            "detected_auction_date": None,
            "detected_issue_date": None,
            "footer_date": None,
            "next_auction_bids_deadline": None,
            "next_auction_bids_weekday": None,
            "next_auction_closure_ddmmyyyy": None,
            "auction_date_source": None,
            "issue_date_source": None,
            "settlement_gap_days": None,
            "confidence": "LOW",
            "warnings": [],
            "tenors": [],
        }

        # ── Download PDF ──────────────────────────────────────────────────────
        try:
            pdf_bytes = scraper.download_pdf(url)
        except Exception as exc:
            err = f"PDF_FETCH_ERROR: {exc}"
            print(f"        ⚠️  {err}")
            pub["warnings"].append(err)
            pub["confidence"] = "LOW"
            stats["pdf_errors"] += 1
            # Build tenor rows with UNABLE_TO_DETERMINE
            for r in sorted(records, key=lambda x: x["tenor_days"]):
                pub["tenors"].append({
                    **_build_tenor_row(r, pub),
                    "requires_correction": None,
                })
                stats["records_scanned"] += 1
            publications.append(pub)
            time.sleep(RATE_LIMIT_SECONDS)
            continue

        # ── Extract dates ─────────────────────────────────────────────────────
        try:
            date_info = scraper.extract_dates_from_pdf(pdf_bytes, source_url=url)
        except Exception as exc:
            date_info = {
                "auction_date": None, "issue_date": None,
                "auction_date_source": None, "issue_date_source": None,
                "footer_date": None,
                "next_auction_bids_deadline": None,
                "next_auction_bids_weekday": None,
                "next_auction_closure_ddmmyyyy": None,
                "settlement_gap_days": None,
                "confidence": "LOW",
                "warnings": [f"PARSER_ERROR: {exc}"],
            }

        pub.update({
            "detected_auction_date":         date_info["auction_date"],
            "detected_issue_date":           date_info["issue_date"],
            "footer_date":                   date_info["footer_date"],
            "next_auction_bids_deadline":    date_info["next_auction_bids_deadline"],
            "next_auction_bids_weekday":     date_info["next_auction_bids_weekday"],
            "next_auction_closure_ddmmyyyy": date_info["next_auction_closure_ddmmyyyy"],
            "auction_date_source":           date_info["auction_date_source"],
            "issue_date_source":             date_info["issue_date_source"],
            "settlement_gap_days":           date_info["settlement_gap_days"],
            "confidence":                    date_info["confidence"],
            "warnings":                      date_info["warnings"],
        })

        # Print one-line status
        conf_icon = {"HIGH": "✅", "MEDIUM": "🔵", "LOW": "🟡", "CONFLICT": "🔴"}.get(
            pub["confidence"], "?"
        )
        print(f"        {conf_icon} auction={pub['detected_auction_date']}  "
              f"issue={pub['detected_issue_date']}  "
              f"gap={pub['settlement_gap_days']}d  "
              f"[{pub['confidence']}]")

        # Update global stats
        stats["publications_scanned"] += 1
        if not pub["detected_auction_date"]:
            stats["missing_auction_dates"] += 1
        if not pub["detected_issue_date"]:
            stats["missing_issue_dates"] += 1
        if pub["confidence"] == "CONFLICT":
            stats["source_conflicts"] += 1
        elif pub["confidence"] == "LOW":
            stats["ambiguous"] += 1
        elif pub["confidence"] == "HIGH":
            stats["high_confidence"] += 1
        elif pub["confidence"] == "MEDIUM":
            stats["medium_confidence"] += 1
            if any("UNUSUAL_GAP" in w for w in pub["warnings"]):
                stats["unusual_settlement_gaps"] += 1

        # ── Build per-tenor rows ──────────────────────────────────────────────
        for r in sorted(records, key=lambda x: x["tenor_days"]):
            tenor_row = _build_tenor_row(r, pub)
            # Determine if correction needed
            if pub["detected_auction_date"]:
                tenor_row["requires_correction"] = (
                    r["auction_date"] != pub["detected_auction_date"]
                )
                if tenor_row["requires_correction"]:
                    stats["records_requiring_correction"] += 1
            else:
                tenor_row["requires_correction"] = None  # unresolvable

            pub["tenors"].append(tenor_row)
            stats["records_scanned"] += 1

        publications.append(pub)
        time.sleep(RATE_LIMIT_SECONDS)

    # ── Exceptions list ───────────────────────────────────────────────────────
    exceptions = [
        p for p in publications
        if p["confidence"] in ("LOW", "CONFLICT") or not p["detected_auction_date"]
    ]

    # ── Build output ──────────────────────────────────────────────────────────
    output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": stats,
        "already_correct": [
            {
                "issue_number": r["issue_number"],
                "tenor_days": r["tenor_days"],
                "auction_date": r["auction_date"],
                "issue_date": r["issue_date"],
            }
            for r in correct
        ],
        "publications": publications,
        "exceptions": [
            {
                "source_url": p["source_url"],
                "confidence": p["confidence"],
                "warnings": p["warnings"],
            }
            for p in exceptions
        ],
    }

    # ── Write JSON ────────────────────────────────────────────────────────────
    json_path = "date_repair_preview.json"
    with open(json_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nJSON written:     {json_path}")

    # ── Write Markdown ────────────────────────────────────────────────────────
    md_path = "date_repair_preview_report.md"
    md = build_markdown_report(output)
    with open(md_path, "w") as f:
        f.write(md)
    print(f"Report written:   {md_path}")

    # ── Print final summary ───────────────────────────────────────────────────
    print()
    print("=" * 70)
    print("PREVIEW SUMMARY")
    print("=" * 70)
    for k, v in stats.items():
        print(f"  {k:<40s} {v}")

    blockers = (stats["missing_auction_dates"] + stats["source_conflicts"]
                + stats["ambiguous"] + stats["pdf_errors"])
    print()
    if blockers == 0:
        print("✅  GO — Preview is clean. No unresolved publications.")
        print("    Run independent verification next, then submit repair for approval.")
    else:
        print(f"⛔  NO-GO — {blockers} publications cannot be automatically resolved.")
        print("    See date_repair_preview_report.md → Exceptions section.")
    print()


def _build_tenor_row(r: dict, pub: dict) -> dict:
    return {
        "issue_number":          r["issue_number"],
        "tenor_days":            r["tenor_days"],
        "current_auction_date":  r["auction_date"],
        "current_issue_date":    r["issue_date"],
        "detected_auction_date": pub["detected_auction_date"],
        "detected_issue_date":   pub["detected_issue_date"],
        "explicit_bid_deadline_text": pub["next_auction_bids_deadline"],
        "footer_date":           pub["footer_date"],
        "auction_date_source":   pub["auction_date_source"],
        "issue_date_source":     pub["issue_date_source"],
        "settlement_gap":        pub["settlement_gap_days"],
        "confidence":            pub["confidence"],
        "warnings":              list(pub["warnings"]),
    }


if __name__ == "__main__":
    main()
