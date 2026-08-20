# Crawlability and indexing policy

This document records the intentional decisions behind the public sitemap, internal-link architecture, and crawler rules. It prevents future audits from treating every absent URL or crawler block as an accidental defect.

## Public URL policy

- **Funds:** every published fund is indexable and linked from `/funds`. Unpublished funds are intentionally absent from the sitemap.
- **Stocks:** every active stock is indexable and linked from `/stocks`. Inactive rows and demo routes are intentionally absent.
- **News:** every published article that passes `isIndexableNewsArticle` remains indexed. The rule requires a valid article ID, a useful title, a valid publication date, and a substantive summary. Eligible articles are reachable through 50-item pages under `/news/archive`.
- **CMS pages:** only `about` and `contact` use indexable `/page/:slug` URLs. `privacy` and `terms` use their direct public routes. Operational CMS rows such as `disclaimer`, `live-status`, and `feed_interactions` are intentionally excluded because they are data sources for UI copy, not standalone pages.
- **Private and utility routes:** authentication, profile, portfolio, watchlist, alerts, AI Lab, admin, and demo routes remain `noindex` and are excluded from the sitemap.

## News retention decision

The current eligible news archive remains indexed because every included URL already passes the content-quality gate and provides a stable article detail page with source attribution and market context. The archive is paginated so older articles are discoverable without placing hundreds of links on the latest-news screen.

This is not a promise to index every database row forever. Articles that lose published status or fail the eligibility rule leave both the sitemap and archive during the next build. A future editorial retention rule can add freshness, duplication, or original-analysis requirements if Search Console shows low-value indexed pages.

## Crawler policy

Search crawlers and user-requested retrieval agents are allowed to access public pages. Model-training and bulk-scraping agents are intentionally blocked in `public/robots.txt`. Private and utility paths stay blocked for all crawler classes.

Robots rules are a policy signal, not an authorization boundary. Application and database security must not depend on crawler compliance.

## Verification

After a production build, run:

```sh
npm run verify:crawlability
```

The check starts at the prerendered homepage, follows raw internal HTML links, and fails if any sitemap URL lacks a prerendered file or cannot be reached through the link graph.

