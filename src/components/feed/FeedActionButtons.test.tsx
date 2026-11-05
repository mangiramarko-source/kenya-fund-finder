import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SocialFeedCard } from "./SocialFeed";
import { StockFeedCard } from "./StockFeedCard";
import type { FeedItem } from "@/hooks/useSocialFeed";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-id" }, loading: false }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const mockSocialItem: FeedItem = {
  id: "news-test-1",
  type: "NEWS",
  authorName: "Business Daily",
  authorLabel: "Kenyan",
  title: "CBK Keeps Benchmark Rate Steady",
  content: "The Central Bank of Kenya held its key benchmark lending rate steady at 12.75% during today's MPC meeting.",
  timestamp: new Date("2026-11-05T08:00:00Z"),
  likes: 12,
  comments: 4,
};

const mockStockItem: FeedItem = {
  id: "news-stock-1",
  type: "STOCK_INSIGHT",
  authorName: "Safaricom",
  authorLabel: "Stock",
  title: "Safaricom Expands M-PESA Global Services",
  content: "Safaricom PLC announced higher transaction limits and enhanced interoperability across regional remittance corridors.",
  timestamp: new Date("2026-11-05T08:00:00Z"),
  likes: 25,
  comments: 7,
  relatedStock: {
    id: "stock-scom",
    symbol: "SCOM",
    name: "Safaricom PLC",
    price: 36.35,
    previousPrice: 36.21,
    changePercent: 0.39,
  },
};

describe("Market News 6-Action Twitter/X Pill Row", () => {
  it("renders all 6 action buttons on SocialFeedCard", () => {
    const handleUpvote = vi.fn();
    const handleBookmark = vi.fn();
    const handleRecordView = vi.fn();

    render(
      <BrowserRouter>
        <SocialFeedCard
          item={mockSocialItem}
          onSelect={vi.fn()}
          interaction={{
            liked: false,
            likeCount: 12,
            upvoted: false,
            upvoteCount: 5,
            bookmarked: false,
            viewsCount: 1450,
            formattedViews: "1.5K",
            comments: ["Great update"],
          }}
          onUpvoteToggle={handleUpvote}
          onBookmarkToggle={handleBookmark}
          onRecordView={handleRecordView}
        />
      </BrowserRouter>
    );

    // Comments button
    expect(screen.getByRole("button", { name: /comments/i })).toBeInTheDocument();
    // Likes button
    expect(screen.getByRole("button", { name: /like article/i })).toBeInTheDocument();
    // Upvote / Rank button
    expect(screen.getByRole("button", { name: /upvote story/i })).toBeInTheDocument();
    // Views badge
    expect(screen.getByTitle("1,450 total views")).toBeInTheDocument();
    // Bookmark button
    expect(screen.getByRole("button", { name: /bookmark article/i })).toBeInTheDocument();
    // Share button
    expect(screen.getByRole("button", { name: /share article/i })).toBeInTheDocument();
  });

  it("handles upvote, bookmark, and view clicks on SocialFeedCard", () => {
    const handleUpvote = vi.fn();
    const handleBookmark = vi.fn();
    const handleRecordView = vi.fn();
    const handleSelect = vi.fn();

    render(
      <BrowserRouter>
        <SocialFeedCard
          item={mockSocialItem}
          onSelect={handleSelect}
          interaction={{
            liked: false,
            likeCount: 12,
            upvoted: true,
            upvoteCount: 6,
            bookmarked: true,
            viewsCount: 1450,
            formattedViews: "1.5K",
            comments: [],
          }}
          onUpvoteToggle={handleUpvote}
          onBookmarkToggle={handleBookmark}
          onRecordView={handleRecordView}
        />
      </BrowserRouter>
    );

    // Upvote
    const upvoteBtn = screen.getByRole("button", { name: /remove upvote/i });
    fireEvent.click(upvoteBtn);
    expect(handleUpvote).toHaveBeenCalledWith("news-test-1", 6);

    // Bookmark
    const bookmarkBtn = screen.getByRole("button", { name: /remove bookmark/i });
    fireEvent.click(bookmarkBtn);
    expect(handleBookmark).toHaveBeenCalledWith("news-test-1");

    // Card click triggers onRecordView
    fireEvent.click(screen.getByText("CBK Keeps Benchmark Rate Steady"));
    expect(handleRecordView).toHaveBeenCalledWith("news-test-1");
  });

  it("renders all 6 action buttons on StockFeedCard", () => {
    const handleUpvote = vi.fn();
    const handleBookmark = vi.fn();

    render(
      <BrowserRouter>
        <StockFeedCard
          item={mockStockItem}
          onSelect={vi.fn()}
          interaction={{
            liked: true,
            likeCount: 26,
            upvoted: false,
            upvoteCount: 9,
            bookmarked: false,
            viewsCount: 2200,
            formattedViews: "2.2K",
            comments: [],
          }}
          onUpvoteToggle={handleUpvote}
          onBookmarkToggle={handleBookmark}
        />
      </BrowserRouter>
    );

    expect(screen.getByRole("button", { name: /comments/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlike article/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upvote story/i })).toBeInTheDocument();
    expect(screen.getByTitle("2,200 total views")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bookmark article/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share article/i })).toBeInTheDocument();
  });
});
