"""
test_tbill_dates.py — Regression tests for CBK T-Bill date extraction.

Covers:
  - Issue 2694  (known: auction=2026-08-06, issue=2026-08-10)
  - Issue 2644  (known: auction=2025-08-21, issue=2025-08-25)
  - Issue 2662  (Christmas-period: auction=2025-12-24 [Wednesday], issue=2025-12-29)
  - Issue 2661  (pre-Christmas: auction=2025-12-18, issue=2025-12-22)
  - Normal Thursday auction structure
  - Non-Thursday (holiday-adjusted) auction
  - Malformed PDF → parser raises / returns MISSING warning, never invents a date
  - Missing bid-deadline text → parser still returns auction_date from footer
  - Missing DATED header → parser falls back to URL filename
  - Conflicting dates → confidence=CONFLICT, no silent resolution
  - Three tenors from one publication share the same auction_date
  - Idempotent upsert: re-running same PDF produces identical output
"""

import io
import re
import pytest
import sys
import os

# Allow import without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from scrapers.tbill_scraper import TBillAuctionScraper

# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def scraper():
    return TBillAuctionScraper()


def _make_pdf_bytes(footer_date: str, header_dated: str = None,
                    bids_text: str = None, section_c_date: str = None) -> bytes:
    """
    Build a minimal synthetic CBK T-Bill results PDF for testing.

    Parameters
    ----------
    footer_date  : "Month DD, YYYY"  e.g. "August 06, 2026"
    header_dated : "DD/MM/YYYY"       e.g. "10/08/2026"
    bids_text    : full bids sentence for Section D
    section_c_date : "DD/MM/YYYY" for the Section C auction closure table
    """
    import fpdf

    header = (
        f"A. RESULTS OF 91, 182 & 364 DAYS TREASURY  BILLS "
        f"ISSUES 2694/091, 2668/182 & 2623/364  DATED {header_dated or ''}"
    )
    section_c = ""
    if section_c_date:
        section_c = (
            f"\nC.\nNEXT TREASURY BILLS AUCTIONS: ISSUE NOS. 2695/091, 2669/182 & 2624/364 "
            f"DATED {section_c_date}\n"
            f"TENOR Offer amount (Kshs. M) Auction Dates & Bids Closure\n"
            f"91 DAYS 8,000.00 {section_c_date}\n"
        )
    section_d = ""
    if bids_text:
        section_d = f"\nD.\nTREASURY BILL AUCTION ANNOUNCEMENT\n{bids_text}\n"
    section_e = (
        "\nE.\nNON-COMPETITIVE BIDS\n"
        "Non-competitive bids are subject to a maximum of Kshs. 50 Million per "
        "investor account per tenor and are issued at the weighted average of \n"
    )
    footer = f"\nDavid Luusa\nDirector, Financial Markets\n{footer_date}\n"

    content = header + section_c + section_d + section_e + footer

    pdf = fpdf.FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    for line in content.split("\n"):
        pdf.cell(0, 5, txt=line, ln=True)
    return pdf.output()


# ──────────────────────────────────────────────────────────────────────────────
# Tests using REAL CBK PDFs (network required — skip if offline)
# ──────────────────────────────────────────────────────────────────────────────

