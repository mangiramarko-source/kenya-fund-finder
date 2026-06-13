# Data API Plan (Draft)

Status: planning only. No endpoints built yet. No payments yet.

## Goal
Expose neutral Kenyan market data to third parties (research, fintech apps, journalists) without giving advice, exposing user data, or undermining compliance.

## Exposable data (safe)
- Public fund list & metadata (`funds_public`)
- Fund yields and yield snapshots (`fund_yield_snapshots`)
- NSE stock prices and history (`stocks_public`, `stock_price_history_public`)
- FX rates and history (`exchange_rates_public`, `exchange_rate_history_public`)
- Commodity prices and history (`commodities_public`, `commodity_price_history_public`)
- T-Bill / bond reference rates (when a verified source is wired)

## Never expose
- `auth.*` rows, profiles, emails, names
- `user_watchlist`, `mock_portfolios`, `price_alerts`, `notifications`
- `email_send_log`, `email_preferences`, `suppressed_emails`
- Admin tables (`change_log`, `social_*`, `ads`, internal queues)
- Service-role secrets, API keys, raw scraping endpoints

## Auth model
- Reuse existing `api_keys` table (already RLS-protected, has `key_hash`, `rate_limit_per_minute`).
- New edge function `public-api/v1/*` validates `Authorization: Bearer <key>` via `verify_api_key`.
- Anonymous tier capped via `rate_limit_hits` (already implemented).

## Tiers (future, no Stripe yet)
| Tier | Rate | Endpoints | Use case |
|------|------|-----------|----------|
| Anonymous | 30 req/min | Snapshot data, latest yields | Casual / scraping defense |
| Free key | 120 req/min | + historical 30 days | Personal projects |
| Pro (later) | 1,000 req/min | + full history, CSV bulk | Fintech, research |
| Enterprise (later) | Negotiated | + webhooks, daily snapshot dump | Banks, media |

## Compliance
- Always include `disclaimer` field: "Data only. Not personal financial advice."
- Always include `source`, `as_of`, `cma_licensed` where applicable.
- Block scraping of personally identifying data — schema review before each new endpoint.
- CMA: confirm no aggregated rankings / "best fund" lists are derived server-side.

## Future / deferred
- **Dividend tracker**: no `stock_dividends` table exists. Build only after a reliable historical source is wired and verified.
- **Stock fundamentals**: `stocks` is price-only. Defer until a sustainable data source (CMA filings, NSE API) is available.
- **Webhooks**: data-change notifications for paid tiers.
