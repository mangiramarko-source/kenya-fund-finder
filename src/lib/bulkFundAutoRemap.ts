/**
 * Pure planner for the bulk-paste "auto-remap NEW rows" action.
 *
 * Why this exists as its own module:
 *   - The component used to inline this logic, which made two real bugs
 *     impossible to unit-test:
 *       1. Two NEW rows could both grab the same existing fund_id.
 *       2. The toast description could drift from the actual outcome.
 *   - Extracting to a pure function lets us assert dedupe + counts + collision
 *     reporting independently of React.
 *
 * Disambiguation gate (matches BulkFundPasteVerify):
 *   - Same fund_type
 *   - Same yield_unit exactly (% / KES / USD / GBP all distinct)
 *   - Manager similarity ≥ minSim (default 0.5)
 *
 * Collision rules:
 *   - Funds already linked by `acceptedFundId` or hard-matched by the matcher
 *     are reserved up-front.
 *   - When multiple eligible NEW rows want the same target, the highest
 *     similarity wins; the loser is recorded as a collision and stays NEW.
 */

import type { ExistingFund, MatchInfo } from "@/lib/bulkFundMatcher";
import { similarity, unitClass } from "@/lib/bulkFundMatcher";

export interface PlannerRow {
  index: number;
  status: "ok" | "unparsed" | "category-missing";
  manager: string;
  fund_type: string | null;
  yield_unit: string | null;
}

export interface PlannerInput {
  row: PlannerRow;
  /** True when the user has chosen to ignore this row. */
  skipped: boolean;
  /** Existing accepted fund_id (manual remap or earlier auto-link). */
  acceptedFundId?: string;
  /** Match info from `matchRow`. */
  match?: MatchInfo;
}

export interface AutoRemapLink {
  rowIndex: number;
  fundId: string;
  fund: ExistingFund;
  similarity: number;
}

export interface AutoRemapCollision {
  rowIndex: number;
  manager: string;
  fund_type: string;
  yield_unit: string;
  /** The fund the loser wanted but couldn't claim. */
  targetFund: ExistingFund;
  /** Similarity the loser would have used. */
  similarity: number;
  /** Why we didn't link them: another row with a higher score got it first,
   *  or the fund was already accepted/exact-matched elsewhere. */
  reason: "lost-to-higher-similarity" | "already-accepted-elsewhere" | "already-exact-matched";
}

export interface AutoRemapPlan {
  links: AutoRemapLink[];
  collisions: AutoRemapCollision[];
  skippedLowSim: number;
  skippedClaimed: number;
  /** Number of NEW rows that had no candidate at all. */
  skippedNoCandidate: number;
  minSim: number;
}

export const DEFAULT_MIN_SIM = 0.5;

function bestCandidate(row: PlannerRow, existing: ExistingFund[]): { fund: ExistingFund; sim: number } | null {
  if (row.status !== "ok" || !row.fund_type || !row.yield_unit) return null;
  let best: { fund: ExistingFund; sim: number } | null = null;
  for (const f of existing) {
    if (f.fund_type !== row.fund_type) continue;
    if (f.yield_unit !== row.yield_unit) continue; // strict, not unit-class
    const sim = similarity(f.manager, row.manager);
    if (!best || sim > best.sim) best = { fund: f, sim };
  }
  return best;
}

