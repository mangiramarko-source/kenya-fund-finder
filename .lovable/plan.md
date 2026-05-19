
# KenyaFundFinder Premium Redesign

A visual-first research platform for Kenyan unit trusts and money market funds. Inspired by Simply Wall St's clarity (visual fingerprint per asset, one-page reports, command-center feel) but with our own identity, our own data model, and copy written for ordinary Kenyans — not finance pros.

The redesign keeps everything that works today (open-access public data, CMA compliance, "no TOP/aggregate rankings", terminal-grade data accuracy) and rebuilds the surface layer on top.

---

## 1. Visual identity

A single, consistent system applied across every page.

- **Palette** — deep navy `#0B1220` background, surface `#111A2E`, divider `#1B2540`, primary text `#F4F6FA`, muted `#8A94A6`, green accent `#22C55E` (positive/CTA), amber `#F59E0B` (caution), red `#EF4444` (risk/negative), gold `#D4B254` reserved for premium badges only.
- **Typography** — `Fraunces` (serif) for hero headlines and report titles to feel editorial and trustworthy; `Inter` for everything else; `JetBrains Mono` for numeric tables and yield figures.
- **Surface language** — soft 12px rounded cards, 1px hairline borders in `#1B2540`, subtle inner glow on hover, generous whitespace on marketing, dense grids on data screens. No skeuomorphic gradients.
- **Motion** — `framer-motion` micro-interactions only: card lift on hover, number count-up on yields, fade-in for sparklines. No parallax, no scroll-jacking.
- **Mobile first** — every component designed at 375px first, then progressively enhanced. Bottom nav stays; topbar simplified.

Tokens land in `src/index.css` and `tailwind.config.ts` as HSL custom properties so dark mode stays the default and a future light marketing page is one toggle away.

---

## 2. The "Kenya Fund Score"

