# Objective
Improve the news ingestion and frontend filtering pipeline to accurately classify and display news relevant to the Kenyan investment market (Stocks, MMFs, FX, Commodities) and eliminate false positives and irrelevant content.

## User Review Required
No breaking changes to the database schema or historical data. 
The new relevance filter in the backend will start discarding newly fetched RSS articles if they do not contain investment or Kenya-specific keywords, reducing the sheer volume of "junk" news (e.g. celebrity gossip from Tuko).

## Open Questions
None. The guidelines for relevance and strict categorization are clear.

## Proposed Changes

### Backend Pipeline (`fetch-news/index.ts`)
1. **Relevance Gate**: Add a strict relevance check (`isRelevantToKenyaInvestment`) before an article is processed. It will require the presence of strong Kenyan or financial keywords (e.g., `Kenya`, `CBK`, `NSE`, `Safaricom`, `inflation`, `market`, `shilling`) especially for broad sources like Tuko and The Star. Articles failing this check will be dropped entirely.
2. **Regex Word Boundaries**: Update the `categorize` function. Replace naive substring matches (e.g., `/yield|fund|tea/`) with strict word boundary matches (e.g., `/\b(yield|fund|money market|unit trust)\b/i`) to prevent `refund` from matching `fund`, or `steady` matching `tea`.
3. **FX Categorization**: The current categorizer lumps global news into `International`. We will add a dedicated `FX & Currency` category regex in `fetch-news` to properly tag Forex news natively at ingestion.

### Frontend Display & Filtering
1. **`NewsPage.tsx`**:
   - Replace `includes("fund")`, `includes("tea")`, etc. with proper Javascript `RegExp` objects utilizing word boundaries `\b` for all categories.
   - Disconnect `International` from the FX tab. The FX tab will exclusively show articles matching strict currency/forex keywords (e.g., `shilling`, `dollar`, `forex`, `usd/kes`) or the new `FX & Currency` backend category.
   - Consolidate all filtering into cleaner, robust regex testing logic instead of chained `.includes()` calls.
2. **`StockDetailPage.tsx`**:
   - The current Supabase query uses `.ilike.%${symbol}%`, which matches `SCOM` inside unrelated words, and `Equity` in generic contexts.
   - We will update the fetch logic to retrieve a slightly larger pool of recently published articles and perform strict `RegExp` word-boundary matching on the client-side against the `title` and `summary` using the company's explicit aliases (e.g., `\b(SCOM|Safaricom)\b`), drastically improving matching accuracy to near 100%.

## Verification Plan

### Automated Tests
I will create a Node.js regression test script (`test_news_classification.mjs`) that verifies:
- `refund` and `funded project` do NOT match MMF.
- `steady interest rates` does NOT match Tea/Commodity.
- `cooperation` does NOT match Co-op Bank.
- A celebrity article fails the relevance gate.
- Valid headlines (e.g., "Kenyan shilling strengthens against dollar") properly pass and categorize correctly.

### Manual Verification
1. Re-run the exact 30-article production query through the new relevance and categorization logic in a dry-run script.
2. Verify category accuracy achieves ≥ 22/25.
3. Verify the 5 NSE companies (SCOM, EQTY, KCB, EABL, COOP) match exclusively relevant articles.
4. Run `npm run build` to ensure no build errors were introduced.
