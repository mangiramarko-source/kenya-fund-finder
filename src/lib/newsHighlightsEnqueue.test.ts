import { describe, expect, it } from "vitest";
import {
  newsHighlightsEnqueueResult,
  newsHighlightsIdempotencyKey,
  newsHighlightsOutboxRows,
} from "../../supabase/functions/_shared/news-highlights-enqueue";

describe("News Highlights ready-edition enqueue contract", () => {
  it("creates the same database-backed event key when a user opts in after an edition is ready", () => {
    const editionId = "edition-ready";
    const userId = "later-opt-in-user";

    expect(newsHighlightsOutboxRows(editionId, [])).toEqual([]);
    expect(newsHighlightsOutboxRows(editionId, [userId])).toEqual([{
      user_id: userId,
      category: "news_highlights",
      idempotency_key: "news_highlights:edition-ready:later-opt-in-user",
      payload: { edition_id: editionId },
    }]);
    expect(newsHighlightsIdempotencyKey(editionId, userId)).toBe("news_highlights:edition-ready:later-opt-in-user");
  });

  it("reports repeat and concurrent conflict outcomes without creating a second logical event", () => {
    expect(newsHighlightsEnqueueResult(1, 1)).toEqual({
      eligible_recipients: 1, newly_enqueued: 1, already_enqueued: 0,
    });
    expect(newsHighlightsEnqueueResult(1, 0)).toEqual({
      eligible_recipients: 1, newly_enqueued: 0, already_enqueued: 1,
    });
  });
});
