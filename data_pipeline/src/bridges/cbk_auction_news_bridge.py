"""
CBK Treasury Auction Editorial Bridge for KenyaFundFinder

Deterministically transforms verified, persisted Central Bank of Kenya (CBK)
Treasury Bill auction records into factual, publication-ready news_articles.

Guarantees:
- Zero hallucination: all numbers, dates, and tenors come directly from verified DB records.
- Zero speculative content: no sentiment, policy forecasts, or inflation claims.
- Idempotent: safe against retries, reruns, or updated publication PDFs.
- Truthful dates: never manufactures clock times for source_published_at.
- Isolated failure: errors during editorial generation never disrupt Treasury data ingestion.
"""

import os
import sys
import json
import logging
from datetime import datetime
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def format_currency_billions(amount_shillings: float | None) -> str:
    """Format absolute shillings to clean billions/millions string."""
    if amount_shillings is None:
        return "N/A"
    try:
        val = float(amount_shillings)
        # Defensive check for legacy rows stored with double-million scaling (e.g. >= 1e14)
        if abs(val) >= 1e14:
            val = val / 1_000_000.0

        if abs(val) >= 1_000_000_000:
            return f"KES {val / 1_000_000_000:.2f}B"
        elif abs(val) >= 1_000_000:
            return f"KES {val / 1_000_000:.2f}M"
        else:
            return f"KES {val:,.2f}"
    except (ValueError, TypeError):
        return "N/A"


def format_rate(rate: float | None) -> str:
    """Format interest rate as clean percentage string."""
    if rate is None:
        return "N/A"
    try:
        val = float(rate)
        return f"{val:.4f}%".rstrip('0').rstrip('.') + "%" if val.is_integer() else f"{val:.2f}%"
    except (ValueError, TypeError):
        return "N/A"


def calculate_bps_change(current_rate: float | None, previous_rate: float | None) -> str:
    """Calculate basis-point change between current and previous auction rate."""
    if current_rate is None or previous_rate is None:
        return "N/A"
    try:
        diff_pct = float(current_rate) - float(previous_rate)
        bps = diff_pct * 100
        if abs(bps) < 0.01:
            return "unchanged (0 bps)"
        elif bps > 0:
            return f"+{bps:.1f} bps"
        else:
            return f"{bps:.1f} bps"
    except (ValueError, TypeError):
        return "N/A"


def determine_publication_date(
    auction_rows: list[dict],
    auction_date: str,
) -> tuple[str, str | None]:
    """
    Deterministically determines the official results publication date
    separately from the auction date.

    Priority hierarchy:
    1. Check for explicit `published_at` timestamp in any row (extract YYYY-MM-DD, retain ISO only if truthful).
    2. Check for explicit `publication_date`, `results_date`, or `footer_date` in any row.
    3. For standard CBK weekly auctions, results are signed and released on the auction date (Thursday),
       so fallback to `auction_date`.
    
    Returns:
    (date_published_str: 'YYYY-MM-DD', source_published_at_str: ISO string or None)
    """
    for row in auction_rows:
        pub_at = row.get("published_at")
        if pub_at and isinstance(pub_at, str):
            clean_pub = pub_at.strip()
            if "T" in clean_pub:
                date_part = clean_pub.split("T")[0]
                # If time is generic midnight (00:00:00), treat time component as absent
                if clean_pub.endswith("T00:00:00+00:00") or clean_pub.endswith("T00:00:00Z"):
                    return (date_part, None)
                return (date_part, clean_pub)
            elif len(clean_pub) == 10 and clean_pub.count("-") == 2:
                return (clean_pub, None)

        for date_key in ("publication_date", "results_date", "footer_date"):
            val = row.get(date_key)
            if val and isinstance(val, str):
                clean_val = val.strip()
                if len(clean_val) == 10 and clean_val.count("-") == 2:
                    return (clean_val, None)

    # Standard CBK weekly results release date corresponds to auction date
    return (auction_date, None)


# Batch 2 Rollout Activation Date Boundary (23 August 2026)
# Only official CBK auctions with results publication date >= activation boundary generate news.
# Historical repairs/backfills predating this boundary will persist to treasury_bill_auctions,
# but will NOT generate news_articles automatically.
CBK_AUCTION_NEWS_ACTIVATION_DATE = os.environ.get("CBK_AUCTION_NEWS_ACTIVATION_DATE", "2026-08-23")


