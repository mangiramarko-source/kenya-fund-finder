import { describe, expect, it } from "vitest";
import {
  assessNewsDuplicate,
  canonicalNewsUrl,
  dedupeNewsArticles,
  dedupeNewsByUrl,
  extractYouTubeVideoId,
  interleaveItems,
  normalizeFinancialText,
  stripPublisherSuffix,
} from "./newsDedupe";

describe("newsDedupe — URL, Synonym, Cluster & Video Merge Engine", () => {
  it("removes tracking data without changing meaningful query parameters", () => {
    expect(canonicalNewsUrl("https://Example.com/story/?utm_source=rss&edition=ke#section"))
      .toBe("https://example.com/story?edition=ke");
  });

  it("keeps the first copy of a story and retains articles without a URL", () => {
    const articles = [
      { id: "first", url: "https://news.example/story?utm_source=rss" },
      { id: "duplicate", url: "https://news.example/story" },
      { id: "no-url", url: null },
    ];

    expect(dedupeNewsByUrl(articles).map((article) => article.id)).toEqual(["first", "no-url"]);
  });

  it("strips publisher suffixes and domain names cleanly", () => {
    expect(stripPublisherSuffix("CBK holds rate at 12.75% - Business Daily"))
      .toBe("CBK holds rate at 12.75%");
    expect(stripPublisherSuffix("Safaricom Q3 earnings jump | The Kenyan Wall Street"))
      .toBe("Safaricom Q3 earnings jump");
    expect(stripPublisherSuffix("Treasury bills oversubscribed - standardmedia.co.ke"))
      .toBe("Treasury bills oversubscribed");
  });

  it("normalizes Kenyan financial synonyms into canonical tokens", () => {
    const a = normalizeFinancialText("CBK holds benchmark lending rate at 12.75%");
    const b = normalizeFinancialText("Central Bank of Kenya maintains CBR at 12.75pc");
    expect(a).toContain("cbk");
    expect(a).toContain("cbr");
    expect(a).toContain("12.75%");
    expect(b).toContain("cbk");
    expect(b).toContain("cbr");
    expect(b).toContain("12.75%");
  });

  it("extracts YouTube video IDs accurately and rejects YouTube Shorts", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be"))
      .toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/AbCdEfGh123"))
      .toBe("AbCdEfGh123");
    expect(extractYouTubeVideoId({ image_url: "https://i.ytimg.com/vi/XyZ98765432/hqdefault.jpg" }))
      .toBe("XyZ98765432");
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"))
      .toBeNull();
  });

  it("deduplicates cross-publisher stories reporting the same CBK rate decision within 72h", () => {
    const articles = [
      {
        id: "bd-1",
        title: "CBK holds benchmark lending rate at 12.75% amid easing inflation - Business Daily",
        summary: "The Central Bank of Kenya Monetary Policy Committee retained the benchmark lending rate at 12.75 percent citing anchored inflation and shilling stability.",
        source: "Business Daily",
        url: "https://www.businessdailyafrica.com/bd/economy/cbk-holds-rate-1275",
        source_published_at: "2026-11-07T10:00:00Z",
      },
      {
        id: "std-1",
        title: "Central Bank maintains CBR at 12.75pc as inflation eases - The Standard",
        summary: "CBK keeps key lending rate unchanged at 12.75%.",
        source: "Standard Media",
        url: "https://www.standardmedia.co.ke/business/cbk-maintains-cbr-1275",
        source_published_at: "2026-11-07T12:30:00Z",
      },
    ];

    const deduped = dedupeNewsArticles(articles);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("bd-1");
  });

  it("guards against false-positive deduplication when two different stories share 1 entity and 1 rate", () => {
    const rateDecision = {
      id: "cbk-rate",
      title: "CBK holds benchmark rate at 12.75% amid inflation concerns",
      summary: "The Monetary Policy Committee held the Central Bank Rate at 12.75% following its bi-monthly meeting.",
      source: "Business Daily",
      url: "https://www.businessdailyafrica.com/bd/economy/cbk-rate-decision",
      source_published_at: "2026-11-07T09:00:00Z",
    };

    const bankPenalty = {
      id: "cbk-penalty",
      title: "CBK fines three commercial lenders over foreign exchange compliance breaches while lending rates average 12.75%",
      summary: "Commercial banks face regulatory penalties after routine forex audits revealed reporting gaps in Nairobi.",
      source: "Kenyan Wall Street",
      url: "https://kenyanwallstreet.com/cbk-fines-commercial-lenders-fx",
      source_published_at: "2026-11-07T14:00:00Z",
    };

    const assessment = assessNewsDuplicate(rateDecision, bankPenalty);
    expect(assessment.isDuplicate).toBe(false);

    const deduped = dedupeNewsArticles([rateDecision, bankPenalty]);
    expect(deduped).toHaveLength(2);
  });

  it("merges a short-description YouTube video with a substantive text article in the same story cluster", () => {
    const youtubeBriefing = {
      id: "yt-cbk",
      title: "CBK Post-MPC Press Briefing: Central Bank Rate held at 12.75%",
      summary: "Watch the CBK Governor press briefing on the 12.75% CBR decision.",
      content: null,
      source: "Central Bank of Kenya",
      url: "https://www.youtube.com/watch?v=k9pQ2wLmN01",
      image_url: "https://i.ytimg.com/vi/k9pQ2wLmN01/hqdefault.jpg",
      source_published_at: "2026-11-07T11:00:00Z",
    };

    const deepAnalysis = {
      id: "bd-analysis",
      title: "CBK holds Central Bank Rate at 12.75% in post-MPC briefing - Business Daily",
      summary:
        "The Central Bank of Kenya Monetary Policy Committee retained the Central Bank Rate at 12.75 percent on Tuesday, pointing to easing food inflation, strong diaspora remittances, and a stable shilling across local money markets.",
      content:
        "**Investor Takeaways**\n- Money market fund yields are projected to remain above 14%.\n- Treasury bond durations remain attractive for fixed income investors.",
      source: "Business Daily",
      url: "https://www.businessdailyafrica.com/bd/economy/cbk-mpc-1275-analysis",
      image_url: null,
      source_published_at: "2026-11-07T12:00:00Z",
    };

    // Regardless of order (video first or text first), the merged item keeps deep text AND attaches video_url
    const mergedVideoFirst = dedupeNewsArticles([youtubeBriefing, deepAnalysis]);
    expect(mergedVideoFirst).toHaveLength(1);
    expect(mergedVideoFirst[0].summary).toContain("Monetary Policy Committee retained");
    expect(mergedVideoFirst[0].content).toContain("Investor Takeaways");
    expect(mergedVideoFirst[0].video_url).toBe("https://www.youtube.com/watch?v=k9pQ2wLmN01");
    expect(extractYouTubeVideoId(mergedVideoFirst[0])).toBe("k9pQ2wLmN01");

    const mergedTextFirst = dedupeNewsArticles([deepAnalysis, youtubeBriefing]);
    expect(mergedTextFirst).toHaveLength(1);
    expect(mergedTextFirst[0].summary).toContain("Monetary Policy Committee retained");
    expect(mergedTextFirst[0].content).toContain("Investor Takeaways");
    expect(mergedTextFirst[0].video_url).toBe("https://www.youtube.com/watch?v=k9pQ2wLmN01");
  });

  describe("interleaveItems — Smart Video & Article Interleaving", () => {
    it("places video #1 at index 1 and subsequent videos at every 4th card (1, 5, 9, 13)", () => {
      const texts = Array.from({ length: 12 }, (_, i) => ({ id: `text-${i}`, type: "text" }));
      const videos = Array.from({ length: 4 }, (_, i) => ({ id: `video-${i}`, type: "video" }));

      const interleaved = interleaveItems(texts, videos, 1, 4);

      // Card 0 is breaking news text #1
      expect(interleaved[0].id).toBe("text-0");

      // Card 1 is video #0 (right below top headline)
      expect(interleaved[1].id).toBe("video-0");

      // Cards 2, 3, 4 are text
      expect(interleaved[2].id).toBe("text-1");
      expect(interleaved[3].id).toBe("text-2");
      expect(interleaved[4].id).toBe("text-3");

      // Card 5 is video #1
      expect(interleaved[5].id).toBe("video-1");

      // Cards 6, 7, 8 are text
      expect(interleaved[6].id).toBe("text-4");
      expect(interleaved[7].id).toBe("text-5");
      expect(interleaved[8].id).toBe("text-6");

      // Card 9 is video #2
      expect(interleaved[9].id).toBe("video-2");

      // Card 13 is video #3
      expect(interleaved[13].id).toBe("video-3");

      // Check top 3 items for guest users before InlineDataGate: 2 text + 1 video
      const top3 = interleaved.slice(0, 3);
      expect(top3.filter((x) => x.type === "text")).toHaveLength(2);
      expect(top3.filter((x) => x.type === "video")).toHaveLength(1);
    });

    it("handles empty video or text lists gracefully", () => {
      const texts = [{ id: "t1" }, { id: "t2" }];
      const videos = [{ id: "v1" }];

      expect(interleaveItems(texts, [])).toEqual(texts);
      expect(interleaveItems([], videos)).toEqual(videos);
    });
  });
});
