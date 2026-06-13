# Plan: Retention & Monetization-Ready Features

Inspected the existing code. Findings that shape this plan:

- `user_watchlist` (item_type/item_id/item_name), `useAssetWatchlist`, `useFundWatchlist`, and `WatchlistPage` already exist.
- `price_alerts` exists but its `asset_type` CHECK constraint only allows `stock | currency | commodity` — `fund` is not allowed. The `check-price-alerts` function already reads `fund` alerts, so it's wired but the DB rejects inserts. A migration is required to enable fund yield alerts.
- `condition` CHECK allows only `above | below`. To support yield-change-by-% we'll extend it to also allow `change_up | change_down | change_any` with `target_price` reused as the % threshold.
- `mock_portfolios` has no `current_yield` history column but `fund_yield_snapshots` and `stock_price_history` exist — usable for real 24h/weekly change.
- `PortfolioKPICards` 24h change is fake (`totalPnL * 0.003`) — must replace with real or "Not available yet".
- `funds.withdrawal_days` exists — usable for liquidity breakdown.
- `send-market-update` weekly email exists — extendable.

---

## Phase A — Watchlist & Alerts

### A1. DB migration (single migration, awaiting approval)
- `ALTER TABLE price_alerts DROP CONSTRAINT price_alerts_asset_type_check`, re-add allowing `stock | currency | commodity | fund | new_fund`.
- `ALTER TABLE price_alerts DROP CONSTRAINT price_alerts_condition_check`, re-add allowing `above | below | change_up | change_down | change_any`.
- Add nullable `baseline_price numeric` (snapshot of yield/price at alert creation, used to detect % change) and `notify_email boolean default true`, `notify_inapp boolean default true`.
- No new tables. RLS already correct.

### A2. Save funds and stocks everywhere
- Reuse `useAssetWatchlist("fund" | "stock")`. Add a small reusable `<SaveToWatchlistButton itemType itemId itemName />` (star/bookmark icon, neutral tooltip "Save to watchlist").
- Mount on: `FundDetailPage` header, fund tables/cards (`FundTable`, `FundMobileCards`, `FundGrid`), `StockDetailPage`, `StocksPage` rows, `SearchDialog` results.
- Anonymous nudge: after 2 local saves (localStorage counter), open existing auth nudge dialog with copy "Create a free account to save your watchlist across devices." No paywall.

### A3. Watchlist page upgrades
- Refactor `WatchlistPage` into two sections: Saved Funds, Saved Stocks (currencies/commodities kept as-is).
- Each row shows: name, current yield/price (live from `funds`/`stocks`), recent change (vs latest snapshot in `fund_yield_snapshots` / `stock_price_history`), last updated, alert status pill ("Alert active" / "No alert"), buttons: Create alert, Remove.
- Empty state with neutral CTA to browse funds/stocks.

### A4. Alert creation UX
- One `CreateAlertDialog` that adapts to asset type.
  - Fund: condition = `change_up | change_down | change_any`, threshold = "% change" (target_price stores %), baseline_price = current annual_yield.
  - Stock/currency/commodity: keep `above | below` with price threshold.
- Neutral labels: "Notify me when yield changes by", "Notify me when price goes above/below". No advice copy.
- Per-alert toggles: email / in-app, active/inactive.

### A5. `check-price-alerts` updates
- Extend to handle `change_*` conditions using `baseline_price` vs current `funds.annual_yield`.
- Compute % delta: `((current - baseline) / baseline) * 100`. Trigger on:
  - `change_up`: delta >= target
  - `change_down`: delta <= -target
  - `change_any`: |delta| >= target
- On trigger, also update baseline_price to current so the next change is measured fresh (reset by marking is_triggered=false after notification or by adding a `recurring` flag — Phase A keeps current one-shot behavior; a "Reset alert" button on watchlist re-arms it).
- Neutral message copy: "Yield data changed for {name}. New value: X%. Baseline: Y%."

### A6. "New fund added" alert
- Special `asset_type='new_fund'` row with `asset_id = '00000000-...'`, `asset_name='New funds added'`. One per user max.
- Add small SQL query in `check-price-alerts`: count of funds with `created_at > last_check_time` (use `triggered_at` as cursor). If >0, notify and update cursor.
- Single toggle in Alerts page: "Notify me when new funds are added".

### A7. Weekly email update
- Extend `send-market-update`:
  - Section "Your saved funds" (yield + 7-day delta from snapshots).
  - Section "Your saved stocks" (price + 7-day delta from history).
  - Section "New funds added this week".
  - Portfolio summary placeholder if `mock_portfolios` rows exist.
  - Footer: "This email summarizes data changes for assets you saved. It is not personal financial advice."

### A8. Limits scaffolding (no Stripe)
- Add `src/lib/featureLimits.ts` constants: `FREE_MAX_ACTIVE_ALERTS=3`, `FREE_MAX_WATCHLIST_ITEMS=null` (off for now), `FREE_WEEKLY_EMAIL=true`. Read but do not enforce yet; surface a soft toast when free user passes 3 active alerts: "Free plan includes 3 active alerts. Disable one to add another." (Disable creation when over limit — this is honest UX, not payment-gated.)

---

## Phase B — Portfolio Upgrade

