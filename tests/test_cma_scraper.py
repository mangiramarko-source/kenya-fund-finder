"""
Tests for Official CMA Kenya Scraper and Editorial Bridge
"""

import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add data_pipeline/src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../data_pipeline/src")))

from scrapers.cma_scraper import (
    CmaScraper,
    is_cma_funds_article,
    clean_cma_html,
    clean_cma_title,
)
from bridges.cma_news_bridge import (
    publish_cma_article,
    run_cma_news_ingestion,
    get_cma_activation_boundary_date,
)


class TestCmaScraperAndBridge(unittest.TestCase):
    def setUp(self):
        self.qualifying_post = {
            "id": 6747,
            "date": "2026-08-27T10:12:00",
            "slug": "cma-approves-additional-unit-trust-sub-funds",
            "link": "https://www.cma.or.ke/cma-approves-additional-unit-trust-sub-funds/",
            "title": {"rendered": "CMA APPROVES ADDITIONAL UNIT TRUST SUB-FUNDS AND AN ALTERNATIVE INVESTMENT FUND TO EXPAND INVESTOR CHOICE"},
            "excerpt": {"rendered": "<p>Nairobi 27 August 2026… The Capital Markets Authority (CMA) has approved the registration of additional Collective Investment Scheme sub-funds.</p>"},
            "content": {"rendered": "<p>The Authority has authorised Britam Asset Managers Limited to register two new sub-funds under the existing Britam Unit Trust Funds umbrella scheme, the Britam Multi Asset Special Fund (KES) and the Britam Enhanced Global Equities Special Fund (USD).</p>"},
        }

        self.spam_post = {
            "id": 6776,
            "date": "2026-08-27T10:00:00",
            "slug": "vavada-casino",
            "link": "https://www.cma.or.ke/vavada-casino/",
            "title": {"rendered": "Vavada Casino Online"},
            "excerpt": {"rendered": "<p>Play slots and poker online at Vavada casino.</p>"},
            "content": {"rendered": "<p>Online casino games.</p>"},
        }

        self.tender_post = {
            "id": 5400,
            "date": "2026-08-27T08:00:00",
            "slug": "tender-notice-supply-of-laptops",
            "link": "https://www.cma.or.ke/tender-notice/",
            "title": {"rendered": "TENDER NOTICE: SUPPLY AND DELIVERY OF LAPTOPS"},
            "excerpt": {"rendered": "<p>The Capital Markets Authority invites sealed tenders from eligible candidates.</p>"},
            "content": {"rendered": "<p>Procurement notice for supply of office equipment.</p>"},
        }

        self.coffee_post = {
            "id": 6088,
            "date": "2026-08-27T09:00:00",
            "slug": "cma-grants-coffee-broker-licenses",
            "link": "https://www.cma.or.ke/cma-grants-coffee-broker-licenses/",
            "title": {"rendered": "CMA GRANTS COFFEE BROKER LICENSES AND APPROVES DIRECT SETTLEMENT SYSTEM PROVIDER"},
            "excerpt": {"rendered": "<p>Licensing for coffee brokers at the Nairobi Coffee Exchange.</p>"},
            "content": {"rendered": "<p>Commodity exchange broker approvals.</p>"},
        }

    def test_clean_cma_html(self):
        html = "<p>Hello <b>World</b>!</p><script>alert('test')</script>"
        self.assertEqual(clean_cma_html(html), "Hello World !")

    def test_clean_cma_title(self):
        title = "CMA APPROVES NEW MMF AND UNIT TRUST SCHEMES ACROSS KENYA"
        cleaned = clean_cma_title(title)
        self.assertIn("CMA", cleaned)
        self.assertIn("MMF", cleaned)
        self.assertIn("Unit Trust", cleaned)

    def test_is_cma_funds_article_qualifying(self):
        ok, reason = is_cma_funds_article(
            self.qualifying_post["title"]["rendered"],
            self.qualifying_post["excerpt"]["rendered"],
            self.qualifying_post["content"]["rendered"],
        )
        self.assertTrue(ok)

    def test_is_cma_funds_article_rejects_spam(self):
        ok, reason = is_cma_funds_article(
            self.spam_post["title"]["rendered"],
            self.spam_post["excerpt"]["rendered"],
            self.spam_post["content"]["rendered"],
        )
        self.assertFalse(ok)
        self.assertIn("rejection pattern", reason)

    def test_is_cma_funds_article_rejects_tender(self):
        ok, reason = is_cma_funds_article(
            self.tender_post["title"]["rendered"],
            self.tender_post["excerpt"]["rendered"],
            self.tender_post["content"]["rendered"],
        )
        self.assertFalse(ok)
        self.assertIn("rejection pattern", reason)

    def test_is_cma_funds_article_rejects_coffee(self):
        ok, reason = is_cma_funds_article(
            self.coffee_post["title"]["rendered"],
            self.coffee_post["excerpt"]["rendered"],
            self.coffee_post["content"]["rendered"],
        )
        self.assertFalse(ok)

    def test_parse_post_to_article_payload_qualifying(self):
        scraper = CmaScraper()
        payload = scraper.parse_post_to_article_payload(self.qualifying_post)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["category"], "Funds & Fixed Income")
        self.assertEqual(payload["source"], "Capital Markets Authority")
        self.assertEqual(payload["date_published"], "2026-08-27")
        self.assertEqual(payload["source_published_at"], "2026-08-27T10:12:00")
        self.assertEqual(payload["url"], "https://www.cma.or.ke/cma-approves-additional-unit-trust-sub-funds/")
        self.assertIn("Britam Asset Managers", payload["content"])

    def test_parse_post_to_article_payload_rejects_non_qualifying(self):
        scraper = CmaScraper()
        self.assertIsNone(scraper.parse_post_to_article_payload(self.spam_post))
        self.assertIsNone(scraper.parse_post_to_article_payload(self.tender_post))
        self.assertIsNone(scraper.parse_post_to_article_payload(self.coffee_post))

    def test_cma_activation_date_safeguard(self):
        scraper = CmaScraper()
        # Historical post from 2026-07-08 (predates activation 2026-08-23)
        historical_post = dict(self.qualifying_post)
        historical_post["date"] = "2026-07-08T09:41:06"

        payload = scraper.parse_post_to_article_payload(historical_post)
        self.assertIsNotNone(payload)

        # Ingestion bridge without historical backfill should skip
        with patch.object(CmaScraper, "fetch_recent_posts", return_value=[historical_post]):
            res = run_cma_news_ingestion(
                "https://test.supabase.co",
                "test-key",
                dry_run=True,
                allow_historical_backfill=False,
            )
            self.assertEqual(res["skipped_historical"], 1)
            self.assertEqual(res["inserted"], 0)

    def test_cma_future_article_ingestion_allowed(self):
        # Future post from 2026-08-27
        with patch.object(CmaScraper, "fetch_recent_posts", return_value=[self.qualifying_post]):
            with patch("bridges.cma_news_bridge.publish_cma_article", return_value={"status": "DRY_RUN_INSERT", "action": "WOULD_INSERT"}):
                res = run_cma_news_ingestion(
                    "https://test.supabase.co",
                    "test-key",
                    dry_run=True,
                    allow_historical_backfill=False,
                )
                self.assertEqual(res["qualified"], 1)
                self.assertEqual(res["skipped_historical"], 0)
                self.assertEqual(res["inserted"], 1)

    def test_malformed_cma_activation_config_fails_closed(self):
        with patch.dict(os.environ, {"CMA_NEWS_ACTIVATION_DATE": "invalid-date-format"}):
            self.assertIsNone(get_cma_activation_boundary_date())
            with patch.object(CmaScraper, "fetch_recent_posts", return_value=[self.qualifying_post]):
                res = run_cma_news_ingestion(
                    "https://test.supabase.co",
                    "test-key",
                    dry_run=True,
                    allow_historical_backfill=False,
                )
                self.assertGreater(res["errors"], 0)
                self.assertEqual(res["inserted"], 0)


if __name__ == "__main__":
    unittest.main()
