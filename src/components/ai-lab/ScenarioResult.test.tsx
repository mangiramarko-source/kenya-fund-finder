import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ScenarioResult from "./ScenarioResult";
import type { MarketNewsBriefResult } from "../../../supabase/functions/_shared/market-news-brief";

const brief: MarketNewsBriefResult = {
  kind: "market-news-brief",
  title: "Kenya Market Brief",
  reportDate: "2026-09-10",
  overview: "The latest stored market overview is available.",
  overviewUnavailable: false,
  articles: [
    {
      id: "article-1",
      category: "Market News",
      source: "Business Daily",
      publishedAt: "2026-09-10T07:00:00.000Z",
      title: "Stored market headline",
      summary: "Stored article summary for the market brief.",
      articlePath: "/news/article-1",
    },
  ],
  disclaimer: "Data only. Not personal financial advice.",
};

describe("ScenarioResult market news brief", () => {
  it("renders article metadata and the internal article route", () => {
    const { container } = render(<MemoryRouter><ScenarioResult result={brief} /></MemoryRouter>);

    expect(screen.getByText("Market news brief")).toBeInTheDocument();
    expect(screen.getByText(/Latest available site news/)).toHaveTextContent("1 article");
    expect(screen.getByText("Stored market headline")).toBeInTheDocument();
    expect(screen.getByText("Stored article summary for the market brief.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Stored market headline/i })).toHaveAttribute("href", "/news/article-1");
    expect(container.firstElementChild).toHaveClass("border-0", "bg-transparent", "p-0", "shadow-none");
  });

  it("states when the market overview is unavailable", () => {
    render(<MemoryRouter><ScenarioResult result={{ ...brief, overview: null, overviewUnavailable: true, articles: [] }} /></MemoryRouter>);

    expect(screen.getByText(/Market overview is unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/No approved market news articles/i)).toBeInTheDocument();
  });
});
