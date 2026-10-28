import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketEntertainmentWidget } from "./MarketEntertainmentWidget";

describe("MarketEntertainmentWidget", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders the interactive tabs and default sentiment poll", () => {
    render(<MarketEntertainmentWidget />);

    expect(screen.getByText("Market Hub")).toBeInTheDocument();
    expect(screen.getByText("🐂 Bull vs Bear")).toBeInTheDocument();
    expect(screen.getByText("60s Espresso")).toBeInTheDocument();
    expect(screen.getByText("Daily Quiz")).toBeInTheDocument();

    // Default tab is sentiment poll
    expect(screen.getByRole("button", { name: /bullish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bearish/i })).toBeInTheDocument();
  });

  it("allows user to vote Bullish and renders the sentiment results bar", () => {
    render(<MarketEntertainmentWidget />);

    const bullBtn = screen.getByRole("button", { name: /bullish/i });
    fireEvent.click(bullBtn);

    expect(screen.getByText(/vote recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/you voted:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/bullish/i).length).toBeGreaterThan(0);
    expect(localStorage.getItem("kff_news_demo_vote")).toBe("bull");
  });

  it("switches to 60s Espresso tab and displays bullet takeaways", () => {
    render(<MarketEntertainmentWidget />);

    const espressoTab = screen.getByText("60s Espresso");
    fireEvent.click(espressoTab);

    expect(screen.getByText("NSE Equities")).toBeInTheDocument();
    expect(screen.getByText("MMF Yields")).toBeInTheDocument();
    expect(screen.getByText("Macro Pulse")).toBeInTheDocument();
  });

  it("switches to Daily Quiz tab and reveals explanation upon selecting answer", () => {
    render(<MarketEntertainmentWidget />);

    const quizTab = screen.getByText("Daily Quiz");
    fireEvent.click(quizTab);

    expect(screen.getByText(/statutory withholding tax rate/i)).toBeInTheDocument();
    const correctOption = screen.getByRole("button", { name: /15%/i });
    fireEvent.click(correctOption);

    expect(screen.getByText(/why:/i)).toBeInTheDocument();
    expect(screen.getByText(/section 35 of the income tax act/i)).toBeInTheDocument();
  });
});
