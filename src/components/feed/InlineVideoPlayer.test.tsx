// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import { JSDOM } from "jsdom";
import React from "react";

beforeAll(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://kenyafundfinder.com/news",
  });
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    HTMLElement: dom.window.HTMLElement,
    HTMLImageElement: dom.window.HTMLImageElement,
    HTMLIFrameElement: dom.window.HTMLIFrameElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    CustomEvent: dom.window.CustomEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, profile: null, loading: false }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("X/Twitter-style 16:9 Inline Video Player in Feed Cards & Modal", () => {
  it("plays inline in SocialFeedCard with e.stopPropagation() and records view once", async () => {
    const { render, fireEvent } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");
    const { SocialFeedCard } = await import("./SocialFeed");

    const onSelect = vi.fn();
    const onRecordView = vi.fn();

    const item: any = {
      id: "news-cbk-video-1",
      type: "NEWS",
      authorName: "Central Bank of Kenya",
      authorLabel: "Yield Updates",
      title: "CBK Post-MPC Briefing: Central Bank Rate held at 12.75%",
      content: "Full MPC analysis on inflation and exchange rate stability.",
      timestamp: new Date(),
      likes: 12,
      comments: 3,
      url: "https://www.youtube.com/watch?v=k9pQ2wLmN01",
      rawItem: {
        id: "cbk-video-1",
        title: "CBK Post-MPC Briefing: Central Bank Rate held at 12.75%",
        source: "Central Bank of Kenya",
        url: "https://www.youtube.com/watch?v=k9pQ2wLmN01",
        video_url: "https://www.youtube.com/watch?v=k9pQ2wLmN01",
        image_url: "https://i.ytimg.com/vi/k9pQ2wLmN01/hqdefault.jpg",
      },
    };

    const { container, getByLabelText, getByText, getByTestId } = render(
      <MemoryRouter>
        <SocialFeedCard
          item={item}
          onSelect={onSelect}
          onRecordView={onRecordView}
        />
      </MemoryRouter>,
    );

    // Honest badge (Guardrail 2: no fake durations)
    expect(getByText("▶ Video Briefing")).toBeTruthy();

    // Click frosted play button
    const playBtn = getByLabelText("Play inline video");
    fireEvent.click(playBtn);

    // Must NOT trigger card modal open (Guardrail 5: e.stopPropagation())
    expect(onSelect).not.toHaveBeenCalled();
    expect(onRecordView).toHaveBeenCalledTimes(1);
    expect(onRecordView).toHaveBeenCalledWith("news-cbk-video-1");

    // Verify iframe attributes
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/k9pQ2wLmN01?autoplay=1&rel=0",
    );
    expect(iframe?.getAttribute("allow")).toBe(
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    );
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(true);

    // Clicking the iframe container must also stop propagation
    const iframeContainer = getByTestId("inline-video-iframe-container");
    fireEvent.click(iframeContainer);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("plays inline in StockFeedCard without opening the article modal", async () => {
    const { render, fireEvent } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");
    const { StockFeedCard } = await import("./StockFeedCard");

    const onSelect = vi.fn();
    const onRecordView = vi.fn();

    const stockItem: any = {
      id: "news-scom-video-1",
      type: "NEWS",
      authorName: "Safaricom PLC",
      authorLabel: "Stock",
      title: "Safaricom Full Year Earnings Investor Briefing",
      content: "Safaricom reports strong M-Pesa revenue growth in Kenya.",
      timestamp: new Date(),
      likes: 25,
      comments: 4,
      url: "https://www.businessdailyafrica.com/scom-results",
      relatedStock: {
        id: "stock-scom",
        symbol: "SCOM",
        name: "Safaricom PLC",
        sector: "Telecommunications",
        price: 17.5,
        previousPrice: 17.0,
        changePercent: 2.94,
        peRatio: 11.2,
        dividendYield: 6.8,
        yearLow: 13.5,
        yearHigh: 19.2,
        marketCap: 701000000000,
      },
      rawItem: {
        id: "scom-video-1",
        title: "Safaricom Full Year Earnings Investor Briefing",
        source: "Kenyan Wall Street",
        url: "https://www.businessdailyafrica.com/scom-results",
        video_url: "https://www.youtube.com/watch?v=AbCdEfGh123",
        image_url: "https://i.ytimg.com/vi/AbCdEfGh123/hqdefault.jpg",
      },
    };

    const { container, getByLabelText } = render(
      <MemoryRouter>
        <StockFeedCard
          item={stockItem}
          onSelect={onSelect}
          onRecordView={onRecordView}
        />
      </MemoryRouter>,
    );

    const playBtn = getByLabelText("Play inline video");
    fireEvent.click(playBtn);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onRecordView).toHaveBeenCalledTimes(1);
    expect(onRecordView).toHaveBeenCalledWith("news-scom-video-1");

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/AbCdEfGh123?autoplay=1&rel=0",
    );
  });

  it("resolves verified YouTube briefing IDs (e.g. yt-cbk-Fu-Ueab7Fxw) on Continue Reading with real title, inline video player, and YouTube source link", async () => {
    const { render, fireEvent } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");
    const { fetchNewsById } = await import("@/lib/api");
    const { buildInvestorBriefing } = await import("@/lib/newsBriefingMapper");
    const { InvestorBriefing } = await import("@/components/news/InvestorBriefing");

    const article = await fetchNewsById("yt-cbk-Fu-Ueab7Fxw");
    expect(article).not.toBeNull();
    expect(article?.title).toBe(
      "MPC Press Briefing | Central Bank of Kenya Monetary Policy Committee",
    );
    expect(article?.title).not.toContain("Yt cbk Fu Ueab7Fxw");
    expect(article?.source).toBe("Central Bank of Kenya");

    const briefing = buildInvestorBriefing(article!);
    expect(briefing.youtubeVideoId).toBe("Fu-Ueab7Fxw");
    expect(briefing.source.url).toBe("https://www.youtube.com/watch?v=Fu-Ueab7Fxw");
    expect(briefing.whatWeKnow.length).toBeGreaterThan(0);

    const { container, getByLabelText, getByText } = render(
      <MemoryRouter>
        <InvestorBriefing
          briefing={briefing}
          heroImage={article?.image_url}
          isGated={false}
        />
      </MemoryRouter>,
    );

    expect(
      getByText("MPC Press Briefing | Central Bank of Kenya Monetary Policy Committee"),
    ).toBeTruthy();
    expect(getByText("▶ Video Briefing")).toBeTruthy();
    expect(getByText(/Watch on YouTube — Central Bank of Kenya/i)).toBeTruthy();

    const playBtn = getByLabelText("Play inline video");
    fireEvent.click(playBtn);

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/Fu-Ueab7Fxw?autoplay=1&rel=0",
    );
  });
});
