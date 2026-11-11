import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  Landmark,
  ArrowUpRight,
} from "lucide-react";
import type { StockScorecardResult } from "@/lib/stockFundamentalScorecard";
import { StockSnowflakeRadar } from "@/components/stocks/StockSnowflakeRadar";

interface StockFundamentalAnalysisCardProps {
  scorecard: StockScorecardResult;
}

const TONE_BADGE_CLASSES: Record<StockScorecardResult["tone"], string> = {
  emerald:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25",
  amber:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
};

export const StockFundamentalAnalysisCard: React.FC<
  StockFundamentalAnalysisCardProps
> = ({ scorecard }) => {
  const [showAllChecks, setShowAllChecks] = useState(false);
  const { metrics, pillars } = scorecard;

  const discount = metrics.valuationDiscountPercent;
  const isUndervalued = discount != null && discount >= 10;
  const isOvervalued = discount != null && discount <= -15;

  // Compute visual bar position for Price vs Fair Value
  const maxValBar =
    metrics.fairValueEstimate != null
      ? Math.max(metrics.price, metrics.fairValueEstimate) * 1.2
      : metrics.price * 1.25;
  const priceBarPct = Math.min(95, Math.max(8, (metrics.price / maxValBar) * 100));
  const fairBarPct =
    metrics.fairValueEstimate != null
      ? Math.min(95, Math.max(8, (metrics.fairValueEstimate / maxValBar) * 100))
      : null;

  const visibleChecks = showAllChecks
    ? scorecard.checks
    : scorecard.checks.slice(0, 4);

  return (
    <section
      id="5-pillar-analysis"
      aria-label={`${scorecard.symbol} 5-Pillar Fundamental Scorecard`}
      className="scroll-mt-20 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-5 shadow-xs"
    >
      {/* ─── 1. Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
            NSE 5-Pillar Fundamental Analysis
          </h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap shrink-0">
            {scorecard.sectorLabel.replace(/^NSE\s+/i, "")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide ${
              TONE_BADGE_CLASSES[scorecard.tone]
            }`}
          >
            <span>{scorecard.scoreText}</span>
            <span>·</span>
            <span>{scorecard.ratingLabel}</span>
          </span>
          {scorecard.unverifiedCount > 0 && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground whitespace-nowrap shrink-0 border border-border/50"
              title={`${scorecard.unverifiedCount} checkpoints pending verified audited annual company disclosures`}
            >
              {scorecard.unverifiedCount} Disclosures Pending
            </span>
          )}
        </div>
      </div>

      {/* ─── 2. Snowflake Radar + Quantitative Thesis & Valuation Gauge ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: 5-Petal Snowflake Radar */}
        <div className="md:col-span-5 flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border/50 p-3">
          <StockSnowflakeRadar
            pillars={pillars}
            tone={scorecard.tone}
            size="lg"
            className="w-44 h-44 text-foreground"
          />
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Val <strong className="text-foreground">{pillars.value}/6</strong>
            </span>
            <span>
              Inc <strong className="text-foreground">{pillars.income}/6</strong>
            </span>
            <span>
              Qlt <strong className="text-foreground">{pillars.quality}/6</strong>
            </span>
            <span>
              Hlt <strong className="text-foreground">{pillars.health}/6</strong>
            </span>
            <span>
              Mom <strong className="text-foreground">{pillars.momentum}/6</strong>
            </span>
          </div>
        </div>

        {/* Right: Thesis, Price vs Fair Value Gauge & Peer Multiples */}
        <div className="md:col-span-7 space-y-4">
          <p className="text-[13.5px] sm:text-sm text-foreground/90 leading-relaxed">
            {scorecard.summaryThesis}
          </p>

          {/* Fair Value vs Current Price Bar (Simply Wall St style) */}
          {metrics.fairValueEstimate != null && fairBarPct != null ? (
            <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-emerald-500" />
                  Price vs. Estimated Fair Value
                </span>
                <span
                  className={`font-extrabold px-2 py-0.5 rounded-md text-[11px] ${
                    isUndervalued
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : isOvervalued
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {discount != null && discount > 0
                    ? `${discount.toFixed(1)}% Undervalued`
                    : discount != null && discount < 0
                    ? `${Math.abs(discount).toFixed(1)}% Above Fair Value`
                    : "Near Fair Value"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Share Price</span>
                  <span className="font-bold tabular-nums text-foreground">
                    KES {metrics.price.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/80 transition-all"
                    style={{ width: `${priceBarPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">
                    Peer & Book Fair Value Model
                  </span>
                  <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    KES {metrics.fairValueEstimate.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${fairBarPct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-3 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Scale className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Fair Value Model: <strong className="text-foreground">Audited Book Value / EPS disclosure pending</strong>
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                Observable Multiples Only
              </span>
            </div>
          )}

          {/* 3-Column Peer Multiple Benchmarks */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                P/E vs Sector
              </p>
              <p className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">
                {metrics.peRatio != null ? `${metrics.peRatio.toFixed(1)}x` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Peer: {metrics.sectorMedianPe.toFixed(1)}x
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                P/B Ratio
              </p>
              <p className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">
                {metrics.pbRatio != null ? `${metrics.pbRatio.toFixed(2)}x` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Peer: {metrics.sectorMedianPb.toFixed(2)}x
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Return (ROE)
              </p>
              <p className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">
                {metrics.roe != null ? `${metrics.roe.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Peer: {metrics.sectorMedianRoe.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Kenyan Investor Lens: Stock Yield vs. Money Market Fund (MMF) Benchmark ─── */}
      {metrics.dividendYield != null && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Landmark className="h-3.5 w-3.5 text-emerald-500" />
              <span>Kenyan Opportunity Cost: {scorecard.symbol} vs. {metrics.mmfBenchmarkName}</span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>Compare MMF yields ({metrics.mmfBenchmarkYield.toFixed(1)}%)</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-2 flex items-center justify-between sm:block">
              <span className="text-muted-foreground block text-[11px]">
                Cash Dividend Yield
              </span>
              <span className="font-extrabold text-sm tabular-nums text-foreground">
                {metrics.dividendYield.toFixed(1)}% p.a.
              </span>
            </div>

            <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-2 flex items-center justify-between sm:block">
              <span className="text-muted-foreground block text-[11px]">
                Total Earnings Yield (E/P)
              </span>
              <span className="font-extrabold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                {metrics.earningsYield != null
                  ? `${metrics.earningsYield.toFixed(1)}% p.a.`
                  : "—"}
              </span>
            </div>

            <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-2 flex items-center justify-between sm:block">
              <span className="text-muted-foreground block text-[11px]">
                {metrics.mmfBenchmarkName}
              </span>
              <span className="font-extrabold text-sm tabular-nums text-foreground">
                ~{metrics.mmfBenchmarkYield.toFixed(1)}% p.a.
              </span>
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {metrics.earningsYield != null &&
            metrics.earningsYield >= metrics.mmfBenchmarkYield
              ? `${scorecard.symbol}'s total earnings yield (${metrics.earningsYield.toFixed(1)}%) exceeds the ${metrics.mmfBenchmarkYield.toFixed(1)}% benchmark (${metrics.mmfBenchmarkName})—paying ${metrics.dividendYield.toFixed(1)}% in cash dividends while retaining ${100 - (metrics.payoutRatio ?? 45)}% of profits to compound book value.`
              : `${scorecard.symbol}'s cash dividend (${metrics.dividendYield.toFixed(1)}%) is ${Math.abs(metrics.mmfDividendSpread ?? 0).toFixed(1)}% below the top MMF benchmark (${metrics.mmfBenchmarkName} at ~${metrics.mmfBenchmarkYield.toFixed(1)}%), meaning investors rely on share price appreciation and earnings growth to beat cash funds.`}
          </p>
        </div>
      )}

      {/* ─── 4. Deterministic 5-Pillar Check Breakdown ─── */}
      {scorecard.checks.length > 0 && (
        <div className="space-y-2.5 border-t border-border/60 pt-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Automated Quantitative Checks ({scorecard.passedScore}/{scorecard.evaluatedCount} Verified Passed
              {scorecard.unverifiedCount > 0 && (
                <span className="font-normal normal-case text-muted-foreground">
                  {" "}· {scorecard.unverifiedCount} Pending Disclosure
                </span>
              )}
              )
            </h3>
            {scorecard.checks.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllChecks((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>{showAllChecks ? "Show fewer" : `View all ${scorecard.checks.length} checks`}</span>
                {showAllChecks ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visibleChecks.map((check) => {
              const isInsufficient = check.status === "insufficient_data";
              return (
                <div
                  key={check.id}
                  className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                    isInsufficient
                      ? "border-dashed border-border/60 bg-muted/10 opacity-75"
                      : "border-border/60 bg-muted/20"
                  }`}
                >
                  {check.status === "pass" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : check.status === "watch" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : isInsufficient ? (
                    <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <MinusCircle className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                        {check.pillar}
                      </span>
                      {isInsufficient && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/40">
                          Pending Disclosure
                        </span>
                      )}
                      <p className="text-xs font-bold text-foreground leading-snug">
                        {check.title}
                      </p>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {check.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