def get_activation_boundary_date() -> datetime:
    """
    Parses and validates the CBK_AUCTION_NEWS_ACTIVATION_DATE configuration.
    Fails closed (returns None) if malformed or missing.
    """
    raw_val = os.environ.get("CBK_AUCTION_NEWS_ACTIVATION_DATE", "2026-08-23")
    if not raw_val or not isinstance(raw_val, str):
        logger.error("Missing or invalid CBK_AUCTION_NEWS_ACTIVATION_DATE config.")
        return None
    try:
        return datetime.strptime(raw_val.strip(), "%Y-%m-%d").date()
    except Exception:
        logger.error(
            f"Malformed CBK_AUCTION_NEWS_ACTIVATION_DATE: '{raw_val}'. "
            "Must be formatted as YYYY-MM-DD. Fails closed (editorial generation disabled)."
        )
        return None


def format_cbk_tbill_auction_article(
    auction_rows: list[dict],
    source_url: str = None,
    allow_historical_news_backfill: bool = False,
) -> dict | None:
    """
    Deterministically formats an array of treasury_bill_auctions rows
    (for a single auction_date) into a publication-ready news_articles record.

    Parameters
    ----------
    auction_rows : list[dict]
        Rows queried from treasury_bill_auctions for a given auction_date.
    source_url : str, optional
        Official CBK results PDF URL.
    allow_historical_news_backfill : bool, optional
        If True, permits generating news articles for historical auctions predating
        CBK_AUCTION_NEWS_ACTIVATION_DATE. Default is False.

    Returns
    -------
    dict | None
        Structured news_articles payload, or None if input data is invalid or historical.
    """
    if not auction_rows or not isinstance(auction_rows, list):
        logger.warning("Editorial bridge called with empty or invalid auction_rows.")
        return None

    # Filter rows with valid tenor (91, 182, 364) and accepted rate
    tenor_map: dict[int, dict] = {}
    auction_date = None
    issue_date = None
    pdf_source_url = source_url

    for row in auction_rows:
        try:
            tenor = int(row.get("tenor_days") or 0)
            if tenor in (91, 182, 364):
                tenor_map[tenor] = row
                if not auction_date and row.get("auction_date"):
                    auction_date = str(row["auction_date"]).strip()
                if not issue_date and row.get("issue_date"):
                    issue_date = str(row["issue_date"]).strip()
                if not pdf_source_url and row.get("source_url"):
                    pdf_source_url = str(row["source_url"]).strip()
        except (ValueError, TypeError):
            continue

    if not tenor_map or not auction_date:
        logger.warning(f"No valid tenors or missing auction_date for rows: {auction_rows}")
        return None

    # Determine publication date separately from auction date
    date_published, source_published_at = determine_publication_date(auction_rows, auction_date)

    # Validate date_published format (YYYY-MM-DD) - Fail closed if invalid
    if not date_published or not isinstance(date_published, str):
        logger.warning("CBK editorial event skipped: publication date unavailable.")
        return None

    try:
        pub_dt = datetime.strptime(date_published, "%Y-%m-%d").date()
    except Exception:
        logger.warning(f"CBK editorial event skipped: publication date '{date_published}' is malformed.")
        return None

    # Historical Rollout Safeguard: Block historical auctions from automatically generating news
    if not allow_historical_news_backfill:
        activation_boundary = get_activation_boundary_date()
        if activation_boundary is None:
            logger.warning("CBK editorial event skipped: activation boundary is invalid or unconfigured.")
            return None
        if pub_dt < activation_boundary:
            logger.info(
                f"CBK editorial event skipped: publication date {date_published} "
                f"predates Batch 2 activation boundary {activation_boundary}."
            )
            return None

    # Sort available tenors (91, 182, 364)
    sorted_tenors = sorted(tenor_map.keys())

    # Build title components
    title_rate_parts = []
    for t in sorted_tenors:
        r = tenor_map[t].get("accepted_average_rate")
        if r is not None:
            title_rate_parts.append(f"{t}-Day at {float(r):.2f}%")

    if not title_rate_parts:
        logger.warning("No accepted rates found across any tenor.")
        return None

    title = f"CBK Weekly T-Bill Auction: {', '.join(title_rate_parts)}"

    # Calculate totals
    total_offered = 0.0
    total_bids = 0.0
    total_accepted = 0.0

    def _clean_shillings(v):
        if v is None:
            return 0.0
        val = float(v)
        if abs(val) >= 1e14:
            val = val / 1_000_000.0
        return val

    for t in sorted_tenors:
        row = tenor_map[t]
        total_offered += _clean_shillings(row.get("amount_offered"))
        total_bids += _clean_shillings(row.get("bids_received"))
        total_accepted += _clean_shillings(row.get("amount_accepted"))

    overall_subscription = (total_bids / total_offered * 100) if total_offered > 0 else None

    # Format human-readable dates
    def _format_date(d_str: str) -> str:
        try:
            dt = datetime.strptime(d_str, "%Y-%m-%d")
            return dt.strftime("%d %B %Y")
        except Exception:
            return d_str

    formatted_auction_date = _format_date(auction_date)
    formatted_pub_date = _format_date(date_published)

    # Build Takeaway summary (1-2 sentences)
    rate_summary_phrases = []
    for t in sorted_tenors:
        r = tenor_map[t].get("accepted_average_rate")
        if r is not None:
            rate_summary_phrases.append(f"{float(r):.2f}% for the {t}-day bill")

    rates_joined = ", ".join(rate_summary_phrases[:-1]) + f", and {rate_summary_phrases[-1]}" if len(rate_summary_phrases) > 1 else rate_summary_phrases[0]

    summary_sentence_1 = f"In the weekly Treasury bill auction held on {formatted_auction_date}, the Central Bank of Kenya accepted weighted average yields of {rates_joined}."
    
    if total_offered > 0 and total_bids > 0:
        summary_sentence_2 = f" Investors submitted {format_currency_billions(total_bids)} in total bids against an advertised offer of {format_currency_billions(total_offered)}, with the CBK accepting {format_currency_billions(total_accepted)}{f' (performance rate of {overall_subscription:.1f}%)' if overall_subscription else ''}."
    else:
        summary_sentence_2 = ""

    summary = (summary_sentence_1 + summary_sentence_2).strip()

    # Build Markdown Content Body
    content_lines = [
        "### Auction Snapshot\n",
    ]

    for t in sorted_tenors:
        row = tenor_map[t]
        yield_val = row.get("accepted_average_rate")
        prev_val = row.get("previous_rate")
        issue_no = row.get("issue_number", f"Issue {t}")
        perf = row.get("performance_rate")
        acc_amt = row.get("amount_accepted")
        bids_amt = row.get("bids_received")

        bps_change = calculate_bps_change(yield_val, prev_val)

        content_lines.append(f"- **{t}-Day Treasury Bill** (`{issue_no}`):")
        content_lines.append(f"  - **Accepted Average Yield**: {float(yield_val):.4f}%" if yield_val is not None else "  - **Accepted Average Yield**: N/A")
        if prev_val is not None:
            content_lines.append(f"  - **Previous Auction Yield**: {float(prev_val):.4f}% ({bps_change})")
        if bids_amt is not None and acc_amt is not None:
            content_lines.append(f"  - **Bids Received / Accepted**: {format_currency_billions(bids_amt)} / {format_currency_billions(acc_amt)}")
        if perf is not None:
            content_lines.append(f"  - **Subscription / Performance Rate**: {float(perf):.2f}%")

    content_lines.append("\n### What We Know\n")
    content_lines.append(f"- **Auction Date**: {formatted_auction_date}")
    if date_published != auction_date:
        content_lines.append(f"- **Results Publication Date**: {formatted_pub_date}")
    if issue_date:
        content_lines.append(f"- **Value / Settlement Date**: {issue_date}")
    if total_offered > 0:
        content_lines.append(f"- **Total Amount Advertised**: {format_currency_billions(total_offered)}")
    if total_bids > 0:
        content_lines.append(f"- **Total Bids Submitted**: {format_currency_billions(total_bids)}")
    if total_accepted > 0:
        content_lines.append(f"- **Total Amount Accepted**: {format_currency_billions(total_accepted)}")

    if pdf_source_url:
        content_lines.append(f"\n### Official Source\n")
        content_lines.append(f"Official auction results published by the [Central Bank of Kenya]({pdf_source_url}).")

    content = "\n".join(content_lines)

    article_payload = {
        "title": title,
        "summary": summary,
        "content": content,
        "source": "Central Bank of Kenya",
        "category": "Yield Updates",
        "url": pdf_source_url or f"https://www.centralbank.go.ke/bills-bonds/treasury-bills/?date={auction_date}",
        "date_published": date_published,
        "source_published_at": source_published_at,
        "read_time": "2 min read",
        "is_featured": False,
        "status": "published",
    }

    return article_payload


