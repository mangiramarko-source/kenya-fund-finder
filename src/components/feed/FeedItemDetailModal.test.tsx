import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FeedItemDetailModal } from "./FeedItemDetailModal";
import type { FeedItem } from "@/hooks/useSocialFeed";

// Mock supabase client and auth
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
  useAuth: () => ({ user: null, profile: null }),
}));

describe("FeedItemDetailModal headline deduplication", () => {
  const mockFeedItem: FeedItem = {
    id: "news-123",
    type: "NEWS",
    title: "Safaricom Expands M-Pesa Global Services Across Africa",
    content: "Safaricom has expanded M-Pesa cross-border financial services to six more African markets.",
    timestamp: new Date().toISOString(),
    authorName: "Business Daily",
    authorLabel: "Business Daily",
    url: "https://businessdailyafrica.com/scom-expansion",
    likesCount: 10,
    commentsCount: 2,
    sharesCount: 1,
    viewsCount: 100,
    rawItem: {
      id: "news-123",
      title: "Safaricom Expands M-Pesa Global Services Across Africa",
      summary: "Safaricom has expanded M-Pesa cross-border financial services to six more African markets.",
      content: "Safaricom has expanded M-Pesa cross-border financial services to six more African markets. The expansion will allow instant remittances and mobile merchant settlement.",
      source: "Business Daily",
      url: "https://businessdailyafrica.com/scom-expansion",
      image_url: null,
      category: "Telecommunications",
      created_at: new Date().toISOString(),
    },
  };

  it("renders the article headline exactly ONCE in the modal (in DialogTitle) without duplication in the briefing body", () => {
    render(
      <MemoryRouter>
        <FeedItemDetailModal
          item={mockFeedItem}
          open={true}
          onOpenChange={vi.fn()}
        />
      </MemoryRouter>
    );

    // The headline text must appear exactly once in the entire modal DOM
    const matchingHeadings = screen.getAllByText("Safaricom Expands M-Pesa Global Services Across Africa");
    expect(matchingHeadings).toHaveLength(1);

    // Verify it is inside the DialogTitle / DialogHeader
    expect(matchingHeadings[0].tagName.toLowerCase()).toBe("h2"); // DialogTitle renders as h2 by radix-ui/shadcn
  });
});
