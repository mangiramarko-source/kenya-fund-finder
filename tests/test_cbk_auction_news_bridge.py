"""
Tests for CBK Treasury Auction Editorial Bridge
"""

import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Ensure data_pipeline/src is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../data_pipeline/src")))

from bridges.cbk_auction_news_bridge import (
    format_currency_billions,
    format_rate,
    calculate_bps_change,
    format_cbk_tbill_auction_article,
    publish_cbk_auction_article,
)


class TestCbkAuctionNewsBridge(unittest.TestCase):

    def setUp(self):
        self.sample_rows_full = [
            {
                "tenor_days": 91,
                "issue_number": "2695/091",
                "auction_date": "2026-08-13",
                "issue_date": "2026-08-17",
                "amount_offered": 8000000000.0,
                "bids_received": 18236310000.0,
                "amount_accepted": 16364210000.0,
                "accepted_average_rate": 8.7734,
                "previous_rate": 8.7820,
                "performance_rate": 227.95,
                "source_url": "https://www.centralbank.go.ke/uploads/results_2695.pdf",
            },
            {
                "tenor_days": 182,
                "issue_number": "2669/182",
                "auction_date": "2026-08-13",
                "issue_date": "2026-08-17",
                "amount_offered": 10000000000.0,
                "bids_received": 8993350000.0,
                "amount_accepted": 7092670000.0,
                "accepted_average_rate": 8.9500,
                "previous_rate": 8.9500,
                "performance_rate": 89.93,
                "source_url": "https://www.centralbank.go.ke/uploads/results_2695.pdf",
            },
            {
                "tenor_days": 364,
                "issue_number": "2624/364",
                "auction_date": "2026-08-13",
                "issue_date": "2026-08-17",
                "amount_offered": 10000000000.0,
                "bids_received": 13560930000.0,
                "amount_accepted": 13560930000.0,
                "accepted_average_rate": 9.0365,
                "previous_rate": 9.0042,
                "performance_rate": 135.61,
                "source_url": "https://www.centralbank.go.ke/uploads/results_2695.pdf",
            },
        ]

    def test_format_currency(self):
        self.assertEqual(format_currency_billions(8_000_000_000), "KES 8.00B")
        self.assertEqual(format_currency_billions(18_236_310_000), "KES 18.24B")
        self.assertEqual(format_currency_billions(500_000_000), "KES 500.00M")
        self.assertEqual(format_currency_billions(None), "N/A")

    def test_calculate_bps_change(self):
        # 8.7734 - 8.7820 = -0.0086% -> -0.9 bps
        self.assertEqual(calculate_bps_change(8.7734, 8.7820), "-0.9 bps")
        # 9.0365 - 9.0042 = +0.0323% -> +3.2 bps
        self.assertEqual(calculate_bps_change(9.0365, 9.0042), "+3.2 bps")
        # 8.9500 - 8.9500 = 0 bps
        self.assertEqual(calculate_bps_change(8.9500, 8.9500), "unchanged (0 bps)")
        # Missing
        self.assertEqual(calculate_bps_change(8.9500, None), "N/A")

    def test_format_full_auction(self):
        payload = format_cbk_tbill_auction_article(self.sample_rows_full)
        self.assertIsNotNone(payload)
        
        # Verify title contains all 3 tenors and rates
        self.assertIn("91-Day at 8.77%", payload["title"])
        self.assertIn("182-Day at 8.95%", payload["title"])
        self.assertIn("364-Day at 9.04%", payload["title"])

        # Verify summary content
        self.assertIn("Central Bank of Kenya", payload["summary"])
        self.assertIn("8.77%", payload["summary"])
        self.assertIn("8.95%", payload["summary"])
        self.assertIn("9.04%", payload["summary"])
        self.assertIn("KES 40.79B", payload["summary"])  # 18.24 + 8.99 + 13.56 = 40.79B

        # Verify metadata
        self.assertEqual(payload["category"], "Yield Updates")
        self.assertEqual(payload["source"], "Central Bank of Kenya")
        self.assertEqual(payload["date_published"], "2026-08-13")
        self.assertIsNone(payload["source_published_at"])  # Truthful, no manufactured time
        self.assertEqual(payload["url"], "https://www.centralbank.go.ke/uploads/results_2695.pdf")

    def test_format_partial_auction_single_tenor(self):
        partial_rows = [self.sample_rows_full[0]]  # 91-day only
        payload = format_cbk_tbill_auction_article(partial_rows)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["title"], "CBK Weekly T-Bill Auction: 91-Day at 8.77%")
        self.assertIn("91-Day Treasury Bill", payload["content"])
        self.assertNotIn("182-Day Treasury Bill", payload["content"])

    def test_invalid_or_empty_rows(self):
        self.assertIsNone(format_cbk_tbill_auction_article([]))
        self.assertIsNone(format_cbk_tbill_auction_article(None))
        self.assertIsNone(format_cbk_tbill_auction_article([{"invalid": "data"}]))

    def test_publish_dry_run(self):
        payload = format_cbk_tbill_auction_article(self.sample_rows_full)
        with patch("requests.get") as mock_get:
            # Simulate no existing article
            mock_get.return_value = MagicMock(status_code=200, json=lambda: [])
            res = publish_cbk_auction_article("https://test.supabase.co", "test-key", payload, dry_run=True)
            self.assertEqual(res["status"], "DRY_RUN_INSERT")
            self.assertEqual(res["action"], "WOULD_INSERT")

    def test_publish_idempotent_unchanged(self):
        payload = format_cbk_tbill_auction_article(self.sample_rows_full)
        with patch("requests.get") as mock_get:
            # Simulate existing identical article
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: [{
                    "id": "existing-uuid-123",
                    "title": payload["title"],
                    "summary": payload["summary"],
                    "content": payload["content"],
                    "url": payload["url"],
                }]
            )
            res = publish_cbk_auction_article("https://test.supabase.co", "test-key", payload, dry_run=False)
            self.assertEqual(res["status"], "UNCHANGED")
            self.assertEqual(res["action"], "SKIPPED")
            self.assertEqual(res["id"], "existing-uuid-123")

    def test_distinct_auction_date_and_publication_date(self):
        # Auction date is Wednesday 2026-08-12, results published Thursday 2026-08-13
        custom_rows = [dict(r) for r in self.sample_rows_full]
        for r in custom_rows:
            r["auction_date"] = "2026-08-12"
            r["published_at"] = "2026-08-13T16:30:00+03:00"  # Truthful release time

        payload = format_cbk_tbill_auction_article(custom_rows)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["date_published"], "2026-08-13")
        self.assertEqual(payload["source_published_at"], "2026-08-13T16:30:00+03:00")
        
        # Article body truthfully mentions the auction date (12 August 2026)
        self.assertIn("12 August 2026", payload["summary"])
        self.assertIn("- **Auction Date**: 12 August 2026", payload["content"])
        self.assertIn("- **Results Publication Date**: 13 August 2026", payload["content"])

    def test_same_day_auction_and_publication_date(self):
        custom_rows = [dict(r) for r in self.sample_rows_full]
        for r in custom_rows:
            r["auction_date"] = "2026-08-13"
            r["published_at"] = None

        payload = format_cbk_tbill_auction_article(custom_rows)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["date_published"], "2026-08-13")
        self.assertIsNone(payload["source_published_at"])
        self.assertIn("- **Auction Date**: 13 August 2026", payload["content"])
        self.assertNotIn("- **Results Publication Date**:", payload["content"])

    def test_generic_midnight_timestamp_not_fabricated(self):
        custom_rows = [dict(r) for r in self.sample_rows_full]
        for r in custom_rows:
            r["auction_date"] = "2026-08-13"
            r["published_at"] = "2026-08-13T00:00:00+00:00"  # Generic midnight ISO

        payload = format_cbk_tbill_auction_article(custom_rows)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["date_published"], "2026-08-13")
        self.assertIsNone(payload["source_published_at"])  # Should NOT treat 00:00:00 as real clock time

    def test_malformed_publication_date_fallback(self):
        custom_rows = [dict(r) for r in self.sample_rows_full]
        for r in custom_rows:
            r["auction_date"] = "2026-08-13"
            r["published_at"] = "not-a-valid-date"

        payload = format_cbk_tbill_auction_article(custom_rows)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["date_published"], "2026-08-13")
        self.assertIsNone(payload["source_published_at"])


if __name__ == "__main__":
    unittest.main()