### B1. Real 24h / 7-day change
- New hook `usePortfolioChanges(items)` that fetches:
  - For funds: latest two rows of `fund_yield_snapshots` for each `asset_id` → compute yield delta (1d and 7d if available).
  - For stocks: latest two rows of `stock_price_history` → price delta.
- `PortfolioKPICards`: replace "24h Change" card with "Recent change" showing weighted avg yield/price delta. If no prior snapshot exists, render "Not available yet" (no fake number).

### B2. Weighted average yield
- New `usePortfolioMetrics` selector:
  - `weightedAvgYield = Σ(holding_value × annual_yield) / Σ(holding_value)` over fund-type holdings only.
  - Show as new KPI card with note: "Based on available yield data. Yields change over time."

### B3. Expected monthly income
- For each fund holding: `holding_value × current_yield × 0.85 / 12`. Sum across funds.
- Show KPI card "Estimated monthly income" with disclaimer: "Estimate only. Actual returns may differ. Assumes 15% withholding tax."

### B4. Asset allocation
- Already partially exists (`PortfolioCharts.allocation`). Map `asset_type` to neutral labels: MMFs, Unit trusts, NSE stocks, T-Bills/Bonds, FX/Cash, Commodities, Other.
- Keep existing pie/donut; relabel only.

### B5. Liquidity breakdown
- New `LiquidityBreakdown` component. For fund holdings, look up `funds.withdrawal_days` by `asset_name` (or add a `fund_id` lookup via existing fund cache). Buckets: T+0, 1–3 days, 4+ days, Not available. Stacked bar or simple list.

### B6. "What changed this week" panel
- New `PortfolioWeeklyChanges` card on `PortfolioPage`. Uses `usePortfolioChanges` (7d window) + saved-watchlist deltas. Neutral copy only.

### B7. Weekly portfolio email
- Extend `send-market-update` further with portfolio block when user has holdings: total value, weighted avg yield, est. monthly income, top 3 deltas. Defer if email rendering becomes too risky — UI ships regardless.

---

## Phase C — Monetization-Ready (no Stripe)

### C1. Printable portfolio summary
- New `/portfolio/summary` route: print-styled (CSS `@media print`) page with KPIs, allocation table, liquidity table, watchlist table, disclaimer. "Download as PDF" button uses `window.print()` (browser save-as-PDF). Cheap, safe, no new deps.
- True PDF generation deferred — noted in plan only.

### C2. Data API plan (doc only, no code)
- Add `docs/data-api-plan.md` with: exposable data (fund list/yields/snapshots, T-Bill rates, stock prices, public metadata), never-expose (user data, watchlists, alerts, portfolios, emails), rate-limit model (re-use existing `api_keys` + `rate_limit_hits`), tiered key concept, compliance notes (CMA, no advice, source attribution). No endpoints built.

### C3. Dividend tracker — defer
- Inspection: no `stock_dividends` table, no dividend fields on `stocks`. Plan-only entry in `docs/data-api-plan.md` § Future. No UI.

### C4. Stock fundamentals — defer
- Inspection: `stocks` has price-only fields. Plan-only. No UI.

---

## Files

**New**
- `src/components/watchlist/SaveToWatchlistButton.tsx`
- `src/components/alerts/CreateAlertDialog.tsx`
- `src/hooks/usePortfolioChanges.ts`
- `src/hooks/usePortfolioMetrics.ts`
- `src/components/portfolio/LiquidityBreakdown.tsx`
- `src/components/portfolio/PortfolioWeeklyChanges.tsx`
- `src/components/portfolio/WeightedYieldCard.tsx`
- `src/components/portfolio/MonthlyIncomeCard.tsx`
- `src/pages/PortfolioSummaryPage.tsx`
- `src/lib/featureLimits.ts`
- `docs/data-api-plan.md`

**Edited**
- `src/pages/WatchlistPage.tsx`, `src/pages/AlertsPage.tsx`, `src/pages/PortfolioPage.tsx`, `src/pages/FundDetailPage.tsx`, `src/pages/StockDetailPage.tsx`, `src/pages/StocksPage.tsx`
- `src/components/portfolio/PortfolioKPICards.tsx` (remove fake 24h)
- `src/components/SearchDialog.tsx`, `src/components/home/FundTable.tsx`, `src/components/home/FundMobileCards.tsx`
- `src/hooks/usePriceAlerts.ts` (new fields: baseline_price, notify_email, notify_inapp, new asset_type 'fund'/'new_fund', new conditions)
- `supabase/functions/check-price-alerts/index.ts`, `supabase/functions/send-market-update/index.ts`
- `src/App.tsx` (new route)

**Migration (1)**
- Relax `price_alerts` CHECK constraints; add `baseline_price`, `notify_email`, `notify_inapp` columns.

---

## Testing
- `bunx vitest run`, typecheck via build.
- Manual QA matrix from request: save fund/stock, view watchlist, create yield + price alerts, guest vs logged-in portfolio, KPI shows real or "Not available yet" (no fake), monthly income + weighted yield calc, dark/light, mobile 390px, grep visible UI for risky words.

---

## Out of scope (explicit)
- Stripe / subscriptions / paywall.
- Real PDF generation (print-to-PDF only).
- Dividend tracker UI.
- Stock fundamentals UI.
- Recurring/auto-rearming alerts beyond manual reset.
- Full Data API endpoints.

Proceeding will start with the DB migration (Phase A1), then build Phase A, B, C in order.