A single 0–100 number that summarises a fund at a glance, plus a 4-axis visual fingerprint (our take on SWS's Snowflake — not a copy of the shape).

**Four axes, each scored 0–25:**

```text
       YIELD (annual yield vs peer median)
         │
  COST ──┼── LIQUIDITY (withdrawal time, min investment)
         │
       TRUST (CMA regulated, fund age, AUM disclosed, manager track record)
```

- Total score = sum of axes, capped at 100.
- Rendered as a small radar/diamond SVG on cards (40×40) and a large version on the report page (240×240) with axis labels and the numeric score in the centre.
- Colour-banded: 80+ green, 60–79 lime, 40–59 amber, <40 grey (never red — we don't shame funds, we inform).
- A "How this is calculated" tooltip on every instance links to a Learn page section. **Compliance: no "TOP" labels, no ranked leaderboards** — score is shown per-fund only, never as a sorted "best funds" list.

Implementation lives in `src/lib/fundScore.ts` as a pure function so it's testable and snapshot-stable.

---

## 3. Pages

### 3.1 Home dashboard (`/`)

A hybrid: hero + live market data, not a pure marketing landing.

- **Hero band** — serif headline ("Understand any Kenyan fund in 60 seconds"), one-sentence subhead, large search bar (autocomplete across funds + stocks, keyboard shortcut hint `⌘K`), two pill CTAs: *Browse funds* / *Compare funds*.
- **Trust strip** — "CMA-regulated funds only · Updated daily · Free to use" with small icons.
- **Live snapshot grid** — 3 cards: *Top yield range today*, *KES/USD rate*, *NSE 20 index* (existing data sources, restyled).
- **Featured funds rail** — 6 fund cards (see §4) in a horizontal scroll on mobile, 3-col grid on desktop. Chosen by editorial flag in DB (`funds.is_featured`), not by yield ranking, to stay compliant.
- **"How it works"** — 3 steps with icons: Search → Read report → Compare or save.
- **Learn teasers** — 3 latest education cards from `/learn`.
- **Trust & disclaimer footer band** — "Information only, not financial advice. Funds regulated by CMA Kenya. 15% withholding tax applies on interest."

Currency ticker stays on mobile only (existing memory rule preserved).

### 3.2 Funds directory (`/funds`)

The workhorse page. Two view modes, user-switchable.

- **Filter rail (left on desktop, drawer on mobile)** with the six filters requested:
  - Highest yield (sort, not filter)
  - Lowest risk (Low/Medium/High pills)
  - Fast withdrawals (≤2 days)
  - Beginner friendly (low min + low risk + CMA + simple fee)
  - CMA regulated (default on)
  - Low minimum investment (≤KES 1,000 / ≤5,000 / ≤10,000)
- **Search + chips** at the top showing active filters with quick remove.
- **Card grid** (default) — see §4 fund card spec.
- **Table view** — high-density, JetBrains Mono numerics, sortable columns, sparklines per row (reuses existing `Sparkline` component).
- **"Last updated" pill** in the page header (reuses `SectionLiveStatus`).
- Results count + "Showing X of Y CMA-regulated funds" copy for trust.

No aggregate "best" badges anywhere on this page.

### 3.3 Individual fund report (`/funds/:slug`)

One-page scroll, broken into clearly-labelled sections with a sticky in-page nav (Overview · Yield · Fees · Risk · Liquidity · Manager · Similar).

- **Header** — fund name, manager, CMA badge, large Kenya Fund Score visual on the right, primary CTAs: *Add to watchlist*, *Compare*, *Open Calculator*.
- **Overview** — 4-stat grid: Annual yield, Daily yield (calculated from annual rate per existing rule), Min investment, Withdrawal time.
- **Yield history chart** — 90-day SVG line (reuses sparkline pattern, scaled up), with 7D/30D/90D toggle.
- **Fees** — plain-language breakdown: management fee, performance fee (if any), exit fee. Each with a one-line "what this means" note.
- **Risk** — single Low/Medium/High pill + 2-sentence explanation of *why* (e.g. "Money market funds invest in short-term government paper, so capital risk is low").
- **Liquidity** — withdrawal time in days with an icon scale (1d / 2-3d / 4-7d / 7d+).
- **Fund manager** — manager name, years active, AUM if disclosed, link to manager's other funds.
- **Good for / Not good for** — two side-by-side cards with bullet lists ("Good for: emergency fund, short-term savings" / "Not good for: long-term wealth building, beating inflation by a wide margin"). Editorial content stored in `funds.good_for` / `funds.not_good_for` arrays.
- **Similar funds** — 3 cards picked by closest score + same category.
- **Disclaimer block** — bordered, always-visible: "This is information, not financial advice. Past performance does not guarantee future returns. Funds regulated by the Capital Markets Authority of Kenya."

### 3.4 Compare funds (`/compare`)

Side-by-side, up to 4 funds.

- Reuses existing `useCompare` context.
- Sticky header row with fund name + score visual.
- Rows: yield, daily yield, min investment, withdrawal time, risk, fees, CMA status, fund age, AUM, manager.
- Each row has a green dot on the "winner" cell (objective metrics only — never a subjective overall winner).
- Mobile: horizontal scroll with frozen first column.
- "Add fund" empty slot opens a search modal.
- Export to PDF / share link buttons.

### 3.5 Learn (`/learn`)

Education hub, not a blog. Search-engine-friendly.

- Hero with category chips: *Getting started · Money market funds · Risk · Tax · Glossary*.
- Card grid of articles (uses existing `site_pages` table).
- Pinned at top: "How the Kenya Fund Score works" — explainer with the diamond visual and the formula.
- FAQ section retained (already has FAQPage JSON-LD per earlier work).
- Inline glossary terms get a dotted underline + tooltip across the whole site.

### 3.6 Watchlist (`/watchlist`)

Auth-gated (existing gating policy preserved).

- Hero: "Your funds" + count + last-checked time.
- Each saved fund as a full-width row card: score visual, key stats, yield delta since you added it, sparkline, quick actions (Remove, Compare, View report).
- Empty state: friendly illustration + "Browse funds" CTA.
- Price-alert hook (existing `usePriceAlerts`) integrated as a per-row toggle: "Alert me if yield drops below X%".

---

## 4. Fund card spec

A single reusable `<FundCard>` component used on home, directory, similar funds, and watchlist.

```text
┌─────────────────────────────────────────────┐
│  CIC Money Market Fund          [♥]         │
│  CIC Asset Management                       │
│                                             │
│  ┌─────┐   Annual yield     Daily yield     │
│  │ 84  │   13.42%           0.037%          │
│  │ ◆◆◆ │                                    │
│  └─────┘   Min: KES 5,000  Withdraw: 2 days │
│                                             │
│  [Low risk]  [CMA regulated]  [Beginner OK] │
│                                             │
│  ─── sparkline ───────────────              │
│  Updated 2h ago               View report → │
└─────────────────────────────────────────────┘
```

- Score visual (diamond) doubles as the focal point.
- Badges are token-coloured pills, never more than 3 visible (overflow into a `+2 more` chip).
- Whole card is a link; heart and View report are interactive children with `stopPropagation`.
- Mobile: full-width, stacked metrics in 2 columns.

---

## 5. Information architecture & routing

```text
/                       Home dashboard
/funds                  Directory (replaces current Index list role for funds)
/funds/:slug            Fund report (new — currently we use /compare/:slug)
/compare                Compare workspace
/learn                  Education hub
/learn/:slug            Article (existing SitePage)
/watchlist              Saved funds (auth)
/stocks, /rates, …      Unchanged
```

Old `/compare/:slug` fund-detail route 301s to `/funds/:slug` in `App.tsx` and the sitemap edge function is updated to emit the new canonical URLs.

---

## 6. Build order (phased so the app stays shippable)

1. **Design tokens** — add the new palette, type stack, and motion utilities to `index.css` + `tailwind.config.ts`. No visual change yet — just tokens available.
2. **Kenya Fund Score** — `src/lib/fundScore.ts` + unit tests + `<FundScoreDiamond>` SVG component.
3. **`<FundCard>` v2** — built against tokens, used first on the home featured rail behind a feature flag, then rolled out.
4. **Funds directory** redesign with new filter rail + view toggle.
5. **Fund report page** at `/funds/:slug` with sticky in-page nav, redirect old route.
6. **Home dashboard** rebuild (hero, search, snapshot grid, featured rail, learn teasers).
7. **Compare** restyle on existing logic.
8. **Watchlist** restyle.
9. **Learn** hub polish + score explainer article.
10. **Sitemap + JSON-LD** update for new `/funds/:slug` URLs, then run the SEO scan again.

Each phase is independently mergeable and the site stays live throughout.

---

## 7. Data & backend

Mostly cosmetic — most data already exists. New columns needed on `funds`:

- `is_featured boolean default false` — editorial featured-on-home flag.
- `good_for text[]` and `not_good_for text[]` — editorial bullets for the report page.
- `manager_years_active int`, `aum_kes numeric` — optional, nullable, shown only when present.
- `fund_age_years numeric generated` — computed from `inception_date` if present.

A new `fund_scores` materialised view (or a column on `funds`) caches the Kenya Fund Score, recomputed by the existing hourly `pg_cron` market sync. Score logic is duplicated in TS (for client display when DB is stale) and SQL (for sorting/filtering server-side) — both reference the same documented formula.

No auth changes. No new tables for users. RLS unchanged.

---

## 8. Compliance & trust (non-negotiable)

- No "TOP funds", no aggregated yield leaderboards anywhere (existing core memory).
- Every yield figure carries a "Past performance ≠ future returns" tooltip on hover.
- 15% withholding tax notice persists in footer and on every fund report.
- "Information, not financial advice" disclaimer on home hero, every fund report, and compare page.
- CMA-regulated badge only shown when `funds.cma_regulated = true`; the directory defaults to filtering to CMA-only with a clearly-labelled toggle to include others.

---

## 9. Out of scope (call out so we agree)

- No paid tiers or paywall. The site stays free.
- No portfolio command-center / IRR work in this round (separate large effort).
- No screener-with-alerts (separate effort — current price alerts stay as-is).
- No copying of SWS's Snowflake shape, copy, or marketing assets. Our diamond is visually distinct (4 axes vs their 5, square diamond vs their pentagon, our palette).
- Stocks/Rates/Commodities pages keep current design this round — only typography tokens cascade in.

---

## 10. Acceptance criteria

- Home, Funds, Fund Report, Compare, Learn, Watchlist all rebuilt to the new visual system.
- Every fund card and report shows the Kenya Fund Score (number + diamond).
- All six filters work on the directory.
- All fund report sections present with real data (or graceful "not disclosed" states).
- Lighthouse mobile performance ≥ 85, accessibility ≥ 95, no CLS regressions.
- No compliance violations (no TOP labels, disclaimers present, CMA filter default-on).
- Old `/compare/:slug` URLs redirect; sitemap reflects new structure.
