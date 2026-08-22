import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Eye,
  Calendar,
  Sparkles,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { NormalizedInvestorBriefing, NormalizedMarketSnapshot, MeaningPoint } from "@/lib/newsBriefingMapper";
import { StockArticleMarketCard } from "@/components/stocks/StockArticleMarketCard";
import { MmfArticleMarketCard } from "@/components/news/MmfArticleMarketCard";
import { FxArticleMarketCard } from "@/components/news/FxArticleMarketCard";
import { CommodityArticleMarketCard } from "@/components/news/CommodityArticleMarketCard";

interface InvestorBriefingProps {
  briefing: NormalizedInvestorBriefing;
  heroImage?: string | null;
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  inlineTransparent?: boolean;
}

export const InvestorBriefing: React.FC<InvestorBriefingProps> = ({
  briefing,
  heroImage,
  onImageError,
}) => {
  const [showChart, setShowChart] = useState(false);

  return (
    <div className="space-y-6 font-sans text-foreground">
      {/* ─── Hero Image (if available) ─── */}
      {heroImage && (
        <div className="rounded-2xl overflow-hidden border border-border/80 bg-muted/30 shadow-sm">
          <img
            src={heroImage}
            alt={briefing.title}
            className="w-full aspect-[16/9] object-cover"
            onError={onImageError}
            loading="eager"
          />
        </div>
      )}

      {/* ─── 1. The Takeaway (Max 1–2 short paragraphs: What happened) ─── */}
      <section className="space-y-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight tracking-tight">
          {briefing.title}
        </h1>

        {briefing.takeaway.length > 0 && (
          <div className="text-[16px] sm:text-[17px] text-foreground/90 leading-relaxed space-y-3 font-normal">
            {briefing.takeaway.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        )}
      </section>

      {/* ─── 2. Why This Matters (Max 1–2 short paragraphs) ─── */}
      {briefing.whyThisMatters.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
              Why This Matters
            </h2>
          </div>
          <div className="text-[15px] sm:text-[16px] text-foreground/90 leading-relaxed space-y-2 font-normal">
            {briefing.whyThisMatters.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. Market Snapshot (Compact Visual Stock / MMF / FX / Commodity Card) ─── */}
      {briefing.marketSnapshot && (
        <MarketSnapshotCard
          snapshot={briefing.marketSnapshot}
          showChart={showChart}
          onToggleChart={() => setShowChart((prev) => !prev)}
        />
      )}

      {/* ─── 4. What We Know (Short bullets of verified source facts only) ─── */}
      {briefing.whatWeKnow.length > 0 && (
        <section className="space-y-3 border-t border-border/70 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              What We Know
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Confirmed Facts
            </span>
          </div>

          <ul className="space-y-2 pt-1">
            {briefing.whatWeKnow.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] leading-relaxed text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── 5. What It Could Mean (2–4 compact statements, strictly distinct from facts) ─── */}
      {briefing.whatItCouldMean.length > 0 && (
        <section className="space-y-3 border-t border-border/70 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              What It Could Mean
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              Interpretation
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {briefing.whatItCouldMean.map((item, idx) => (
              <MeaningRow key={idx} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ─── 6. What We Don't Know (Single consolidated guardrail box) ─── */}
      {briefing.whatWeDontKnow.length > 0 && (
        <section className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
              What We Don't Know
            </h2>
          </div>
          <ul className="space-y-2">
            {briefing.whatWeDontKnow.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[13px] sm:text-[14px] leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── 7. Watch Next (3–4 practical items) ─── */}
      {briefing.watchNext.length > 0 && (
        <section className="space-y-3 border-t border-border/70 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90 flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-500" />
              Watch Next
            </h2>
          </div>

          <ul className="space-y-2 pt-1">
            {briefing.watchNext.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] leading-relaxed text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── 8. Source Attribution Card ─── */}
      <section className="border-t border-border/70 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">Source:</span>
            {briefing.source.url && /^https?:\/\//i.test(briefing.source.url) ? (
              <a
                href={briefing.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>{briefing.source.name || briefing.source.sourceDomain || "Original Article"}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="font-semibold text-foreground/80">{briefing.source.name}</span>
            )}
          </div>

          {briefing.readTime && (
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {briefing.readTime}
            </span>
          )}
        </div>
      </section>

      {/* ─── 9. Company Timeline (Only for stock-linked stories) ─── */}
      {briefing.timeline && briefing.timeline.length > 0 && (
        <section className="border-t border-border/70 pt-6 pb-2 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
              Company Timeline
            </h2>
          </div>

          <div className="relative border-l-2 border-border ml-2 pl-4 space-y-4">
            {briefing.timeline.map((event, idx) => (
              <div key={idx} className={`relative ${idx > 0 ? "opacity-75 hover:opacity-100 transition-opacity" : ""}`}>
                <div className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background ${idx === 0 ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {event.label}
                  </p>
                  {event.badge && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {event.badge}
                    </span>
                  )}
                </div>
                <p className="text-[13px] sm:text-[14px] font-medium text-foreground mt-0.5 leading-snug">
                  {event.title}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ─── Compact Market Snapshot Card ───
const MarketSnapshotCard: React.FC<{
  snapshot: NormalizedMarketSnapshot;
  showChart: boolean;
  onToggleChart: () => void;
}> = ({ snapshot, showChart, onToggleChart }) => {
  const isUp = (snapshot.changePercent ?? 0) > 0;
  const isDown = (snapshot.changePercent ?? 0) < 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-foreground">
              {snapshot.symbolOrName}
            </span>
            {snapshot.fullName && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                {snapshot.fullName}
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-foreground tabular-nums tracking-tight mt-0.5">
            {snapshot.priceOrYield}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {snapshot.changeText && (
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                isUp
                  ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                  : isDown
                  ? "text-rose-600 bg-rose-500/10 dark:text-rose-400"
                  : "text-muted-foreground bg-muted"
              }`}
            >
              {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              <span>{snapshot.changeText}</span>
            </div>
          )}

          {snapshot.impactScore != null && (
            <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span>Impact {snapshot.impactScore}/5</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2.5">
        {snapshot.previousPriceOrRate ? (
          <div>
            <span>Previous: </span>
            <span className="font-semibold text-foreground">{snapshot.previousPriceOrRate}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {snapshot.assetType === "stock" && (
            <button
              type="button"
              onClick={onToggleChart}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>{showChart ? "Hide Chart" : "Show Chart"}</span>
              {showChart ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          {snapshot.href && (
            <Link
              to={snapshot.href}
              className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>{snapshot.assetType === "stock" ? "Stock Report" : "View Asset"}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {showChart && snapshot.rawStock && (
        <div className="pt-2">
          <StockArticleMarketCard stock={snapshot.rawStock} />
        </div>
      )}
    </div>
  );
};

// ─── Meaning Row Component ───
const MeaningRow: React.FC<{ item: MeaningPoint }> = ({ item }) => {
  const badgeClass =
    item.type === "positive"
      ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
      : item.type === "negative"
      ? "text-rose-600 bg-rose-500/10 dark:text-rose-400"
      : item.type === "unclear"
      ? "text-amber-600 bg-amber-500/10 dark:text-amber-400"
      : "text-muted-foreground bg-muted";

  return (
    <div className="flex items-start gap-2 text-[14px] sm:text-[15px] leading-relaxed">
      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5 ${badgeClass}`}>
        {item.label}:
      </span>
      <span className="text-foreground/90">{item.text}</span>
    </div>
  );
};
