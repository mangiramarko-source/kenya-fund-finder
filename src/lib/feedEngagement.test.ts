import { describe, it, expect } from "vitest";
import {
  getDeterministicBaselineViews,
  getDeterministicBaselineUpvotes,
  formatViewCount,
  calculateRankScore,
} from "./feedEngagement";

describe("feedEngagement utilities", () => {
  describe("getDeterministicBaselineViews", () => {
    it("returns a finite, positive number for any post ID", () => {
      const views1 = getDeterministicBaselineViews("post-1");
      const views2 = getDeterministicBaselineViews("post-2");

      expect(Number.isFinite(views1)).toBe(true);
      expect(views1).toBeGreaterThanOrEqual(160);
      expect(Number.isFinite(views2)).toBe(true);
      expect(views2).toBeGreaterThanOrEqual(160);
    });

    it("is completely deterministic given the same inputs", () => {
      const a = getDeterministicBaselineViews("post-fixed-id", "2026-11-01T00:00:00Z", 10, 2);
      const b = getDeterministicBaselineViews("post-fixed-id", "2026-11-01T00:00:00Z", 10, 2);
      expect(a).toBe(b);
    });

    it("scales up with engagement signals", () => {
      const base = getDeterministicBaselineViews("post-scale", "2026-11-01T00:00:00Z", 0, 0);
      const withEngagement = getDeterministicBaselineViews("post-scale", "2026-11-01T00:00:00Z", 50, 10);
      expect(withEngagement).toBeGreaterThan(base);
    });
  });

  describe("formatViewCount", () => {
    it("formats counts under 1,000 as integers", () => {
      expect(formatViewCount(0)).toBe("0");
      expect(formatViewCount(482)).toBe("482");
      expect(formatViewCount(999)).toBe("999");
    });

    it("formats counts between 1,000 and 9,999 with one decimal place", () => {
      expect(formatViewCount(1000)).toBe("1K");
      expect(formatViewCount(1200)).toBe("1.2K");
      expect(formatViewCount(4850)).toBe("4.9K");
    });

    it("formats counts between 10,000 and 999,999 rounded", () => {
      expect(formatViewCount(10000)).toBe("10K");
      expect(formatViewCount(24500)).toBe("25K");
      expect(formatViewCount(950000)).toBe("950K");
    });

    it("formats counts of 1,000,000 and above in millions", () => {
      expect(formatViewCount(1000000)).toBe("1M");
      expect(formatViewCount(2500000)).toBe("2.5M");
    });
  });

  describe("getDeterministicBaselineUpvotes", () => {
    it("returns positive, finite baseline upvotes", () => {
      const upvotes = getDeterministicBaselineUpvotes("story-123");
      expect(Number.isFinite(upvotes)).toBe(true);
      expect(upvotes).toBeGreaterThan(0);
    });
  });

  describe("calculateRankScore", () => {
    it("guards against Math.log10(0) evaluating to -Infinity or NaN", () => {
      const scoreZero = calculateRankScore({ upvotes: 0, likes: 0, comments: 0, views: 0 });
      expect(Number.isFinite(scoreZero)).toBe(true);
      expect(scoreZero).toBe(0); // log10(1) = 0
    });

    it("handles negative or non-finite inputs safely", () => {
      const safeScore = calculateRankScore({
        upvotes: -5,
        likes: NaN,
        comments: undefined,
        views: -100,
      });
      expect(Number.isFinite(safeScore)).toBe(true);
      expect(safeScore).toBe(0);
    });

    it("correctly weights upvotes, likes, comments, and logarithmic views", () => {
      // (10 * 3) + (5 * 2) + (2 * 2) + (log10(100) * 5)
      // 30 + 10 + 4 + (2 * 5) = 54
      const score = calculateRankScore({
        upvotes: 10,
        likes: 5,
        comments: 2,
        views: 100,
      });
      expect(score).toBeCloseTo(54, 4);
    });

    it("ensures higher engagement yields higher rank score", () => {
      const low = calculateRankScore({ upvotes: 2, likes: 1, comments: 0, views: 50 });
      const high = calculateRankScore({ upvotes: 25, likes: 40, comments: 15, views: 1200 });
      expect(high).toBeGreaterThan(low);
    });
  });
});
