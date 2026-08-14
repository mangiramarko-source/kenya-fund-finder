import pdfplumber
import io
import re
import urllib.parse
from datetime import date as date_type, datetime
from .base import BaseCBKScraper

# ──────────────────────────────────────────────────────────────────────────────
# Module-level constants for date parsing
# ──────────────────────────────────────────────────────────────────────────────
_MONTHS_RE = (
    r'January|February|March|April|May|June|July|August'
    r'|September|October|November|December'
)

_MONTH_MAP = {
    'january': 1,  'february': 2,  'march': 3,    'april': 4,
    'may': 5,      'june': 6,      'july': 7,      'august': 8,
    'september': 9,'october': 10,  'november': 11, 'december': 12,
}


def _parse_ddmmyyyy(s: str):
    """Parse DD/MM/YYYY string. Returns date_type or None."""
    m = re.fullmatch(r'(\d{1,2})/(\d{1,2})/(\d{4})', s.strip())
    if m:
        try:
            return date_type(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None
    return None


def _parse_month_dd_yyyy(s: str):
    """Parse 'Month DD, YYYY' string. Returns date_type or None."""
    m = re.fullmatch(
        r'(' + _MONTHS_RE + r')\s+(\d{1,2}),\s+(\d{4})',
        s.strip(), re.IGNORECASE
    )
    if m:
        month_num = _MONTH_MAP.get(m.group(1).lower())
        if month_num:
            try:
                return date_type(int(m.group(3)), month_num, int(m.group(2)))
            except ValueError:
                return None
    return None


class TBillAuctionScraper(BaseCBKScraper):
    TBILL_URL = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"

    # ──────────────────────────────────────────────────────────────────────────
    # Date extraction (Phase 3 — precise, semantic, auditable)
    # ──────────────────────────────────────────────────────────────────────────

    def extract_dates_from_pdf(self, pdf_bytes: bytes, source_url: str = None) -> dict:
        """
        Extract auction_date and issue_date from a CBK Treasury Bill results PDF.

        ┌──────────────────────────────────────────────────────────────────────┐
        │  CBK T-Bill Results PDF Structure (confirmed from full text dumps)   │
        ├──────────────────────────────────────────────────────────────────────┤
        │  Section A: "RESULTS OF 91, 182 & 364 DAYS … ISSUES … DATED DD/MM/YYYY" │
        │    ↑ This DATED date = issue_date (settlement/value date) for the    │
        │      CURRENT publication.                                            │
        │                                                                      │
        │  Section B: "COMPARATIVE AVERAGE INTEREST RATES OF ACCEPTED BIDS"   │
        │                                                                      │
        │  Section C: "NEXT TREASURY BILLS AUCTIONS: ISSUE NOS. … DATED DD/MM/YYYY" │
        │    ─ Contains a table with "Auction Dates & Bids Closure" column     │
        │      showing DD/MM/YYYY values for the NEXT publication.             │
        │                                                                      │
        │  Section D: "TREASURY BILL AUCTION ANNOUNCEMENT"                     │
        │    "Bids must be submitted … by HH.MM p.m [Weekday], DDth Month, YYYY …" │
        │    ↑ This date refers to the NEXT publication's auction, NOT current │
        │                                                                      │
        │  Section E: "NON-COMPETITIVE BIDS"                                   │
        │                                                                      │
        │  Footer: "[Director Name]" / "Director, Financial Markets"           │
        │          "Month DD, YYYY"                                            │
        │    ↑ This date = auction_date (bid-closing date) for the CURRENT     │
        │      publication. It is the date below the Director's signature.     │
        └──────────────────────────────────────────────────────────────────────┘

        Date source hierarchy:
          auction_date  PRIMARY:   Footer "Month DD, YYYY" (below Director signature)
                        SECONDARY: Section C "Auction Dates & Bids Closure" DD/MM/YYYY
                                   for the NEXT auction (used for sequence cross-check)
                        NEVER:     "Bids must be submitted" date (= NEXT auction date)
                        NEVER:     issue_date minus 4 days

          issue_date    PRIMARY:   Section A header "DATED DD/MM/YYYY"
                        SECONDARY: "DATED DD-MM-YYYY" in URL filename

        Returns
        -------
        {
          "auction_date"              : "YYYY-MM-DD" | None,
          "issue_date"                : "YYYY-MM-DD" | None,
          "auction_date_source"       : "pdf_footer" | None,
          "issue_date_source"         : "pdf_header" | "url_filename" | None,
          "footer_date"               : "YYYY-MM-DD" | None,
          "next_auction_bids_deadline": "YYYY-MM-DD" | None,   # NEXT auction ref
          "next_auction_bids_weekday" : str | None,
          "next_auction_closure_ddmmyyyy": "YYYY-MM-DD" | None, # from Sec C table
          "settlement_gap_days"       : int | None,
          "confidence"                : "HIGH" | "MEDIUM" | "LOW" | "CONFLICT",
          "warnings"                  : [str]
        }
        """
        result = {
            "auction_date": None,
            "issue_date": None,
            "auction_date_source": None,
            "issue_date_source": None,
            "footer_date": None,
            "next_auction_bids_deadline": None,
            "next_auction_bids_weekday": None,
            "next_auction_closure_ddmmyyyy": None,
            "settlement_gap_days": None,
            "confidence": "LOW",
            "warnings": [],
        }

        # ── Open PDF ───────────────────────────────────────────────────────────
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                lines = []
                for page in pdf.pages:
                    txt = page.extract_text() or ""
                    lines.extend(txt.split("\n"))
                full_text = "\n".join(lines)
        except Exception as exc:
            result["warnings"].append(f"PDF_OPEN_ERROR: {exc}")
            return result

        if not full_text.strip():
            result["warnings"].append("PDF_EMPTY: No text extracted")
            return result

        # ── Step 1: issue_date from Section A header ───────────────────────────
        # CBK PDFs use two distinct date formats:
        #   Section A header (current publication): "DATED  DD-MM-YYYY" (hyphens)
        #   Section C table  (next publication):    "DATED DD/MM/YYYY"  (slashes)
        #
        # Strategy: find the FIRST occurrence of "DATED" in the header region
        # and extract its date in EITHER format.  Hyphens are tried first because
        # they unambiguously belong to Section A.  We restrict the search to the
        # first 1500 characters so that Section C (which appears later) cannot
        # accidentally shadow the current publication's DATED date.
        header_region = full_text[:1500]  # Section A only (Section C starts later)

        # Pattern A1: DATED DD-MM-YYYY  (hyphen — Section A format)
        hm = re.search(
            r'DATED\s{0,5}(\d{1,2}-\d{1,2}-\d{4})',
            header_region, re.IGNORECASE
        )
        if hm:
            # Convert DD-MM-YYYY → date using the DDMMYYYY helper
            raw = hm.group(1).replace("-", "/")
            parsed = _parse_ddmmyyyy(raw)
            if parsed:
                result["issue_date"] = parsed.isoformat()
                result["issue_date_source"] = "pdf_header"
            else:
                result["warnings"].append(
                    f"HEADER_DATE_PARSE_ERROR: could not parse hyphen-format '{hm.group(1)}'"
                )

        if not result["issue_date"]:
            # Pattern A2: DATED DD/MM/YYYY  (slash — seen when header already uses slashes)
            hm2 = re.search(
                r'DATED\s+(\d{1,2}/\d{1,2}/\d{4})',
                header_region, re.IGNORECASE
            )
            if not hm2:
                # Pattern A3: DATED at end of line, date on next non-empty line (slash)
                hm2 = re.search(
                    r'DATED\s*\n+\s*(\d{1,2}/\d{1,2}/\d{4})',
                    header_region, re.IGNORECASE
                )
            if hm2:
                parsed2 = _parse_ddmmyyyy(hm2.group(1))
                if parsed2:
                    result["issue_date"] = parsed2.isoformat()
                    result["issue_date_source"] = "pdf_header"
                else:
                    result["warnings"].append(
                        f"HEADER_DATE_PARSE_ERROR: could not parse '{hm2.group(1)}'"
                    )

        # Fallback: issue_date from URL filename (DD-MM-YYYY after "DATED")
        if not result["issue_date"] and source_url:
            url_decoded = urllib.parse.unquote(source_url)
            um = re.search(
                r'DATED[\s_-](\d{1,2})[\s_-](\d{1,2})[\s_-](\d{4})',
                url_decoded, re.IGNORECASE
            )
            if um:
                try:
                    d_val = date_type(int(um.group(3)), int(um.group(2)), int(um.group(1)))
                    result["issue_date"] = d_val.isoformat()
                    result["issue_date_source"] = "url_filename"
                    result["warnings"].append(
                        "ISSUE_DATE_FROM_URL: Section A header DATED not found; "
                        "fell back to URL filename"
                    )
                except ValueError as e:
                    result["warnings"].append(f"URL_DATE_PARSE_ERROR: {e}")

        if not result["issue_date"]:
            result["warnings"].append(
                "MISSING_ISSUE_DATE: Could not extract DATED from PDF header or URL"
            )

        # ── Step 2: Section C — "Auction Dates & Bids Closure" (NEXT auction) ─
        # The structured table in Section C contains DD/MM/YYYY dates for the
        # NEXT auction's bid-closure. We extract the first one as a reference.
        sec_c_match = re.search(
            r'NEXT TREASURY BILLS AUCTIONS.*?Auction Dates.*?Bids Closure.*?\n'
            r'(?:.*?\n)*?(\d{2}/\d{2}/\d{4})',
            full_text, re.IGNORECASE | re.DOTALL
        )
        if sec_c_match:
            parsed_c = _parse_ddmmyyyy(sec_c_match.group(1))
            if parsed_c:
                result["next_auction_closure_ddmmyyyy"] = parsed_c.isoformat()

        # ── Step 3: Section D — "Bids must be submitted" (NEXT auction ref) ────
        # NOTE: This date is for the NEXT publication, not the current one.
        # We extract it for documentation and sequence cross-validation.
        #
        # Handles variations:
        #   "by 2.00 p.m Thursday, 13th August, 2026"
        #   "by 12.00 p.m Wednesday, 24th December, 2025"  (holiday-adjusted)
        bids_pattern = (
            r'[Bb]ids must be submitted'
            r'.{0,300}?'                    # section header may prefix
            r'by\s+'
            r'(\d+\.?\d*)\s*p\.m\s+'        # time: 2.00 or 12.00
            r'([A-Za-z]+),?\s+'             # weekday
            r'(\d{1,2})(?:st|nd|rd|th)?\s+' # DD with ordinal suffix
            r'(' + _MONTHS_RE + r')[,\s\n]+'# Month (year may be next line)
            r'(\d{4})'                       # YYYY
        )
        bids_m = re.search(bids_pattern, full_text, re.IGNORECASE | re.DOTALL)
        if bids_m:
            weekday = bids_m.group(2)
            day = int(bids_m.group(3))
            month_name = bids_m.group(4)
            year = int(bids_m.group(5))
            month_num = _MONTH_MAP.get(month_name.lower())
            if month_num:
                try:
                    bids_dt = date_type(year, month_num, day)
                    result["next_auction_bids_deadline"] = bids_dt.isoformat()
                    result["next_auction_bids_weekday"] = weekday
                except ValueError as e:
                    result["warnings"].append(f"BIDS_DATE_PARSE_ERROR: {e}")

        # ── Step 4: Footer date — PRIMARY auction_date source ─────────────────
        # The footer appears after the Director's signature at the very end of
        # the document in the format "Month DD, YYYY" on its own line.
        #
        # Strategy: find all "Month DD, YYYY" occurrences and take the LAST one.
        # This reliably avoids matching dates in the financial prose above.
        footer_pattern = r'(' + _MONTHS_RE + r')\s+(\d{1,2}),\s+(\d{4})'
        all_footer = list(re.finditer(footer_pattern, full_text, re.IGNORECASE))

        if all_footer:
            last = all_footer[-1]
            month_num = _MONTH_MAP.get(last.group(1).lower())
            if month_num:
                try:
                    footer_dt = date_type(int(last.group(3)), month_num, int(last.group(2)))
                    result["footer_date"] = footer_dt.isoformat()
                    result["auction_date"] = footer_dt.isoformat()
                    result["auction_date_source"] = "pdf_footer"
                except ValueError as e:
                    result["warnings"].append(f"FOOTER_DATE_PARSE_ERROR: {e}")

        if not result["auction_date"]:
            result["warnings"].append(
                "MISSING_AUCTION_DATE: Could not extract footer 'Month DD, YYYY' from PDF"
            )

        # ── Step 5: Cross-checks & confidence ─────────────────────────────────
        if result["auction_date"] and result["issue_date"]:
            a_dt = date_type.fromisoformat(result["auction_date"])
            i_dt = date_type.fromisoformat(result["issue_date"])

            if a_dt >= i_dt:
                result["warnings"].append(
                    f"DATE_ORDER_VIOLATION: auction_date ({result['auction_date']}) "
                    f">= issue_date ({result['issue_date']})"
                )
                result["confidence"] = "CONFLICT"
            else:
                gap = (i_dt - a_dt).days
                result["settlement_gap_days"] = gap

                if 1 <= gap <= 14:
                    result["confidence"] = "HIGH"
                    if gap not in (3, 4, 5, 6, 7):
                        result["warnings"].append(
                            f"UNUSUAL_GAP: settlement_gap_days={gap} "
                            f"(expected 3-7; flagged for manual review)"
                        )
                        result["confidence"] = "MEDIUM"
                else:
                    result["warnings"].append(
                        f"EXTREME_GAP: settlement_gap_days={gap} "
                        f"(outside 1-14 day range)"
                    )
                    result["confidence"] = "LOW"

            # Cross-check: Section C next-auction closure should match Section D
            if (result["next_auction_closure_ddmmyyyy"]
                    and result["next_auction_bids_deadline"]):
                if (result["next_auction_closure_ddmmyyyy"]
                        != result["next_auction_bids_deadline"]):
                    result["warnings"].append(
                        f"NEXT_AUCTION_DATE_MISMATCH: Section C table shows "
                        f"{result['next_auction_closure_ddmmyyyy']} but "
                        f"Section D bids text shows {result['next_auction_bids_deadline']}"
                    )
        elif result["auction_date"] or result["issue_date"]:
            result["confidence"] = "MEDIUM"

        return result

    # ──────────────────────────────────────────────────────────────────────────
    # Financial data extraction (unchanged)
    # ──────────────────────────────────────────────────────────────────────────

    def extract_data_from_pdf(self, pdf_bytes: bytes):
        """
        Uses pdfplumber to extract text and tables from the CBK T-Bill auction PDF.
        """
        data = {}
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            # CBK auction results are usually single page
            first_page = pdf.pages[0]
            text = first_page.extract_text()

            def extract_numbers(line_prefix):
                # Search across newlines but constrain to 250 chars to avoid eating the whole doc
                pattern = line_prefix + r".{0,250}?(?=[\d, ]+\.\d{2,4})((?:[\d, ]+\.\d{2,4}%?\s*){3})"
                match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    line = match.group(1)
                    numbers = re.findall(r"[\d, ]+\.\d{2,4}", line)
                    return [n.replace(" ", "") for n in numbers]
                return []

            amt_offered = extract_numbers(r'Amount Offered')
            if len(amt_offered) >= 3:
                data['amount_offered'] = {
                    91: self.normalize_value(amt_offered[0], 'KSh M'),
                    182: self.normalize_value(amt_offered[1], 'KSh M'),
                    364: self.normalize_value(amt_offered[2], 'KSh M')
                }

            bids_rec = extract_numbers(r'Bids Received')
            if len(bids_rec) >= 3:
                data['bids_received'] = {
                    91: self.normalize_value(bids_rec[0], 'KSh M'),
                    182: self.normalize_value(bids_rec[1], 'KSh M'),
                    364: self.normalize_value(bids_rec[2], 'KSh M')
                }

            amt_acc = extract_numbers(r'(?:Total )?Amount Accepted')
            if len(amt_acc) >= 3:
                data['amount_accepted'] = {
                    91: self.normalize_value(amt_acc[0], 'KSh M'),
                    182: self.normalize_value(amt_acc[1], 'KSh M'),
                    364: self.normalize_value(amt_acc[2], 'KSh M')
                }

            perf_rate = extract_numbers(r'Performance Rate')
            if len(perf_rate) >= 3:
                data['performance_rate'] = {
                    91: float(perf_rate[0]),
                    182: float(perf_rate[1]),
                    364: float(perf_rate[2])
                }

            mkt_rate = extract_numbers(r'Market Weighted Average Interest')
            if len(mkt_rate) >= 3:
                data['market_average_rate'] = {
                    91: float(mkt_rate[0]),
                    182: float(mkt_rate[1]),
                    364: float(mkt_rate[2])
                }

            acc_rate = extract_numbers(r'Weighted Average Interest Rate of\s*(?:accepted bids)?')
            if len(acc_rate) >= 3:
                data['accepted_average_rate'] = {
                    91: float(acc_rate[0]),
                    182: float(acc_rate[1]),
                    364: float(acc_rate[2])
                }

        return data

    def run(self):
        self.logger.info("Starting T-Bill Scraper")
        soup = self.fetch_page(self.TBILL_URL)
        pdf_links = self.find_pdf_links(soup, section_keywords=['Auction Results', 'T-Bill Results'])

        for link in pdf_links:
            pdf_bytes = self.download_pdf(link)
            parsed_data = self.extract_data_from_pdf(pdf_bytes)
            self.logger.info(f"Extracted Data: {parsed_data}")
            # Insert into database layer