REAL_PDFS = {
    "issue_2694": {
        "url": (
            "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/"
            "1883166998_RESULTS 2694-091 2668-182 2623-364 DATED 10-08-2026.pdf"
        ),
        "expected_auction_date": "2026-08-06",
        "expected_issue_date":   "2026-08-10",
        "expected_gap":          4,
    },
    "issue_2644": {
        "url": (
            "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/"
            "1837291982_RESULTS 2644-091 2618-182 2572-364 DATED 25-08-2025.pdf"
        ),
        "expected_auction_date": "2025-08-21",
        "expected_issue_date":   "2025-08-25",
        "expected_gap":          4,
    },
    "issue_2662_christmas": {
        "url": (
            "https://www.centralbank.go.ke/uploads/364_day_historical_treasury_bill_results/"
            "523183319_RESULTS 2662-091 2636-182 2591-364 DATED 29-12-2025.pdf"
        ),
        # CBK explicitly moved auction to Wednesday 24 Dec (Christmas Eve)
        "expected_auction_date": "2025-12-24",
        "expected_issue_date":   "2025-12-29",
        "expected_gap":          5,
    },
    "issue_2661_pre_christmas": {
        "url": (
            "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/"
            "74192338_RESULTS 2661-091 2635-182 2590-364 DATED 22-12-2025.pdf"
        ),
        "expected_auction_date": "2025-12-18",
        "expected_issue_date":   "2025-12-22",
        "expected_gap":          4,
    },
    "issue_2648_11day_gap": {
        # 11-day gap publication: Section A header uses DD-MM-YYYY (hyphens).
        # The PDF contains TWO "DATED" lines:
        #   Section A: "DATED  22-09-2025"  → current publication's issue_date
        #   Section C: "DATED 29/09/2025"   → NEXT publication's settlement date
        # The parser must use the FIRST (hyphen-format) DATED for issue_date.
        "url": (
            "https://www.centralbank.go.ke/uploads/182_day_historical_treasury_bill_results/"
            "2051037404_RESULTS 2648-091 2622-182 2576-364 DATED 22-09-2025.pdf"
        ),
        "expected_auction_date": "2025-09-18",
        "expected_issue_date":   "2025-09-22",
        "expected_gap":          4,
    },
}


@pytest.mark.parametrize("label,spec", REAL_PDFS.items())
def test_real_pdf_auction_date(scraper, label, spec):
    """Verify auction_date extracted from a real CBK PDF matches known value."""
    try:
        pdf_bytes = scraper.download_pdf(spec["url"])
    except Exception as e:
        pytest.skip(f"Network unavailable: {e}")

    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url=spec["url"])

    assert result["auction_date"] == spec["expected_auction_date"], (
        f"[{label}] auction_date: got {result['auction_date']!r}, "
        f"expected {spec['expected_auction_date']!r}\n"
        f"Warnings: {result['warnings']}"
    )


@pytest.mark.parametrize("label,spec", REAL_PDFS.items())
def test_real_pdf_issue_date(scraper, label, spec):
    """Verify issue_date extracted from a real CBK PDF matches known value."""
    try:
        pdf_bytes = scraper.download_pdf(spec["url"])
    except Exception as e:
        pytest.skip(f"Network unavailable: {e}")

    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url=spec["url"])

    assert result["issue_date"] == spec["expected_issue_date"], (
        f"[{label}] issue_date: got {result['issue_date']!r}, "
        f"expected {spec['expected_issue_date']!r}\n"
        f"Warnings: {result['warnings']}"
    )


@pytest.mark.parametrize("label,spec", REAL_PDFS.items())
def test_real_pdf_auction_before_issue(scraper, label, spec):
    """auction_date must always be strictly before issue_date."""
    try:
        pdf_bytes = scraper.download_pdf(spec["url"])
    except Exception as e:
        pytest.skip(f"Network unavailable: {e}")

    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url=spec["url"])

    assert result["auction_date"] and result["issue_date"], (
        f"[{label}] Missing dates: auction={result['auction_date']}, "
        f"issue={result['issue_date']}"
    )
    from datetime import date
    a_dt = date.fromisoformat(result["auction_date"])
    i_dt = date.fromisoformat(result["issue_date"])
    assert a_dt < i_dt, (
        f"[{label}] auction_date ({a_dt}) must be < issue_date ({i_dt})"
    )


