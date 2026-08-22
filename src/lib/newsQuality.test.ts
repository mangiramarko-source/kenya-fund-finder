import { describe, expect, it } from "vitest";
import {
  categorizeNews,
  evaluateNewsQuality,
  parseNewsPublicationTime,
} from "../../supabase/functions/_shared/news-quality";
import { cleanNewsBody, cleanNewsTitle } from "../../supabase/functions/_shared/news-text";
import { getNewsPublishedTime } from "./newsDate";

const NOW = new Date("2026-08-17T12:00:00.000Z");

describe("news quality pipeline", () => {
  it("preserves a full publication timestamp and rejects stale discoveries", () => {
    expect(parseNewsPublicationTime("2026-08-16T09:45:00+03:00", NOW).iso)
      .toBe("2026-08-16T06:45:00.000Z");
    expect(parseNewsPublicationTime("2026-08-09T09:45:00+03:00", NOW).reason)
      .toBe("stale_publication_time");
  });

  it("handles exact date boundary cases for freshness", () => {
    // 1. Article from today (0 days old) -> accepted
    const today = parseNewsPublicationTime("2026-08-17T06:00:00.000Z", NOW);
    expect(today.reason).toBeNull();
    expect(today.iso).toBe("2026-08-17T06:00:00.000Z");

    // 2. Article from 3 days ago -> accepted
    const threeDaysAgo = parseNewsPublicationTime("2026-08-14T12:00:00.000Z", NOW);
    expect(threeDaysAgo.reason).toBeNull();

    // 3. Article exactly at 7 days boundary -> accepted
    const sevenDaysAgo = parseNewsPublicationTime("2026-08-10T12:00:00.000Z", NOW);
    expect(sevenDaysAgo.reason).toBeNull();

    // 4. Article several months old returned by Google News (e.g. 2025-10-28) -> rejected
    const monthsOld = parseNewsPublicationTime("2025-10-28T18:45:43.000Z", NOW);
    expect(monthsOld.reason).toBe("stale_publication_time");

    // 5. Malformed or missing date string -> rejected conservatively
    expect(parseNewsPublicationTime("", NOW).reason).toBe("invalid_publication_time");
    expect(parseNewsPublicationTime(null, NOW).reason).toBe("invalid_publication_time");
    expect(parseNewsPublicationTime("invalid-date-string", NOW).reason).toBe("invalid_publication_time");
  });

  it("orders by source publication time rather than ingestion time", () => {
    const oldStoryIngestedNow = {
      source_published_at: "2026-08-10T08:00:00.000Z",
      date_published: "2026-08-10",
      created_at: "2026-08-17T11:00:00.000Z",
    };
    const currentStory = {
      source_published_at: "2026-08-17T08:00:00.000Z",
      date_published: "2026-08-17",
      created_at: "2026-08-17T09:00:00.000Z",
    };
    expect(getNewsPublishedTime(currentStory)).toBeGreaterThan(getNewsPublishedTime(oldStoryIngestedNow));
  });

  it("cleans publisher suffixes and feed boilerplate", () => {
    expect(cleanNewsTitle("MPs seek safeguards in EABL stake sale - Business Daily", "Business Daily"))
      .toBe("MPs seek safeguards in EABL stake sale");
    expect(cleanNewsBody("Useful market context. The post Useful market context appeared first on Example."))
      .toBe("Useful market context.");
  });

  it("quarantines headline-only records", () => {
    const result = evaluateNewsQuality({
      title: "Safaricom updates customer pricing - Business Daily",
      summary: "Safaricom updates customer pricing - Business Daily",
      content: null,
      source: "Business Daily",
      url: "https://example.com/story",
      sourcePublishedAt: "2026-08-17T08:00:00.000Z",
    }, { now: NOW });
    expect(result.status).toBe("pending_review");
    expect(result.reasons).toContain("insufficient_content");
  });

  it("publishes substantive sourced records", () => {
    const result = evaluateNewsQuality({
      title: "Safaricom changes its data bundle schedule",
      summary: "Safaricom changed the availability period for one of its mobile data bundles, affecting customers who rely on the lower-priced package during the day.",
      content: null,
      source: "Business Daily",
      url: "https://example.com/story",
      sourcePublishedAt: "2026-08-17T08:00:00.000Z",
    }, { now: NOW });
    expect(result.status).toBe("published");
  });
});

describe("context-aware news categories", () => {
  it("does not classify ordinary policy or port stories as regulatory or fund news", () => {
    expect(categorizeNews("Government discusses a new agriculture policy for port operations"))
      .toBe("Market News");
  });

  it("classifies explicit financial contexts", () => {
    expect(categorizeNews("CBK issues a directive requiring banks to comply with new capital rules"))
      .toBe("Regulatory Updates");
    expect(categorizeNews("USD/KES exchange rate strengthens as the shilling gains"))
      .toBe("FX & Currency");
    expect(categorizeNews("Money market fund managers publish updated annual yields"))
      .toBe("Fund Announcements");
  });
});
