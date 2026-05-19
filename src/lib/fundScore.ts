import type { FundFromDB } from "@/lib/api";

/**
 * Kenya Fund Score — a 0–100 visual fingerprint for a fund.
 *
 * Four axes, each scored 0–25:
 *  - YIELD       Annual yield vs peer median in the same fund_type
 *  - COST        Inverse of management_fee (lower fee = higher score)
 *  - LIQUIDITY   Withdrawal speed + accessibility (low min investment)
 *  - TRUST       CMA licence, fund age, AUM disclosed, manager tenure
 *
 * COMPLIANCE: the score is shown per-fund. We never sort/rank funds by it
 * on user-facing surfaces. No "TOP" labels.
 */
export interface FundScore {
  total: number;          // 0..100
  yield: number;          // 0..25
  cost: number;           // 0..25
  liquidity: number;      // 0..25
  trust: number;          // 0..25
  band: "excellent" | "strong" | "fair" | "limited";
}

const clamp = (n: number, lo = 0, hi = 25) => Math.max(lo, Math.min(hi, n));

function scoreYield(fund: FundFromDB, peerMedian: number | null): number {
  if (!isFinite(fund.annual_yield)) return 0;
  if (peerMedian == null || peerMedian <= 0) {
    // Fallback: anything 10%+ counts as decent for KE MMFs
    return clamp((fund.annual_yield / 15) * 25);
  }
  // 1.0x peer = 18, 1.2x peer = 25
  const ratio = fund.annual_yield / peerMedian;
  return clamp((ratio - 0.5) * (25 / 0.7));
}

function scoreCost(fund: FundFromDB): number {
  // 0% fee = 25, 1% = 20, 2% = 12, 3%+ = 4
  const f = Math.max(0, fund.management_fee || 0);
  if (f <= 0) return 25;
  return clamp(25 - f * 8);
}

function scoreLiquidity(fund: FundFromDB): number {
  // Withdrawal: 1 day = 15pts, 2 = 12, 3 = 9, 4-7 = 5, 7+ = 2
  const days = fund.withdrawal_days ?? 3;
  let liqPts = 2;
  if (days <= 1) liqPts = 15;
  else if (days <= 2) liqPts = 12;
  else if (days <= 3) liqPts = 9;
  else if (days <= 7) liqPts = 5;
  // Minimum investment accessibility, up to 10pts
  const min = fund.minimum_investment || 0;
  let minPts = 0;
  if (min <= 100) minPts = 10;
  else if (min <= 1000) minPts = 9;
  else if (min <= 5000) minPts = 7;
  else if (min <= 10000) minPts = 5;
  else if (min <= 50000) minPts = 3;
  else minPts = 1;
  return clamp(liqPts + minPts);
}

function scoreTrust(fund: FundFromDB): number {
  let pts = 0;
  if (fund.cma_licensed) pts += 12;
  if (fund.aum_kes && fund.aum_kes > 0) pts += 4;
  const tenure = fund.manager_years_active ?? null;
  if (tenure != null) {
    if (tenure >= 10) pts += 6;
    else if (tenure >= 5) pts += 4;
    else if (tenure >= 2) pts += 2;
  }
  if (fund.inception_date) {
    const ageYrs = (Date.now() - new Date(fund.inception_date).getTime()) / (365.25 * 86400000);
    if (ageYrs >= 10) pts += 3;
    else if (ageYrs >= 5) pts += 2;
    else if (ageYrs >= 2) pts += 1;
  }
  return clamp(pts);
}

function median(nums: number[]): number | null {
  const a = nums.filter((n) => isFinite(n)).sort((x, y) => x - y);
  if (a.length === 0) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function computePeerMedians(funds: FundFromDB[]): Record<string, number> {
  const groups: Record<string, number[]> = {};
  for (const f of funds) {
    (groups[f.fund_type] ??= []).push(f.annual_yield);
  }
  const out: Record<string, number> = {};
  for (const [k, arr] of Object.entries(groups)) {
    const m = median(arr);
    if (m != null) out[k] = m;
  }
  return out;
}

export function computeFundScore(
  fund: FundFromDB,
  peerMedians: Record<string, number> = {},
): FundScore {
  const peerMedian = peerMedians[fund.fund_type] ?? null;
  const y = scoreYield(fund, peerMedian);
  const c = scoreCost(fund);
  const l = scoreLiquidity(fund);
  const t = scoreTrust(fund);
  const total = Math.round(y + c + l + t);
  const band: FundScore["band"] =
    total >= 80 ? "excellent" : total >= 60 ? "strong" : total >= 40 ? "fair" : "limited";
  return {
    total,
    yield: Math.round(y),
    cost: Math.round(c),
    liquidity: Math.round(l),
    trust: Math.round(t),
    band,
  };
}

export const SCORE_BAND_COLOR: Record<FundScore["band"], string> = {
  excellent: "hsl(var(--accent))",
  strong: "hsl(152 55% 55%)",
  fair: "hsl(var(--warning))",
  limited: "hsl(var(--muted-foreground))",
};

export const SCORE_BAND_LABEL: Record<FundScore["band"], string> = {
  excellent: "Excellent",
  strong: "Strong",
  fair: "Fair",
  limited: "Limited data",
};
