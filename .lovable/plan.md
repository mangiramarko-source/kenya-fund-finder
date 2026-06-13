# Phase 1 — Clarity & Neutral Data Pages

Strictly scoped per your approval. No DB migrations, no Fund Score, no Stripe, no Phase 2 work. All copy stays neutral — no "best / top / recommended / winner / safest / guaranteed / ideal / should invest".

---

## 1. Homepage hero (`src/pages/OverviewPage.tsx`)

Add a slim, dismissible hero strip at the very top of `OverviewPage`, above `CurrencyTicker`. Everything currently on the page stays exactly where it is.

- Headline: *"Compare Kenyan unit trusts, MMFs, NSE stocks and T-Bills using clear data — independent, simple, and built for Kenyan investors."*
- Two primary CTAs (buttons): **Compare funds** → `/compare` · **Track a portfolio** → `/portfolio`
- Three guided tiles below the headline:
  - **MMF yield table** → `/funds/mmf-yields`
  - **Return calculator** → `/calculator`
  - **Portfolio tracker** → `/portfolio`
- Dismiss state stored in `localStorage` (`kff_home_hero_dismissed_v1`). After dismiss, hero collapses to a single-line "Show intro" link.
- Mobile: stacks vertically, 16px inputs preserved (no inputs in hero, so N/A).
- Dark mode + light mode tokens only (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`).

New component: `src/components/home/HomeHero.tsx`.

---

## 2. Six neutral data-view routes (`src/pages/funds/*`)

All pages share one layout component to keep them consistent:

`src/components/funds/DataViewPage.tsx` — props: `title`, `intro`, `methodology`, `lastUpdated`, `children`, `seoTitle`, `seoDescription`. Renders neutral heading, explanation, methodology note, last-updated chip, disclaimer block, then the table/cards (composes existing `FundGrid` / `FundSubTable`).

Routes added in `src/App.tsx`:

| Route | File | Data source / sort | Heading |
|---|---|---|---|
| `/funds/mmf-yields` | `pages/funds/MMFYieldsPage.tsx` | `funds` where `fund_type='money_market'`, sortable | "MMF Yield Table" |
| `/funds/by-yield` | `pages/funds/ByYieldPage.tsx` | all funds sorted by `annual_yield` | "Funds by Yield" |
| `/funds/by-minimum-investment` | `pages/funds/ByMinimumPage.tsx` | sorted asc by `minimum_investment` | "Funds by Minimum Investment" |
| `/funds/by-withdrawal-period` | `pages/funds/ByWithdrawalPage.tsx` | sorted asc by `withdrawal_days` | "Funds by Withdrawal Period" |
| `/funds/monthly-income-data` | `pages/funds/MonthlyIncomeDataPage.tsx` | funds with non-null `daily_yield`, neutral table showing KES/day, KES/month per KES 100,000 (computed) | "Monthly Income Data" |
| `/funds/by-risk-level` | `pages/funds/ByRiskLevelPage.tsx` | grouped by `risk_level` | "Funds by Risk Level" |

Each page:
- Reuses `fetchFunds()` and `fetchLatestSnapshots()` — zero new queries.
- Renders the standard table/card view via the existing `FundGrid` component (passing a pre-filtered subset).
- Methodology note example: *"This page lists funds in our database ordered by annual yield. Yields shown are gross, before the 15% withholding tax. Past yields do not guarantee future returns."*
- Disclaimer (shared, see §5).
- "Report incorrect data" link in footer of each page.
- Per-route `<Helmet>` for SEO title/description/canonical — neutral copy only. Requires installing `react-helmet-async` and wrapping in `HelmetProvider` (one-time setup in `src/main.tsx`).

Nav: add a single dropdown entry "Fund views" in `DesktopTopBar`/`Navbar` linking to the six routes, plus tiles already on the homepage hero.

---

## 3. FundDetailPage upgrade (`src/pages/FundDetailPage.tsx`)

Render every column already in `funds` that's currently hidden, using neutral labels. No new DB fields.

New sections, in this order, after the existing identity card:
- **Fund overview** (already exists — keep)
- **Yield data**: annual, daily, plus `seven_day_yield` and `thirty_day_yield` when present (show "—" when null)
- **Cost data**: `management_fee`, `exit_fee` when present
- **Access & withdrawal data**: `minimum_investment`, `withdrawal_time`, `withdrawal_days`
- **Risk information**: `risk_level` shown as a neutral chip + a short factual sentence per level (e.g. *"Low-risk funds primarily hold short-term debt instruments."*). No suitability statements.
- **Fund manager information**: `manager`, `manager_years_active`, `inception_date`, `fact_sheet_date`
- **AUM**: `aum_kes` when present, formatted as KES
- **Common use cases**: render `good_for[]` as a plain bulleted list under this exact heading. No language saying users *should* pick the fund.
- **Important considerations**: render `not_good_for[]` as a plain bulleted list. Neutral phrasing.
- **How this fund works**: templated paragraph keyed by `fund_type` (factual, no advice). Lives in `src/lib/fundExplainers.ts`.
- **Similar funds**: up to 4 funds with the same `fund_type`, sorted by closeness of `annual_yield`. Renders as cards linking to their detail pages.
- **Other funds in this category**: link to the relevant `/funds/*` data page.
- **Report incorrect data**: button opens a small dialog that writes to the existing `suggestions` table (`category='fund_data_issue'`, includes `fund_id`).
- **Disclaimer**: keep the existing per-type disclaimer + the new shared disclaimer block (§5).

The existing inline compare dropdown, investment calculator and rate-history charts stay — order preserved.

Files: `src/pages/FundDetailPage.tsx`, new `src/lib/fundExplainers.ts`, new `src/components/funds/ReportIssueDialog.tsx`.

---

## 4. Comparison wording (`src/components/compare/CompareModal.tsx`, `FundDetailPage` inline compare)

- Replace any "Winner" / "Best" copy with neutral labels:
  - "Highest value in this comparison"
  - "Lowest value in this comparison"
  - "Difference"
  - "Side-by-side data" (section title)
- No icon/colour suggesting one fund is preferable. Use neutral muted-foreground for high/low indicators.

No new fields added in Phase 1 (Fund Score is Phase 2).

---

## 5. Trust & compliance

New shared component `src/components/DisclaimerBlock.tsx` rendering exactly:

> *"KenyaFundFinder provides general investment information and comparison data. We are not a fund manager, broker, investment adviser, or bank. We do not hold client money. This information is not personal financial advice. Please verify details with the fund manager, broker, CMA, or a licensed adviser before making investment decisions."*

Mounted on:
- Homepage (bottom of `OverviewPage`, above footer).
- Every `/funds/*` data view page (via `DataViewPage`).
- `FundDetailPage` (replaces/augments current bottom disclaimer — keeps per-type disclaimer too).

Each surface also shows: **Data source note** ("Data sourced from public fund-manager fact sheets and the CMA register."), **Last updated** date (already on FundDetail; add to data-view pages), **Methodology** inline note (no `/methodology` page yet — Phase 2).

"Report incorrect data" button: only on `FundDetailPage` in Phase 1.

---

## 6. Copy audit (visible UI only)

Grep visible strings in `src/` (skip `*.test.ts`, comments, internal field names) for these substrings and rewrite where they appear in user-facing JSX, button labels, headings, placeholders, toast messages, SEO titles/descriptions, and aria labels:

- "best", "top", "recommended", "winner", "safest", "guaranteed", "should invest", "ideal", "not ideal"

Replacements use neutral phrasing case-by-case. A short list of expected hits to confirm during implementation:
- "Best for…" labels on existing FundDetail → "Common use cases".
- Any "Top funds" headings on `Index.tsx` / `OverviewPage` → "Fund list" / "All funds".
- "Recommended" CTAs (if any) → "Suggested next step" or removed.
- Internal variable names (e.g. `topFunds`, `bestMatch`) stay untouched.

Deliver the audit list in the status report as part of "WHAT YOU DID".

---

## 7. Explicitly out of scope (Phase 2+)

- No Fund Score, score chip, or A–E grades.
- No `/methodology` page.
- No DB migrations (`is_shariah`, `currency`, `tbill_rates` — all later).
- No Stripe, subscriptions, paywall.
- No NSE advanced analytics, dividend tracker.
- No Shariah / Dollar funds page until data verified.
- No yield-change alerts (Phase 3).
- No portfolio KPI fixes / 24h fix (Phase 4).

---

## 8. Testing & QA

After build:
- `bun run build` (Lovable harness runs automatically).
- `bunx vitest run` for existing tests.
- Typecheck via build output.
- Manual QA against the preview at these viewports: 375×812 mobile, 1280×800 desktop, in both dark and light mode:
  - Homepage hero renders, dismissible, CTAs route correctly.
  - All six `/funds/*` pages render with data, methodology, disclaimer, last-updated.
  - `FundDetailPage` with a data-rich fund (e.g. `cma_licensed=true`, populated `good_for`, `aum_kes`, etc.) shows every new section.
  - `FundDetailPage` with a sparse fund shows "—" gracefully, no empty cards.
  - Comparison modal shows neutral "Highest / Lowest / Difference" labels.
  - "Report incorrect data" dialog opens, submits, toasts success, writes a row to `suggestions`.
  - Grep for risky words in the rendered DOM via preview inspection on each new page returns zero matches.

---

## Files affected (final list)

**New**
- `src/components/home/HomeHero.tsx`
- `src/components/funds/DataViewPage.tsx`
- `src/components/funds/ReportIssueDialog.tsx`
- `src/components/DisclaimerBlock.tsx`
- `src/lib/fundExplainers.ts`
- `src/pages/funds/MMFYieldsPage.tsx`
- `src/pages/funds/ByYieldPage.tsx`
- `src/pages/funds/ByMinimumPage.tsx`
- `src/pages/funds/ByWithdrawalPage.tsx`
- `src/pages/funds/MonthlyIncomeDataPage.tsx`
- `src/pages/funds/ByRiskLevelPage.tsx`

**Edited**
- `src/main.tsx` (add `HelmetProvider`)
- `src/pages/OverviewPage.tsx` (mount `HomeHero` + bottom disclaimer)
- `src/pages/FundDetailPage.tsx` (new neutral sections + report dialog + shared disclaimer)
- `src/components/compare/CompareModal.tsx` (neutral wording)
- `src/components/Navbar.tsx` and `src/components/DesktopTopBar.tsx` ("Fund views" dropdown)
- `src/App.tsx` (six new routes, lazy-loaded)
- `package.json` (add `react-helmet-async`)
- Any files surfaced by the copy audit (visible UI only).

**Risk level**: low. No DB changes, no auth changes, no new edge functions. Routing additions are additive. Largest risk is wording regressions — mitigated by the copy audit step.

---

## End-of-implementation status report

The implementation message will end with the exact template you requested:

```
CODEX/LOVABLE UPDATE DATE: <yyyy-mm-dd>
PHASE: 1 — Clarity & neutral data pages
WHAT YOU DID: <bullet list incl. copy-audit results>
FILES CHANGED: <list>
WHAT PASSED:
[ ] Build
[ ] Tests
[ ] Lint
[ ] Typecheck
[ ] Manual QA
WHAT FAILED: <list or "none">
NEW RISKS: <list or "none">
CAN I MOVE TO NEXT PHASE:
[ ] Yes
[ ] No
WHY: <one line>
NEXT TASK: <one line>
```