def publish_cbk_auction_article(
    supabase_url: str,
    supabase_key: str,
    article_payload: dict,
    dry_run: bool = True,
) -> dict:
    """
    Safely and idempotently publishes or updates an official CBK auction news article.

    Idempotency:
    - Queries news_articles by URL and title pattern.
    - If identical record exists -> NO-OP (SKIPPED).
    - If record exists but verified content changed -> UPDATES existing record.
    - If record does not exist -> INSERTS new record (or DRY_RUN_OK).
    """
    if not article_payload or not isinstance(article_payload, dict):
        return {"status": "INVALID_PAYLOAD", "action": "ABORTED"}

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    source_url = article_payload.get("url")
    title = article_payload.get("title")

    # Step 1: Check existing news articles by URL
    existing_article = None
    if source_url:
        try:
            import urllib.parse
            encoded_url = urllib.parse.quote(source_url)
            r = requests.get(
                f"{supabase_url}/rest/v1/news_articles?url=eq.{encoded_url}&select=id,title,summary,content,url",
                headers=headers,
                timeout=10,
            )
            if r.status_code == 200 and r.json():
                existing_article = r.json()[0]
        except Exception as e:
            logger.error(f"Error checking existing news_article by URL: {e}")

    # Fallback check by exact title if URL didn't match
    if not existing_article and title:
        try:
            import urllib.parse
            encoded_title = urllib.parse.quote(title)
            r = requests.get(
                f"{supabase_url}/rest/v1/news_articles?title=eq.{encoded_title}&select=id,title,summary,content,url",
                headers=headers,
                timeout=10,
            )
            if r.status_code == 200 and r.json():
                existing_article = r.json()[0]
        except Exception as e:
            logger.error(f"Error checking existing news_article by title: {e}")

    if existing_article:
        existing_id = existing_article["id"]
        # Check if content is unchanged
        if (
            existing_article.get("summary") == article_payload.get("summary")
            and existing_article.get("content") == article_payload.get("content")
        ):
            logger.info(f"UNCHANGED: News article already exists for CBK auction ({existing_id}). Skipping.")
            return {"status": "UNCHANGED", "action": "SKIPPED", "id": existing_id}

        # Content changed: update existing article idempotently
        if dry_run:
            logger.info(f"DRY_RUN: Would update existing news_article {existing_id}")
            return {"status": "DRY_RUN_UPDATE", "action": "WOULD_UPDATE", "id": existing_id, "payload": article_payload}

        try:
            req_headers = headers.copy()
            req_headers["Prefer"] = "return=representation"
            update_payload = {
                "title": article_payload["title"],
                "summary": article_payload["summary"],
                "content": article_payload["content"],
                "category": article_payload["category"],
                "date_published": article_payload["date_published"],
                "updated_at": datetime.utcnow().isoformat(),
            }
            r = requests.patch(
                f"{supabase_url}/rest/v1/news_articles?id=eq.{existing_id}",
                headers=req_headers,
                json=update_payload,
                timeout=10,
            )
            r.raise_for_status()
            logger.info(f"Successfully updated news_article {existing_id} with verified CBK data.")
            return {"status": "SUCCESS", "action": "UPDATED", "id": existing_id}
        except Exception as e:
            logger.error(f"Failed to update news_article {existing_id}: {e}")
            return {"status": "ERROR", "action": "UPDATE_FAILED", "error": str(e)}

    # Step 2: New article insertion
    if dry_run:
        logger.info(f"DRY_RUN: Would insert new news_article: '{title}'")
        return {"status": "DRY_RUN_INSERT", "action": "WOULD_INSERT", "payload": article_payload}

    try:
        req_headers = headers.copy()
        req_headers["Prefer"] = "return=representation"
        r = requests.post(
            f"{supabase_url}/rest/v1/news_articles",
            headers=req_headers,
            json=article_payload,
            timeout=10,
        )
        r.raise_for_status()
        created = r.json()[0] if r.json() else {}
        new_id = created.get("id")
        logger.info(f"Successfully created official CBK news_article {new_id}: '{title}'")
        return {"status": "SUCCESS", "action": "INSERTED", "id": new_id}
    except Exception as e:
        logger.error(f"Failed to insert news_article for CBK auction: {e}")
        return {"status": "ERROR", "action": "INSERT_FAILED", "error": str(e)}


