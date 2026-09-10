import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ScenarioResult from "./ScenarioResult";
import type { DailyMarketSummaryResult } from "../../../supabase/functions/_shared/daily-market-summary";

const fxSummary: DailyMarketSummaryResult = {
  kind: "daily-market-summary",
  title: "FX rate summary",
  sections: [{
    kind: "fx",
    title: "FX rate summary",
    summary: "Rates are KES per 1 unit.",
    metrics: [
      { label: "USD/KES", value: "129.4666", detail: "+0.03%", trend: "positive" },
      { label: "EUR/KES", value: "150.4891", detail: "+0.05%", trend: "positive" },
      { label: "GBP/KES", value: "175.2541", detail: "-0.05%", trend: "negative" },
      { label: "ZAR/KES", value: "8.1091", detail: "+0.27%", trend: "positive" },
    ],
    highlights: [],
    unavailable: false,
  }],
  disclaimer: "Data only. Not personal financial advice.",
};

describe("ScenarioResult daily market summary", () => {
  it("renders the four server-provided FX metrics", () => {
    render(<MemoryRouter><ScenarioResult result={fxSummary} /></MemoryRouter>);

    expect(screen.getAllByText("FX rate summary")).toHaveLength(2);
    for (const label of ["USD/KES", "EUR/KES", "GBP/KES", "ZAR/KES"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("129.4666")).toBeInTheDocument();
    expect(screen.getByText("-0.05%")).toBeInTheDocument();
  });

  it("renders a combined daily summary with the market news brief", () => {
    render(<MemoryRouter><ScenarioResult result={{
      ...fxSummary,
      title: "Daily market summary",
      newsBrief: {
        kind: "market-news-brief",
        title: "Kenya Market Brief",
        reportDate: "2026-09-10",
        overview: "Stored market overview.",
        overviewUnavailable: false,
        articles: [{ id: "article-1", category: "Market News", source: "KenyaFundFinder", publishedAt: null, title: "Stored news headline", summary: "Stored news summary.", articlePath: "/news/article-1" }],
        disclaimer: "Data only. Not personal financial advice.",
      },
    }} /></MemoryRouter>);

    expect(screen.getByText("Kenya Market Brief")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Stored news headline/i })).toHaveAttribute("href", "/news/article-1");
  });
});