export function planAutoRemap(
  rows: PlannerInput[],
  existing: ExistingFund[],
  minSim: number = DEFAULT_MIN_SIM,
): AutoRemapPlan {
  // Pre-claim every fund_id already spoken for (accepted or exact-matched).
  const claimed = new Map<string, "accepted" | "exact">();
  for (const r of rows) {
    if (r.acceptedFundId) claimed.set(r.acceptedFundId, "accepted");
    else if (r.match?.kind === "matched" && r.match.fund) claimed.set(r.match.fund.id, "exact");
  }

  // Eligible NEW rows ranked by descending candidate similarity so the
  // strongest signal wins any tie on the same fund.
  const ranked = rows
    .filter((r) => !r.skipped && !r.acceptedFundId && r.match?.kind === "new")
    .map((r) => ({ r, cand: bestCandidate(r.row, existing) }))
    .sort((a, b) => (b.cand?.sim ?? -1) - (a.cand?.sim ?? -1));

  const links: AutoRemapLink[] = [];
  const collisions: AutoRemapCollision[] = [];
  let skippedLowSim = 0;
  let skippedClaimed = 0;
  let skippedNoCandidate = 0;

  for (const { r, cand } of ranked) {
    if (!cand) { skippedNoCandidate++; continue; }
    if (cand.sim < minSim) { skippedLowSim++; continue; }
    const claimType = claimed.get(cand.fund.id);
    if (claimType) {
      skippedClaimed++;
      collisions.push({
        rowIndex: r.row.index,
        manager: r.row.manager,
        fund_type: r.row.fund_type!,
        yield_unit: r.row.yield_unit!,
        targetFund: cand.fund,
        similarity: cand.sim,
        reason:
          claimType === "accepted" ? "already-accepted-elsewhere" :
          claimType === "exact"    ? "already-exact-matched"      :
          "lost-to-higher-similarity",
      });
      continue;
    }
    links.push({ rowIndex: r.row.index, fundId: cand.fund.id, fund: cand.fund, similarity: cand.sim });
    claimed.set(cand.fund.id, "accepted");
  }

  // Re-classify post-hoc: any collision whose claimer is one of OUR new links
  // is really a "lost-to-higher-similarity" event, not a pre-existing reservation.
  const linkedFundIds = new Set(links.map((l) => l.fundId));
  for (const c of collisions) {
    if (c.reason === "already-accepted-elsewhere" && linkedFundIds.has(c.targetFund.id)) {
      const winner = links.find((l) => l.fundId === c.targetFund.id);
      // If the winning link had higher similarity than this loser, mark it.
      if (winner && winner.similarity >= c.similarity) c.reason = "lost-to-higher-similarity";
    }
  }

  // Suppress unit-class accidental import (silences eslint unused warning if
  // anyone trims this later — kept here because the strict yield_unit gate
  // intentionally ignores unitClass and we want that documented in code).
  void unitClass;

  return { links, collisions, skippedLowSim, skippedClaimed, skippedNoCandidate, minSim };
}

/**
 * Format the toast title + description for a plan. Pure so the wording can
 * be regression-tested independently from React/sonner.
 */
export function formatAutoRemapToast(plan: AutoRemapPlan): {
  level: "success" | "info";
  title: string;
  description?: string;
} {
  const linked = plan.links.length;
  if (linked === 0) {
    const reasons: string[] = [];
    if (plan.skippedLowSim > 0) reasons.push(`${plan.skippedLowSim} below ${(plan.minSim * 100).toFixed(0)}% similarity`);
    if (plan.skippedClaimed > 0) reasons.push(`${plan.skippedClaimed} would collide with an already-linked fund`);
    return {
      level: "info",
      title: reasons.length
        ? `No safe matches — ${reasons.join(", ")}. Use Remap to link manually.`
        : "No NEW rows had a same fund-type + same yield-unit existing fund",
    };
  }
  const extras: string[] = [];
  if (plan.skippedLowSim > 0) extras.push(`${plan.skippedLowSim} below similarity gate`);
  if (plan.skippedClaimed > 0) extras.push(`${plan.skippedClaimed} duplicate-target rows left as NEW`);
  return {
    level: "success",
    title: `Auto-linked ${linked} row${linked === 1 ? "" : "s"} to existing funds`,
    description: extras.length
      ? `${extras.join(" · ")}. Review before syncing — click Remap on any row to change.`
      : "Review the matches before syncing — click Remap on any row to change.",
  };
}

/**
 * Sync-time guard. Returns a list of fund_ids that more than one row has
 * staged to write to. Empty list means safe to proceed.
 */
export interface DuplicateAssignment {
  fundId: string;
  rowIndices: number[];
}

export function detectDuplicateAcceptedFundIds(
  rows: { rowIndex: number; acceptedFundId?: string; skipped?: boolean }[],
): DuplicateAssignment[] {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    if (r.skipped) continue;
    if (!r.acceptedFundId) continue;
    const list = map.get(r.acceptedFundId) ?? [];
    list.push(r.rowIndex);
    map.set(r.acceptedFundId, list);
  }
  const dups: DuplicateAssignment[] = [];
  for (const [fundId, rowIndices] of map) {
    if (rowIndices.length > 1) dups.push({ fundId, rowIndices: rowIndices.sort((a, b) => a - b) });
  }
  return dups;
}
