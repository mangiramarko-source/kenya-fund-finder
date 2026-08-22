import { describe, it, expect } from "vitest";
import { isFundsAndFixedIncomeArticle } from "@/lib/fundsFixedIncomeNews";
import { findRelatedMmf } from "@/lib/newsMarketLinks";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";
import { getNewsPublishedAt } from "@/lib/newsDate";
import type { NewsFromDB } from "@/lib/api";

describe("CBK Treasury Auction Editorial Bridge - Frontend & Classification Compatibility", () => {
  const mockCbkAuctionArticle: NewsFromDB = {
    id: "cbk-tbill-2026-08-13",
    title: "CBK Weekly T-Bill Auction: 91-Day at 8.77%, 182-Day at 8.95%, 364-Day at 9.04%",
    summary:
      "In the weekly Treasury bill auction held on 13 August 2026, the Central Bank of Kenya accepted weighted average yields of 8.77% for the 91-day bill, 8.95% for the 182-day bill, and 9.04% for the 364-day bill. Investors submitted KES 40.79B in total bids against an advertised offer of KES 28.00B, with the CBK accepting KES 37.02B (performance rate of 145.7%).",
    content: `### Auction Snapshot

- **91-Day Treasury Bill** (\`2695/091\`):
  - **Accepted Average Yield**: 8.7734%
  - **Previous Auction Yield**: 8.7820% (-0.9 bps)
  - **Bids Received / Accepted**: KES 18.24B / KES 16.36B
  - **Subscription / Performance Rate**: 227.95%
- **182-Day Treasury Bill** (\`2669/182\`):
  - **Accepted Average Yield**: 8.9500%
  - **Previous Auction Yield**: 8.9500% (unchanged (0 bps))
  - **Bids Received / Accepted**: KES 8.99B / KES 7.09B
  - **Subscription / Performance Rate**: 89.93%
- **364-Day Treasury Bill** (\`2624/364\`):
  - **Accepted Average Yield**: 9.0365%
  - **Previous Auction Yield**: 9.0042% (+3.2 bps)
  - **Bids Received / Accepted**: KES 13.56B / KES 13.56B
  - **Subscription / Performance Rate**: 135.61%

### What We Know

- **Auction Date**: 13 August 2026
- **Value / Settlement Date**: 2026-08-17
- **Total Amount Advertised**: KES 28.00B
- **Total Bids Submitted**: KES 40.79B
- **Total Amount Accepted**: KES 37.02B

### Official Source

Official auction results published by the [Central Bank of Kenya](https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1797505205_RESULTS%202695-091%202669-182%202624-364%20DATED%2017-08-2026.pdf).`,
    source: "Central Bank of Kenya",
    category: "Yield Updates",
    url: "https://www.centralbank.go.ke/uploads/91_day_historical_treasury_bill_results/1797505205_RESULTS%202695-091%202669-182%202624-364%20DATED%2017-08-2026.pdf",
    date_published: "2026-08-13",
    source_published_at: null,
    read_time: "2 min read",
    is_featured: false,
    status: "published",
    created_at: "2026-08-13T12:00:00Z",
    updated_at: "2026-08-13T12:00:00Z",
  };

  it("qualifies for Funds & Fixed Income category", () => {
    expect(isFundsAndFixedIncomeArticle(mockCbkAuctionArticle)).toBe(true);
  });

  it("strictly returns null for relatedMmf (no fake MMF association)", () => {
    const matchedMmf = findRelatedMmf(
      mockCbkAuctionArticle.title,
      mockCbkAuctionArticle.summary
    );
    expect(matchedMmf).toBeNull();
  });

  it("maps cleanly to InvestorBriefing without throwing or duplicating", () => {
    const briefing = buildInvestorBriefing(mockCbkAuctionArticle);
    expect(briefing.id).toBe("cbk-tbill-2026-08-13");
    expect(briefing.title).toBe(mockCbkAuctionArticle.title);
    expect(briefing.source.name).toBe("Central Bank of Kenya");
    expect(briefing.source.url).toBe(mockCbkAuctionArticle.url);
    expect(briefing.category).toBe("Yield Updates");
    expect(briefing.takeaway.length).toBeGreaterThan(0);
    expect(briefing.whatWeKnow.length).toBeGreaterThan(0);
  });

  it("handles null source_published_at truthfully using date_published", () => {
    const pubDate = getNewsPublishedAt(mockCbkAuctionArticle);
    expect(pubDate).toBe("2026-08-13");
  });

  it("preserves separate auction date and publication date when they differ", () => {
    const distinctDatesArticle: NewsFromDB = {
      ...mockCbkAuctionArticle,
      id: "cbk-tbill-distinct",
      date_published: "2026-08-14", // Published day after auction
      summary:
        "In the weekly Treasury bill auction held on 13 August 2026, the Central Bank of Kenya accepted weighted average yields of 8.77% for the 91-day bill.",
      content: `### What We Know

- **Auction Date**: 13 August 2026
- **Results Publication Date**: 14 August 2026
- **Value / Settlement Date**: 2026-08-17`,
    };

    const pubDate = getNewsPublishedAt(distinctDatesArticle);
    expect(pubDate).toBe("2026-08-14");

    const briefing = buildInvestorBriefing(distinctDatesArticle);
    expect(briefing.whatWeKnow).toContain("Auction Date: 13 August 2026");
    expect(briefing.whatWeKnow).toContain("Results Publication Date: 14 August 2026");
  });
});