@pytest.mark.parametrize("label,spec", REAL_PDFS.items())
def test_real_pdf_settlement_gap(scraper, label, spec):
    """Settlement gap must equal expected value for known publications."""
    try:
        pdf_bytes = scraper.download_pdf(spec["url"])
    except Exception as e:
        pytest.skip(f"Network unavailable: {e}")

    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url=spec["url"])
    assert result["settlement_gap_days"] == spec["expected_gap"], (
        f"[{label}] gap: got {result['settlement_gap_days']}, "
        f"expected {spec['expected_gap']}"
    )


def test_issue_2662_is_wednesday_auction(scraper):
    """
    The Christmas 2025 auction (Issue 2662) was explicitly moved to Wednesday.
    The parser must accept this — weekday is NOT a business rule constraint.
    """
    try:
        pdf_bytes = scraper.download_pdf(REAL_PDFS["issue_2662_christmas"]["url"])
    except Exception as e:
        pytest.skip(f"Network unavailable: {e}")

    result = scraper.extract_dates_from_pdf(
        pdf_bytes, source_url=REAL_PDFS["issue_2662_christmas"]["url"]
    )
    # Confirm the auction_date is indeed 2025-12-24 (a Wednesday)
    assert result["auction_date"] == "2025-12-24"
    from datetime import date
    import calendar
    d = date.fromisoformat(result["auction_date"])
    # Wednesday = weekday() == 2
    assert d.weekday() == 2, (
        f"Expected Wednesday (2), got weekday {d.weekday()} for {result['auction_date']}"
    )


def test_three_tenors_share_auction_date(scraper):
    """
    All three tenors from a single CBK publication must receive the same
    auction_date. Verified using Issue 2694 (PDF contains 91/182/364 results).
    """
    try:
        pdf_bytes = scraper.download_pdf(REAL_PDFS["issue_2694"]["url"])
    except Exception as e:
        pytest.skip(f"Network unavailable: {e}")

    result = scraper.extract_dates_from_pdf(
        pdf_bytes, source_url=REAL_PDFS["issue_2694"]["url"]
    )
    # The same PDF applies to all 3 tenors — auction_date must be uniform
    assert result["auction_date"] == "2026-08-06"
    # Run the parser a second time on the same bytes → same result (idempotent)
    result2 = scraper.extract_dates_from_pdf(
        pdf_bytes, source_url=REAL_PDFS["issue_2694"]["url"]
    )
    assert result["auction_date"] == result2["auction_date"]
    assert result["issue_date"]   == result2["issue_date"]


# ──────────────────────────────────────────────────────────────────────────────
# Tests using SYNTHETIC PDFs (no network required)
# ──────────────────────────────────────────────────────────────────────────────

try:
    import fpdf as _fpdf_available
    HAS_FPDF = True
except ImportError:
    HAS_FPDF = False

skip_no_fpdf = pytest.mark.skipif(
    not HAS_FPDF, reason="fpdf2 not installed"
)


@skip_no_fpdf
def test_normal_thursday_auction(scraper):
    """Normal Thursday auction: footer=Thursday, DATED=Monday 4 days later."""
    pdf_bytes = _make_pdf_bytes(
        footer_date="August 21, 2025",
        header_dated="25/08/2025",
        bids_text=(
            "Bids must be submitted and received by CBK electronically via "
            "DhowCSD or Treasury Mobile Direct by 2.00 p.m Thursday, 28th August, "
            "2025 for 91-day, 182-day and 364-day Treasury Bills."
        ),
        section_c_date="28/08/2025",
    )
    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url="test://DATED 25-08-2025.pdf")
    assert result["auction_date"] == "2025-08-21"
    assert result["issue_date"]   == "2025-08-25"
    assert result["settlement_gap_days"] == 4
    assert result["confidence"] == "HIGH"
    assert not any("MISSING" in w for w in result["warnings"])


