"""
Official CMA Kenya Editorial & Ingestion Bridge

Safely ingests verified Capital Markets Authority (CMA) Kenya regulatory
announcements, fund approvals (MMFs, Unit Trusts, Fixed Income funds),
and licensing actions into KenyaFundFinder's public.news_articles table.

Guarantees:
- Activation Boundary: Only articles published on or after CMA_NEWS_ACTIVATION_DATE
  (default: 2026-08-23) are automatically published to prevent historical backfill flooding.
- Strict Idempotency: Deduplicates by official CMA canonical URL.
- Zero Hallucination: Verbatim facts, numbers, and dates directly from CMA API.
- Non-Fatal Isolation: Errors during ingestion never fail other pipeline components.
- Strict Market-Link Safety: Preserves relatedMmf = null for general market updates.
"""

import os
import sys
import logging
from datetime import datetime
import requests

from scrapers.cma_scraper import CmaScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# CMA Batch 3 Rollout Activation Date Boundary (23 August 2026)
CMA_NEWS_ACTIVATION_DATE = os.environ.get("CMA_NEWS_ACTIVATION_DATE", "2026-08-23")


def get_cma_activation_boundary_date() -> datetime:
    """
    Parses and validates the CMA_NEWS_ACTIVATION_DATE configuration.
    Fails closed (returns None) if malformed or missing.
    """
    raw_val = os.environ.get("CMA_NEWS_ACTIVATION_DATE", "2026-08-23")
    if not raw_val or not isinstance(raw_val, str):
        logger.error("Missing or invalid CMA_NEWS_ACTIVATION_DATE config.")
        return None
    try:
        return datetime.strptime(raw_val.strip(), "%Y-%m-%d").date()
    except Exception:
        logger.error(
            f"Malformed CMA_NEWS_ACTIVATION_DATE: '{raw_val}'. "
            "Must be formatted as YYYY-MM-DD. Fails closed (editorial generation disabled)."
        )
        return None


def publish_cma_article(
    supabase_url: str,
    supabase_key: str,
    article_payload: dict,
    dry_run: bool = True,
) -> dict:
    """
    Publishes or idempotently updates a single CMA news article in public.news_articles.
    """
    if not article_payload or not isinstance(article_payload, dict):
        return {"status": "INVALID_PAYLOAD", "action": "SKIPPED"}

    url = article_payload.get("url")
    title = article_payload.get("title")
    if not url or not title:
        return {"status": "MISSING_IDENTITY", "action": "SKIPPED"}

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Step 1: Query existing article by canonical URL
    existing_article = None
    try:
        encoded_url = requests.utils.quote(url, safe="")
        r = requests.get(
            f"{supabase_url}/rest/v1/news_articles?url=eq.{encoded_url}&select=id,title,summary,content",
            headers=headers,
            timeout=10,
        )
        if r.status_code == 200 and r.json():
            existing_article = r.json()[0]
    except Exception as e:
        logger.error(f"Error checking existing CMA news_article by url: {e}")

    # Fallback to title check if URL check yielded nothing
    if not existing_article and title:
        try:
            encoded_title = requests.utils.quote(title, safe="")
            r = requests.get(
                f"{supabase_url}/rest/v1/news_articles?title=eq.{encoded_title}&select=id,title,summary,content",
                headers=headers,
                timeout=10,
            )
            if r.status_code == 200 and r.json():
                existing_article = r.json()[0]
        except Exception as e:
            logger.error(f"Error checking existing CMA news_article by title: {e}")

    if existing_article:
        existing_id = existing_article["id"]
        # Check if content is identical
        if (
            existing_article.get("summary") == article_payload.get("summary")
            and existing_article.get("content") == article_payload.get("content")
        ):
            logger.info(f"UNCHANGED: CMA news article already exists ({existing_id}). Skipping.")
            return {"status": "UNCHANGED", "action": "SKIPPED", "id": existing_id}

        # Content changed: update idempotently
        if dry_run:
            logger.info(f"DRY_RUN: Would update existing CMA news_article {existing_id}")
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
                "source_published_at": article_payload.get("source_published_at"),
                "updated_at": datetime.utcnow().isoformat(),
            }
            r = requests.patch(
                f"{supabase_url}/rest/v1/news_articles?id=eq.{existing_id}",
                headers=req_headers,
                json=update_payload,
                timeout=10,
            )
            r.raise_for_status()
            logger.info(f"Successfully updated CMA news_article {existing_id}")
            return {"status": "SUCCESS", "action": "UPDATED", "id": existing_id}
        except Exception as e:
            logger.error(f"Failed to update CMA news_article {existing_id}: {e}")
            return {"status": "ERROR", "action": "UPDATE_FAILED", "error": str(e)}

    # Step 2: New article insertion
    if dry_run:
        logger.info(f"DRY_RUN: Would insert new CMA news_article: '{title}'")
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
        logger.info(f"Successfully created official CMA news_article {new_id}: '{title}'")
        return {"status": "SUCCESS", "action": "INSERTED", "id": new_id}
    except Exception as e:
        logger.error(f"Failed to insert news_article for CMA post: {e}")
        return {"status": "ERROR", "action": "INSERT_FAILED", "error": str(e)}


def run_cma_news_ingestion(
    supabase_url: str,
    supabase_key: str,
    limit: int = 20,
    dry_run: bool = True,
    allow_historical_backfill: bool = False,
) -> dict:
    """
    Discovers, validates, filters, and ingests official CMA announcements.
    """
    scraper = CmaScraper()
    posts = scraper.fetch_recent_posts(limit=limit)

    summary = {
        "fetched": len(posts),
        "qualified": 0,
        "skipped_historical": 0,
        "skipped_rejected": 0,
        "inserted": 0,
        "updated": 0,
        "unchanged": 0,
        "errors": 0,
        "results": [],
    }

    activation_boundary = get_cma_activation_boundary_date()
    if activation_boundary is None and not allow_historical_backfill:
        logger.error("CMA ingestion aborted: activation boundary invalid or unconfigured.")
        summary["errors"] += 1
        return summary

    for post in posts:
        payload = scraper.parse_post_to_article_payload(post)
        if not payload:
            summary["skipped_rejected"] += 1
            continue

        summary["qualified"] += 1
        date_published = payload["date_published"]

        # Check activation boundary
        try:
            pub_dt = datetime.strptime(date_published, "%Y-%m-%d").date()
        except Exception:
            logger.warning(f"CMA post skipped: malformed date '{date_published}'")
            summary["errors"] += 1
            continue

        if not allow_historical_backfill and pub_dt < activation_boundary:
            logger.info(
                f"CMA publication skipped: date {date_published} "
                f"predates activation boundary {activation_boundary}."
            )
            summary["skipped_historical"] += 1
            summary["results"].append({
                "title": payload["title"],
                "date_published": date_published,
                "status": "SKIPPED_HISTORICAL",
            })
            continue

        # Ingest/Publish
        res = publish_cma_article(supabase_url, supabase_key, payload, dry_run=dry_run)
        action = res.get("action")
        if action == "INSERTED" or action == "WOULD_INSERT":
            summary["inserted"] += 1
        elif action == "UPDATED" or action == "WOULD_UPDATE":
            summary["updated"] += 1
        elif action == "SKIPPED" and res.get("status") == "UNCHANGED":
            summary["unchanged"] += 1
        elif res.get("status") == "ERROR":
            summary["errors"] += 1

        summary["results"].append({
            "title": payload["title"],
            "date_published": date_published,
            "url": payload["url"],
            "result": res,
        })

    return summary