def generate_news_for_auction_date(
    supabase_url: str,
    supabase_key: str,
    auction_date: str,
    dry_run: bool = True,
    allow_historical_news_backfill: bool = False,
) -> dict:
    """
    Fetches persisted rows from treasury_bill_auctions for a given auction_date,
    formats the factual news event, and publishes/updates news_articles.
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }

    try:
        r = requests.get(
            f"{supabase_url}/rest/v1/treasury_bill_auctions?auction_date=eq.{auction_date}&select=*",
            headers=headers,
            timeout=10,
        )
        r.raise_for_status()
        rows = r.json()
        if not rows:
            logger.warning(f"No treasury_bill_auctions rows found for auction_date {auction_date}")
            return {"status": "NOT_FOUND", "auction_date": auction_date}

        payload = format_cbk_tbill_auction_article(
            rows,
            allow_historical_news_backfill=allow_historical_news_backfill,
        )
        if not payload:
            return {"status": "SKIPPED_HISTORICAL_OR_INVALID", "auction_date": auction_date}

        return publish_cbk_auction_article(supabase_url, supabase_key, payload, dry_run=dry_run)
    except Exception as e:
        logger.error(f"Error generating news for auction_date {auction_date}: {e}")
        return {"status": "ERROR", "error": str(e)}