@skip_no_fpdf
def test_non_thursday_holiday_auction(scraper):
    """
    Holiday-adjusted auction on Wednesday is valid.
    Parser must NOT reject it or flag it as invalid based on weekday.
    """
    pdf_bytes = _make_pdf_bytes(
        footer_date="December 24, 2025",
        header_dated="29/12/2025",
        bids_text=(
            "Due to the upcoming New Year holiday,bids must be submitted and "
            "received by CBK electronically via DhowCSD or Treasury Mobile Direct "
            "by 12.00 p.m Wednesday, 31st December, 2025 for 91-day, 182-day and "
            "364-day Treasury Bills."
        ),
        section_c_date="31/12/2025",
    )
    result = scraper.extract_dates_from_pdf(pdf_bytes)
    assert result["auction_date"] == "2025-12-24"
    assert result["issue_date"]   == "2025-12-29"
    assert result["settlement_gap_days"] == 5
    # Wednesday auction must NOT produce a DATE_ORDER_VIOLATION or invalid flag
    assert result["confidence"] in ("HIGH", "MEDIUM")
    assert not any("VIOLATION" in w for w in result["warnings"])


@skip_no_fpdf
def test_missing_bid_deadline_text_still_extracts_footer(scraper):
    """
    If Section D 'Bids must be submitted' text is missing, the parser must
    still extract auction_date from the footer — it must NOT fail silently
    or invent a date.
    """
    pdf_bytes = _make_pdf_bytes(
        footer_date="August 06, 2026",
        header_dated="10/08/2026",
        bids_text=None,  # Section D missing
    )
    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url="test://DATED 10-08-2026.pdf")
    # Footer still present → auction_date extracted correctly
    assert result["auction_date"] == "2026-08-06"
    assert result["issue_date"]   == "2026-08-10"
    # No invented date: bids_deadline field should be None
    assert result["next_auction_bids_deadline"] is None


@skip_no_fpdf
def test_missing_footer_date_returns_missing_warning(scraper):
    """
    If the footer 'Month DD, YYYY' is absent, parser must NOT invent a date.
    Must return auction_date=None and include MISSING_AUCTION_DATE warning.
    """
    import fpdf
    pdf = fpdf.FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    # A PDF with a DATED header but NO footer date
    pdf.cell(0, 5, "A. RESULTS OF 91, 182 & 364 DAYS TREASURY BILLS ISSUES 2694/091 DATED 10/08/2026", ln=True)
    pdf.cell(0, 5, "Some financial data", ln=True)
    pdf.cell(0, 5, "David Luusa", ln=True)
    pdf.cell(0, 5, "Director, Financial Markets", ln=True)
    # NO date line below signature
    pdf_bytes = pdf.output()

    result = scraper.extract_dates_from_pdf(pdf_bytes, source_url="test://DATED 10-08-2026.pdf")
    assert result["auction_date"] is None, (
        f"Expected None, got {result['auction_date']!r}"
    )
    assert any("MISSING_AUCTION_DATE" in w for w in result["warnings"]), (
        f"Expected MISSING_AUCTION_DATE warning, got: {result['warnings']}"
    )


@skip_no_fpdf
def test_missing_issue_date_falls_back_to_url(scraper):
    """
    If Section A DATED header is missing, parser falls back to URL filename.
    Must warn that fallback was used.
    """
    import fpdf
    pdf = fpdf.FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    # No "DATED" in header
    pdf.cell(0, 5, "A. RESULTS OF 91, 182 & 364 DAYS TREASURY BILLS ISSUES 2694/091", ln=True)
    pdf.cell(0, 5, "Financial data here", ln=True)
    pdf.cell(0, 5, "David Luusa", ln=True)
    pdf.cell(0, 5, "Director, Financial Markets", ln=True)
    pdf.cell(0, 5, "August 06, 2026", ln=True)
    pdf_bytes = pdf.output()

    result = scraper.extract_dates_from_pdf(
        pdf_bytes,
        source_url="https://example.com/RESULTS 2694-091 DATED 10-08-2026.pdf"
    )
    assert result["issue_date"] == "2026-08-10"
    assert result["issue_date_source"] == "url_filename"
    assert any("ISSUE_DATE_FROM_URL" in w for w in result["warnings"])


