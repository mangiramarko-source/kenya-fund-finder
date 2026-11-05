import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InvestorBriefing } from "@/components/news/InvestorBriefing";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";
import type { NewsFromDB, PublicStock } from "@/lib/api";

const mockArticle: NewsFromDB = {
  id: "safaricom-expansion",
  title: "Safaricom Expands Platform",
  summary: "Safaricom announces major service expansion across East Africa.",
  content: "Full detailed story about telecom expansions.",
  source: "Business Daily",
  source_published_at: "2026-03-31T08:00:00Z",
  category: "Telecommunications",
  image_url: "https://example.com/scom.jpg",
  created_at: "2026-03-31T08:00:00Z",
  date_published: "2026-03-31T08:00:00Z",
  status: "published",
  likes: 42,
  read_time: "3 min read",
  ai_analysis: {
    what_we_know: ["Fact 1: Platform expanded", "Fact 2: Network upgraded"],
    what_it_could_mean: ["Interpretation: Increased revenue"],
    what_we_dont_know: ["Uncertainty: Regulatory approvals"],
    watch_next: ["Upcoming quarterly results"],
    takeaway: ["Key Takeaway: Expansion is underway"],
    why_this_matters: ["Significant impact on NSE index"],
  },
};

const mockStock: PublicStock = {
  id: "stock-scom",
  symbol: "SCOM",
  name: "Safaricom PLC",
  price: 18.5,
  previous_price: 18.0,
  day_change: 0.5,
  day_change_percent: 2.78,
  volume: 1200000,
  market_cap: 740000000000,
  pe_ratio: 14.2,
  dividend_yield: 6.5,
  sector: "Telecommunications",
  is_active: true,
  updated_at: "2026-03-31T08:00:00Z",
};

describe("News Gating Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gates news briefing to top 3 sections and renders InlineDataGate when isGated is true", () => {
    const briefing = buildInvestorBriefing(mockArticle, { stock: mockStock });

    render(
      <MemoryRouter>
        <InvestorBriefing briefing={briefing} isGated={true} />
      </MemoryRouter>
    );

    // Visible: Takeaway, Why This Matters, Market Snapshot
    expect(screen.getByText("Safaricom Expands Platform")).toBeInTheDocument();
    expect(screen.getByText(/Why This Matters/i)).toBeInTheDocument();
    expect(screen.getAllByText(/KES 18.50/i).length).toBeGreaterThan(0);

    // InlineDataGate is rendered with 6+ more available
    expect(screen.getByText(/Unlock Full Kenyan Market Briefing & Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/6\+ More Available/i)).toBeInTheDocument();

    // Hidden behind gate: Confirmed facts, Interpretation, Guardrails
    expect(screen.queryByRole("heading", { name: /What We Know/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /What It Could Mean/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /What We Don't Know/i })).not.toBeInTheDocument();
  });

  it("renders all sections un-gated when user is authenticated (isGated = false)", () => {
    const briefing = buildInvestorBriefing(mockArticle, { stock: mockStock });

    render(
      <MemoryRouter>
        <InvestorBriefing briefing={briefing} isGated={false} />
      </MemoryRouter>
    );

    // Sections 4+ are present when un-gated
    expect(screen.getByRole("heading", { name: /What It Could Mean/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /What We Don't Know/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Company Timeline/i })).toBeInTheDocument();

    // InlineDataGate is NOT rendered
    expect(screen.queryByText(/Unlock Full Kenyan Market Briefing & Analysis/i)).not.toBeInTheDocument();
  });
});
