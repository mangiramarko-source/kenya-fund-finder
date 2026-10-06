# Stocks and MMFs: release and measurement

## Release

1. Run `npm run build`. It must fetch stock/fund data, generate the built sitemap, prerender all primary pages, and pass `verify:seo` and `verify:crawlability`.
2. Deploy the verified commit through the existing Vercel project. The offline `build:ci` checks bundle compatibility only; it is not a release SEO gate.
3. Run `npm run verify:seo:live`. To check a Vercel preview instead, run `npm run verify:seo -- --live https://YOUR-PREVIEW.vercel.app`.
4. In Google Search Console, inspect `/stocks`, `/funds`, `/money-market-funds-kenya` and `/mmf-calculator`. Check the live rendered content, canonical and indexing permission, submit the sitemap and request indexing for the new primary routes.
5. Record the deployed commit and inspection results. A passing HTML check does not prove indexing or ranking.

## Baseline and weekly review

Export the previous 28 days from Search Console before release. Record the property, date range, clicks, impressions, CTR and average position by query and page. Repeat weekly with a comparable rolling 28-day window; do not substitute analytics users for Google search clicks.

Track the query groups: `kenyan stocks`, `nse share prices`, `kenya stocks`; `kenyan mmf`, `money market funds kenya`, `kenya mmf calculator`. Record close variants individually. Track primary pages and new guides separately, indexed URLs, crawl errors, and queries in positions 4–20. No live baseline was collected: the connected GSC Wizard returned `payment_required` on 6 October 2026 because its trial/subscription is inactive. Exporting directly from Google Search Console remains an alternative.

At eight weeks, compare against the saved baseline. Prioritise pages with impressions but low CTR, queries in positions 4–20, and discovered pages with insufficient internal links. Record indexation and traffic changes separately from technical checks.

## Source maintenance and authority

Review MMF manager documents weekly, with more frequent updates when official new rates are published. Enter an actual fact-sheet date; do not refresh it just because a build ran. Confirm the product currency and gross/net fee basis. Review stock feed timestamps after market updates. Do not fabricate reviewer credentials or source-verification dates.

Use the comparison hub, calculator and cited guides as reference pages for relevant finance publishers and communities. Track earned referring pages and referral traffic. External outreach, independent mentions, Search Console access and future weekly measurements require the relevant accounts and work beyond a local code change; this release sends no outreach messages.
