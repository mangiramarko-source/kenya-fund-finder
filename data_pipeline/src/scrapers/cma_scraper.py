"""
Official Capital Markets Authority (CMA) Kenya News & CIS Scraper

Fetches, validates, filters, and formats official regulatory press releases,
approvals (MMFs, Unit Trusts, Fixed Income funds, ETFs, Alternative Investment Funds),
fund manager licensing actions, and CIS industry statistics from the official
Capital Markets Authority Kenya portal.

Guarantees:
- Zero hallucination: extracts strictly verbatim text and official statements.
- Source attribution: always attributes to 'Capital Markets Authority'.
- Noise rejection: filters out tenders, careers/vacancies, generic ceremonies, and non-financial content.
- Deterministic: no AI generation during ingestion.
- Strict market-link safety: preserves `relatedMmf = null` for general category updates.
"""

import os
import re
import logging
from datetime import datetime
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

CMA_BASE_API_URL = "https://www.cma.or.ke/wp-json/wp/v2/posts"
CMA_DEFAULT_TIMEOUT = 12

QUALIFYING_TITLE_PATTERNS = [
    r"\b(collective\s+investment\s+scheme|unit\s+trust|money\s+market|fixed\s+income|special\s+fund|sub-fund|sub-funds|etf|exchange\s+traded\s+fund|fund\s+manager|fund\s+management|corporate\s+trustee|asset\s+management|aum|assets\s+under\s+management|cis)\b",
    r"\b(alternative\s+investment\s+fund|umbrella\s+scheme|wealth\s+management|investment\s+advis|bond\s+market|green\s+bond|commercial\s+paper)\b",
]

REJECTION_PATTERNS = [
    r"\b(casino|vavada|slot|betting|gambling|poker)\b",
    r"\b(vacancy|vacancies|job\s+opportunity|career|careers|recruitment)\b",
    r"\b(tender|tenders|procurement|eoi|request\s+for\s+proposal)\b",
    r"\b(fire\s+award|sports\s+day|annual\s+dinner)\b",
    r"\b(coffee\s+broker|tea\s+auction|nairobi\s+coffee\s+exchange)\b",
]


def clean_cma_html(raw_html: str) -> str:
    """Strip HTML tags, script, style, navigation and clean whitespace."""
    if not raw_html or not isinstance(raw_html, str):
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    for s in soup(["script", "style", "img", "noscript", "footer", "nav"]):
        s.extract()
    text = soup.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_cma_title(raw_title: str) -> str:
    """Format and title-case/clean CMA headlines without altering facts."""
    clean = clean_cma_html(raw_title)
    # Remove excessive uppercase if whole title is screaming CAPS
    if clean.isupper() and len(clean) > 20:
        # Standard title case while keeping standard acronyms uppercase
        words = clean.split()
        capitalized = []
        acronyms = {"CMA", "CIS", "MMF", "ETF", "AUM", "NSE", "CBK", "REIT", "USD", "KES", "KSH", "LLP", "PLC", "MOU"}
        for w in words:
            clean_w = w.strip(".,;:()")
            if clean_w in acronyms:
                capitalized.append(w)
            else:
                capitalized.append(w.capitalize())
        return " ".join(capitalized)
    return clean


def is_cma_funds_article(title: str, excerpt: str, content: str) -> tuple[bool, str]:
    """
    Evaluates whether a CMA post is a genuine Funds & Fixed Income / CIS regulatory update.
    Returns (qualifies: bool, reason: str).
    """
    clean_title = clean_cma_html(title)
    clean_excerpt = clean_cma_html(excerpt)
    clean_content = clean_cma_html(content)

    if not clean_title:
        return False, "Missing title"

    combined_lead = f"{clean_title}. {clean_excerpt} {clean_content[:800]}".lower()

    # 1. Spam & Noise Rejection
    for pat in REJECTION_PATTERNS:
        if re.search(pat, combined_lead, re.IGNORECASE):
            return False, f"Matched rejection pattern: {pat}"

    # 2. Strong Title or Lead Match
    has_title_match = any(re.search(pat, clean_title, re.IGNORECASE) for pat in QUALIFYING_TITLE_PATTERNS)
    has_lead_match = any(re.search(pat, combined_lead, re.IGNORECASE) for pat in QUALIFYING_TITLE_PATTERNS)

    if not has_title_match and not has_lead_match:
        return False, "No qualifying funds / fixed-income / CIS keywords in title or lead"

    return True, "Qualifies as official Funds & Fixed Income / CIS regulatory publication"


class CmaScraper:
    """Official CMA WordPress REST API Scraper."""

    def __init__(self, api_url: str = CMA_BASE_API_URL, timeout: int = CMA_DEFAULT_TIMEOUT):
        self.api_url = api_url
        self.timeout = timeout
        self.headers = {
            "User-Agent": "KenyaFundFinder-NewsCollector/1.0 (+https://kenyafundfinder.com)",
            "Accept": "application/json",
        }

    def fetch_recent_posts(self, limit: int = 20) -> list[dict]:
        """Fetch recent posts from the official CMA WordPress REST API."""
        url = f"{self.api_url}?per_page={limit}"
        try:
            r = requests.get(url, headers=self.headers, timeout=self.timeout)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list):
                return data
            logger.warning(f"Unexpected CMA API response format: {type(data)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching posts from CMA API ({url}): {e}")
            return []

    def parse_post_to_article_payload(self, post: dict) -> dict | None:
        """
        Parses a CMA post dictionary into a standard news_articles record payload.
        Returns None if the post does not qualify or data is malformed.
        """
        if not post or not isinstance(post, dict):
            return None

        raw_title = post.get("title", {}).get("rendered", "")
        raw_excerpt = post.get("excerpt", {}).get("rendered", "")
        raw_content = post.get("content", {}).get("rendered", "")
        canonical_link = post.get("link", "").strip()
        date_iso = post.get("date", "").strip()

        # Step 1: Qualification check
        qualifies, reason = is_cma_funds_article(raw_title, raw_excerpt, raw_content)
        if not qualifies:
            logger.debug(f"CMA post skipped ({reason}): {raw_title[:60]}")
            return None

        # Step 2: Validate date
        if not date_iso:
            logger.warning("CMA post skipped: missing date")
            return None

        date_published = date_iso.split("T")[0] if "T" in date_iso else date_iso
        try:
            datetime.strptime(date_published, "%Y-%m-%d")
        except Exception:
            logger.warning(f"CMA post skipped: malformed date '{date_published}'")
            return None

        # Step 3: Format text
        title = clean_cma_title(raw_title)
        content_text = clean_cma_html(raw_content)
        excerpt_text = clean_cma_html(raw_excerpt)

        # Build clean summary from excerpt or first 250 characters of lead
        summary = excerpt_text if (excerpt_text and len(excerpt_text) > 30) else content_text[:280].strip()
        if not summary.endswith((".", "!", "?")):
            summary += "..."

        words_count = len(content_text.split()) if content_text else len(summary.split())
        read_time = f"{max(1, round(words_count / 200))} min read"

        # Truthful timestamp (ISO with time only if truthful from CMA API)
        source_published_at = date_iso if ("T" in date_iso and not date_iso.endswith("T00:00:00")) else None

        return {
            "title": title,
            "summary": summary,
            "content": content_text,
            "category": "Funds & Fixed Income",
            "source": "Capital Markets Authority",
            "url": canonical_link,
            "date_published": date_published,
            "source_published_at": source_published_at,
            "read_time": read_time,
            "image_url": "https://www.cma.or.ke/wp-content/uploads/2025/11/press.png",
        }
