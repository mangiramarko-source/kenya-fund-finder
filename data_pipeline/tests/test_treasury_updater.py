import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from updaters.treasury_updater import (
    issue_date_from_result_url,
    select_unprocessed_result_urls,
)


def test_issue_date_from_result_url_accepts_encoded_cbk_filename():
    url = (
        "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/"
        "787941500_RESULTS%202698-091%202672-182%202627-364%20DATED%2007-09-2026.xlsx.pdf"
    )
    assert issue_date_from_result_url(url).isoformat() == "2026-09-07"


def test_select_unprocessed_results_backfills_missed_tbills_only_once_in_order():
    urls = [
        "https://cbk.example/RESULTS%202698-091%202672-182%202627-364%20DATED%2007-09-2026.pdf",
        "https://cbk.example/RESULTS%202697-091%202671-182%202626-364%20DATED%2031-08-2026.pdf",
        "https://cbk.example/duplicate/RESULTS%202697-091%202671-182%202626-364%20DATED%2031-08-2026.pdf",
        "https://cbk.example/SWITCH%20RESULTS%20FXD4-2019-010%20DATED%2009-09-2026.pdf",
        "https://cbk.example/RESULTS%202695-091%202669-182%202624-364%20DATED%2017-08-2026.pdf",
    ]

    selected = select_unprocessed_result_urls(urls, "2026-08-17")

    assert selected == [urls[1], urls[0]]
