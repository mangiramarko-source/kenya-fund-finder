import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InvestorBriefing } from "./InvestorBriefing";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";
import { type NewsFromDB, type PublicStock } from "@/lib/api";

const mockStock: PublicStock = {
  id: "scom-1",
  symbol: "SCOM",
  name: "Safaricom PLC",
  price: 36.35,
  previous_price: 36.21,
  day_change_percent: 0.39,
  day_change: 0.14,
  volume: 2450000,
  market_cap: 1450000000000,
  pe_ratio: 14.2,
  dividend_yield: 4.8,
  sector: "Telecommunications",
  year_high: 39.5,
  year_low: 28.0,
  updated_at: new Date().toISOString(),
};

const mockArticle: NewsFromDB = {
  id: "scom-article-1",
  title: "&#x54;he Safaricom&#xA0;Platform Expands to KDF &amp; Foreign Residents",
  summary: "ZiiDi Trader expanded access to more potential users, including KDF members and non-Kenyan residents.",
  content: "Full content text here...",
  source: "Business Daily",
  url: "https://businessdailyafrica.com/scom-expansion",
  image_url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f",
  category: "Telecommunications",
  read_time: "2 min read",
  created_at: "2026-08-20T10:00:00Z",
  ai_insight: JSON.stringify({
    what_happened: "ZiiDi Trader expanded access to more potential users, including KDF members and non-Kenyan residents.",
    why_it_matters: "This matters for Safaricom because expanding user eligibility can broaden retail trading participation and digital platform activity.",
    confirmed_facts: [
      "KDF personnel can now register on ZiiDi Trader using official military identification.",
      "Foreign passport holders with Kenyan residency can now open trading accounts.",
    ],
    factors_positive: [
      "Broadens retail platform reach and user onboarding.",
    ],
    factors_negative: [
      "Retail trading volume changes will depend on broader stock market conditions.",
    ],
    not_confirmed: [
      "The source does not quantify financial revenue contribution or subscriber targets.",
    ],
    watch_next: [
      "Safaricom platform metrics in subsequent trading updates.",
      "Investor onboarding numbers reported at the next financial release.",
    ],
    impact_score: 3,
    impact_reason: "Product expansion adds direct platform utility for retail users.",
  }),
};

