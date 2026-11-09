import { describe, expect, it } from "vitest";
import { interleaveItems } from "./newsDedupe";
import { type NewsFromDB } from "./api";

function mockArticle(id: string, isVideo = false): NewsFromDB {
  return {
    id,
    title: isVideo ? `Video Briefing ${id}` : `Breaking News Headline ${id}`,
    summary: "Summary text",
    content: null,
    source: isVideo ? "Central Bank of Kenya" : "Business Daily",
    date_published: new Date().toISOString(),
    source_published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    url: isVideo ? `https://www.youtube.com/watch?v=${id}` : `https://example.com/${id}`,
    category: "Market News",
    read_time: "3 min read",
    is_featured: false,
    status: "published",
    image_url: null,
    video_url: isVideo ? `https://www.youtube.com/watch?v=${id}` : null,
    related_stock_id: null,
    ai_insight: null,
  };
}

describe("Smart Video & Article Interleaving Engine", () => {
  it("interleaves video briefings smoothly into the news feed", () => {
    const textArticles = Array.from({ length: 30 }, (_, i) => mockArticle(`text-${i}`, false));
    const videoArticles = Array.from({ length: 5 }, (_, i) => mockArticle(`video-${i}`, true));

    const interleaved = interleaveItems(textArticles, videoArticles, 1, 4);

    expect(interleaved.length).toBe(35);

    // Card #1 (index 0) must be a breaking news text story
    expect(interleaved[0].video_url).toBeFalsy();
    expect(interleaved[0].id).toBe("text-0");

    // Card #2 (index 1) must be an inline video briefing
    expect(interleaved[1].video_url).toBeTruthy();
    expect(interleaved[1].id).toBe("video-0");

    // Card #3 (index 2) must be a breaking news text story
    expect(interleaved[2].video_url).toBeFalsy();
    expect(interleaved[2].id).toBe("text-1");

    // Top 3 before InlineDataGate: 2 fresh breaking news + 1 video briefing
    const top3 = interleaved.slice(0, 3);
    const top3Text = top3.filter((x) => !x.video_url);
    const top3Video = top3.filter((x) => Boolean(x.video_url));
    expect(top3Text).toHaveLength(2);
    expect(top3Video).toHaveLength(1);

    // Verify video positions in top 15 cards: indices 1, 5, 9, 13
    const videoIndices = interleaved.slice(0, 15).map((x, i) => x.video_url ? i : null).filter((i): i is number => i !== null);
    expect(videoIndices).toEqual([1, 5, 9, 13]);

    // Cards between videos are breaking news
    expect(interleaved[2].video_url).toBeFalsy();
    expect(interleaved[3].video_url).toBeFalsy();
    expect(interleaved[4].video_url).toBeFalsy();

    expect(interleaved[5].video_url).toBeTruthy(); // Video 1
    expect(interleaved[6].video_url).toBeFalsy();
    expect(interleaved[7].video_url).toBeFalsy();
    expect(interleaved[8].video_url).toBeFalsy();

    expect(interleaved[9].video_url).toBeTruthy(); // Video 2
    expect(interleaved[10].video_url).toBeFalsy();
    expect(interleaved[11].video_url).toBeFalsy();
    expect(interleaved[12].video_url).toBeFalsy();

    expect(interleaved[13].video_url).toBeTruthy(); // Video 3
  });
});
