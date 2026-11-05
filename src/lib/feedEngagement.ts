/**
 * Deterministic Feed Engagement & View Metric Utilities
 *
 * Provides SSR-safe deterministic baseline view counts, view count formatting,
 * and ranking score calculation for Market News and feed items.
 */

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculates a realistic, deterministic baseline view count for a feed item
 * based on its ID, publication timestamp, and engagement signals.
 */
export function getDeterministicBaselineViews(
  postId: string,
  publishedAt?: string | Date | number | null,
  likesCount = 0,
  commentsCount = 0
): number {
  const hash = hashString(postId || "news-item");
  const baseRandom = 160 + (hash % 620); // Range 160 - 779

  // Calculate age-based readership growth
  let ageGrowth = 0;
  if (publishedAt) {
    try {
      const pubTime = new Date(publishedAt).getTime();
      if (!Number.isNaN(pubTime)) {
        const hoursAgo = Math.max(1, (Date.now() - pubTime) / (1000 * 60 * 60));
        // Gradual growth over first 72 hours, capped at 1,850 views
        ageGrowth = Math.min(Math.floor(hoursAgo * 16), 1850);
      }
    } catch {
      ageGrowth = 0;
    }
  }

  // Engagement readership multiplier
  const engagementMultiplier = (Math.max(0, Number(likesCount) || 0) * 18) +
    (Math.max(0, Number(commentsCount) || 0) * 32);

  const total = baseRandom + ageGrowth + engagementMultiplier;
  return Number.isFinite(total) && total > 0 ? Math.floor(total) : 160;
}

/**
 * Formats a raw numeric view count into clean, human-friendly badges (e.g. 480, 1.4K, 25K).
 */
export function formatViewCount(views: number): string {
  const safeViews = Number.isFinite(views) ? Math.max(0, views) : 0;
  if (safeViews < 1000) {
    return safeViews.toLocaleString();
  }
  if (safeViews < 10000) {
    const thousands = Math.round(safeViews / 100) / 10;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  if (safeViews < 1000000) {
    return `${Math.round(safeViews / 1000)}K`;
  }
  const millions = Math.round(safeViews / 100000) / 10;
  return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
}

/**
 * Calculates deterministic default upvote baseline so items have community signals
 */
export function getDeterministicBaselineUpvotes(
  postId: string,
  likesCount = 0
): number {
  const hash = hashString(postId || "news-item");
  const base = (hash % 11) + 1; // Range 1 - 11
  const fromLikes = Math.floor(Math.max(0, Number(likesCount) || 0) * 0.35);
  return base + fromLikes;
}

/**
 * Guards ranking formula mathematics against -Infinity, NaN, or non-finite outputs.
 * Formula: (upvotes * 3) + (likes * 2) + (comments * 2) + (log10(max(views, 1)) * 5)
 */
export function calculateRankScore({
  upvotes = 0,
  likes = 0,
  comments = 0,
  views = 0,
}: {
  upvotes?: number;
  likes?: number;
  comments?: number;
  views?: number;
}): number {
  const safeUpvotes = Number.isFinite(upvotes) ? Math.max(0, upvotes) : 0;
  const safeLikes = Number.isFinite(likes) ? Math.max(0, likes) : 0;
  const safeComments = Number.isFinite(comments) ? Math.max(0, comments) : 0;
  const safeViews = Number.isFinite(views) ? Math.max(0, views) : 0;

  const logViews = Math.log10(Math.max(Number(safeViews) || 0, 1));
  const rankScore = (safeUpvotes * 3) + (safeLikes * 2) + (safeComments * 2) + (logViews * 5);
  return Number.isFinite(rankScore) ? rankScore : 0;
}