@skip_no_fpdf
def test_date_order_violation_returns_conflict(scraper):
    """
    If footer date >= header DATED date, confidence must be CONFLICT.
    Parser must NOT silently choose one.
    """
    pdf_bytes = _make_pdf_bytes(
        footer_date="August 15, 2026",   # AFTER issue date — impossible
        header_dated="10/08/2026",        # issue date
    )
    result = scraper.extract_dates_from_pdf(pdf_bytes)
    assert result["confidence"] == "CONFLICT"
    assert any("DATE_ORDER_VIOLATION" in w for w in result["warnings"])


@skip_no_fpdf
def test_malformed_pdf_returns_error_not_invented_date(scraper):
    """
    A PDF with random bytes must not cause the parser to return an invented date.
    It should return auction_date=None with a PDF_OPEN_ERROR warning.
    """
    garbage = b"This is not a PDF at all!! " * 100
    result = scraper.extract_dates_from_pdf(garbage)
    assert result["auction_date"] is None, (
        f"Malformed PDF should return None, got {result['auction_date']!r}"
    )
    assert any(
        "PDF_OPEN_ERROR" in w or "PDF_EMPTY" in w
        for w in result["warnings"]
    ), f"Expected PDF error warning, got: {result['warnings']}"


@skip_no_fpdf
def test_idempotent_extraction(scraper):
    """
    Running extract_dates_from_pdf twice on identical bytes must return
    identical results (pure function — no side effects).
    """
    pdf_bytes = _make_pdf_bytes(
        footer_date="August 06, 2026",
        header_dated="10/08/2026",
        bids_text=(
            "Bids must be submitted and received by CBK electronically via "
            "DhowCSD or Treasury Mobile Direct by 2.00 p.m Thursday, 13th August, "
            "2026 for 91-day, 182-day and 364-day Treasury Bills."
        ),
        section_c_date="13/08/2026",
    )
    r1 = scraper.extract_dates_from_pdf(pdf_bytes, source_url="test://DATED 10-08-2026.pdf")
    r2 = scraper.extract_dates_from_pdf(pdf_bytes, source_url="test://DATED 10-08-2026.pdf")
    assert r1["auction_date"] == r2["auction_date"]
    assert r1["issue_date"]   == r2["issue_date"]
    assert r1["confidence"]   == r2["confidence"]
    assert r1["warnings"]     == r2["warnings"]


# ──────────────────────────────────────────────────────────────────────────────
# Regression: parser must not invent dates from subtraction
# ──────────────────────────────────────────────────────────────────────────────

def test_parser_does_not_subtract_days_to_invent_auction_date(scraper):
    """
    The parser must not use issue_date - 4 days as auction_date.
    If footer is missing, auction_date must be None, not a calculated value.
    """
    # We verify the scraper module does not contain any subtraction heuristic
    import inspect
    source = inspect.getsource(scraper.__class__)
    # Must not subtract days to invent auction_date
    # (allow timedelta references inside tests themselves, not in production code)
    forbidden_patterns = [
        r"timedelta\(days=4\)",
        r"timedelta\(days\s*=\s*4\)",
        r"-\s*4",     # subtraction of literal 4
    ]
    for pat in forbidden_patterns:
        found = re.search(pat, source)
        # Allow the pattern only inside comments or docstrings
        if found:
            # Crude check: if it appears in actual code (not a comment), fail
            line_start = source.rfind("\n", 0, found.start()) + 1
            line_end   = source.find("\n", found.end())
            line = source[line_start:line_end].strip()
            if not line.startswith("#") and '"""' not in line and "'''" not in line:
                pytest.fail(
                    f"Forbidden pattern '{pat}' found in scraper source: {line!r}\n"
                    "The parser must NOT subtract days to calculate auction_date."
                )
