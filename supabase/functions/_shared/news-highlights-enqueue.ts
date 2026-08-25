export interface NewsHighlightsOutboxRow {
  user_id: string;
  category: "news_highlights";
  idempotency_key: string;
  payload: { edition_id: string };
}

export interface NewsHighlightsEnqueueResult {
  eligible_recipients: number;
  newly_enqueued: number;
  already_enqueued: number;
}

/** A stable database-backed event identity for one edition and one recipient. */
export function newsHighlightsIdempotencyKey(editionId: string, userId: string): string {
  return `news_highlights:${editionId}:${userId}`;
}

/**
 * Keep row construction pure so the coordinator can reuse it for both a newly
 * built edition and an already-ready edition.
 */
export function newsHighlightsOutboxRows(editionId: string, userIds: string[]): NewsHighlightsOutboxRow[] {
  return userIds.map((userId) => ({
    user_id: userId,
    category: "news_highlights",
    idempotency_key: newsHighlightsIdempotencyKey(editionId, userId),
    payload: { edition_id: editionId },
  }));
}

export function newsHighlightsEnqueueResult(
  eligibleRecipients: number,
  newlyEnqueued: number,
): NewsHighlightsEnqueueResult {
  return {
    eligible_recipients: eligibleRecipients,
    newly_enqueued: newlyEnqueued,
    already_enqueued: Math.max(0, eligibleRecipients - newlyEnqueued),
  };
}