describe("InvestorBriefing DOM & Visual Verification", () => {
  it("renders the 9 target sections with clean HTML entities and without duplicated text", () => {
    const briefing = buildInvestorBriefing(mockArticle, { stock: mockStock });
    const { container } = render(
      <MemoryRouter>
        <InvestorBriefing briefing={briefing} heroImage={mockArticle.image_url} />
      </MemoryRouter>
    );

    // 1. Decoded Title & Entities
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Safaricom Platform Expands to KDF & Foreign Residents");
    expect(container.textContent).not.toContain("&#x54;");
    expect(container.textContent).not.toContain("&#xA0;");
    expect(container.textContent).not.toContain("&amp;");

    // 2. The Takeaway
    expect(screen.getByText(/ZiiDi Trader expanded access to more potential users/)).toBeInTheDocument();

    // 3. Why This Matters
    expect(screen.getByText("Why This Matters")).toBeInTheDocument();
    expect(screen.getByText(/expanding user eligibility can broaden retail trading/)).toBeInTheDocument();

    // 4. Market Snapshot
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("Safaricom PLC")).toBeInTheDocument();
    expect(screen.getByText("KES 36.35")).toBeInTheDocument();
    expect(screen.getByText("+0.39%")).toBeInTheDocument();
    expect(screen.getByText(/Impact\s*3\/5/)).toBeInTheDocument();
    expect(screen.getByText("Previous:")).toBeInTheDocument();
    expect(screen.getByText("KES 36.21")).toBeInTheDocument();

    // 5. What We Know
    expect(screen.getByText("What We Know")).toBeInTheDocument();
    expect(screen.getByText(/KDF personnel can now register/)).toBeInTheDocument();
    expect(screen.getByText(/Foreign passport holders with Kenyan residency/)).toBeInTheDocument();

    // 6. What It Could Mean
    expect(screen.getByText("What It Could Mean")).toBeInTheDocument();
    expect(screen.getByText(/Broadens retail platform reach/)).toBeInTheDocument();

    // 7. What We Don't Know
    expect(screen.getByText("What We Don't Know")).toBeInTheDocument();
    expect(screen.getByText(/source does not quantify financial revenue contribution/)).toBeInTheDocument();

    // 8. Watch Next
    expect(screen.getByText("Watch Next")).toBeInTheDocument();
    expect(screen.getByText(/Safaricom platform metrics in subsequent trading updates/)).toBeInTheDocument();

    // 9. Source & Company Timeline
    expect(screen.getByText("Business Daily")).toBeInTheDocument();
    expect(screen.getByText("Company Timeline")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("toggles the price chart interactively on Show Chart / Hide Chart click", () => {
    const briefing = buildInvestorBriefing(mockArticle, { stock: mockStock });
    render(
      <MemoryRouter>
        <InvestorBriefing briefing={briefing} />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole("button", { name: /Show Chart/i });
    expect(toggleButton).toBeInTheDocument();

    // Expand chart
    fireEvent.click(toggleButton);
    expect(screen.getByRole("button", { name: /Hide Chart/i })).toBeInTheDocument();

    // Collapse chart
    fireEvent.click(screen.getByRole("button", { name: /Hide Chart/i }));
    expect(screen.getByRole("button", { name: /Show Chart/i })).toBeInTheDocument();
  });

  it("renders rich briefing for standard article without explicit AI fields (ZiiDi expansion)", () => {
    const standardArticle: NewsFromDB = {
      id: "ziidi-std",
      title: "Safaricom expands ZiiDi Trader access to military personnel and foreign residents",
      summary: "ZiiDi Trader has expanded its registration criteria to include Kenya Defence Forces personnel using military identification cards and foreign passport holders residing in Kenya.",
      content: "The expansion allows active service members of the Kenya Defence Forces (KDF) and accredited foreign passport holders with valid Kenyan alien residency cards to open retail stock trading accounts. ZiiDi Trader operates under CMA regulatory sandbox guidelines, offering direct NSE equity execution. Safaricom introduced the feature to broaden financial inclusion across the capital markets ecosystem.",
      source: "Business Daily",
      url: "https://businessdailyafrica.com/ziidi-expansion",
      image_url: null,
      created_at: "2026-08-20T10:00:00Z",
      ai_insight: null, // Zero AI fields!
    };

    const briefing = buildInvestorBriefing(standardArticle, { stock: mockStock });
    render(
      <MemoryRouter>
        <InvestorBriefing briefing={briefing} />
      </MemoryRouter>
    );

    // 1. Decoded Title
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Safaricom expands ZiiDi Trader access");

    // 2. The Takeaway
    expect(screen.getByText(/ZiiDi Trader has expanded its registration criteria/)).toBeInTheDocument();

    // 3. Why This Matters (Derived)
    expect(screen.getByText("Why This Matters")).toBeInTheDocument();
    expect(screen.getByText(/expanding product access and user eligibility widens the addressable audience/)).toBeInTheDocument();

    // 4. Market Snapshot
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("KES 36.35")).toBeInTheDocument();

    // 5. What We Know (Extracted from content)
    expect(screen.getByText("What We Know")).toBeInTheDocument();
    expect(screen.getAllByText(/Kenya Defence Forces/i).length).toBeGreaterThanOrEqual(1);

    // 6. What It Could Mean (Cautious interpretation)
    expect(screen.getByText("What It Could Mean")).toBeInTheDocument();
    expect(screen.getByText(/Broadens customer onboarding avenues/)).toBeInTheDocument();

    // 7. What We Don't Know
    expect(screen.getByText("What We Don't Know")).toBeInTheDocument();
    expect(screen.getByText(/does not quantify direct financial revenue/)).toBeInTheDocument();

    // 8. Watch Next
    expect(screen.getByText("Watch Next")).toBeInTheDocument();
    expect(screen.getByText(/Official disclosure of active user uptake/)).toBeInTheDocument();

    // 9. Source & Company Timeline
    expect(screen.getByText("Business Daily")).toBeInTheDocument();
    expect(screen.getByText("Company Timeline")).toBeInTheDocument();
  });
});

