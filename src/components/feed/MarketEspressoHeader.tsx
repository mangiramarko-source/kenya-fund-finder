import { useState } from "react";
import { Coffee, TrendingUp, TrendingDown, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type AssetClassKey = "stocks" | "mmfs" | "treasury" | "fx" | "commodities";

interface AssetEspresso {
  key: AssetClassKey;
  label: string;
  icon: string;
  metricLabel: string;
  metricValue: string;
  metricDelta: string;
  isPositive: boolean;
  takeaway: string;
  linkText: string;
  linkHref: string;
}

const ESPRESSO_DATA: Record<AssetClassKey, AssetEspresso> = {
  stocks: {
    key: "stocks",
    label: "Stocks",
    icon: "📈",
    metricLabel: "NSE 20 Index",
    metricValue: "1,742.80",
    metricDelta: "+0.45%",
    isPositive: true,
    takeaway: "Safaricom ($SCOM) and Equity Bank dominated heavy turnover with net foreign buyer interest pushing equities higher.",
    linkText: "View Stock Board",
    linkHref: "/stocks",
  },
  mmfs: {
    key: "mmfs",
    label: "MMFs",
    icon: "💰",
    metricLabel: "Top Daily Yield",
    metricValue: "16.85%",
    metricDelta: "Steady",
    isPositive: true,
    takeaway: "Shilling funds remain prime destinations for cash preservation with leading fund managers holding annualized yields above 16%.",
    linkText: "Compare 35+ MMFs",
    linkHref: "/funds",
  },
  treasury: {
    key: "treasury",
    label: "T-Bills & Bonds",
    icon: "🏛️",
    metricLabel: "91-Day T-Bill",
    metricValue: "15.72%",
    metricDelta: "-8 bps",
    isPositive: false,
    takeaway: "CBK paper yields saw slight compression amid healthy subscription rates across the 91-day and 364-day tenors.",
    linkText: "Check Treasury Rates",
    linkHref: "/treasury",
  },
  fx: {
    key: "fx",
    label: "FX Rates",
    icon: "💱",
    metricLabel: "USD / KES",
    metricValue: "129.20",
    metricDelta: "-0.10 KES",
    isPositive: true,
    takeaway: "The Kenya Shilling held steady against the greenback, supported by commercial dollar flows and adequate import cover reserves.",
    linkText: "Live Currency Converter",
    linkHref: "/rates",
  },
  commodities: {
    key: "commodities",
    label: "Commodities",
    icon: "🌾",
    metricLabel: "Brent Crude",
    metricValue: "$74.30",
    metricDelta: "+1.2%",
    isPositive: false,
    takeaway: "Global crude stabilized while the Mombasa Tea Auction recorded consistent demand from key export destinations.",
    linkText: "Track Commodities",
    linkHref: "/commodities",
  },
};

const ASSET_KEYS: AssetClassKey[] = ["stocks", "mmfs", "treasury", "fx", "commodities"];

export function MarketEspressoHeader() {
  const [activeAsset, setActiveAsset] = useState<AssetClassKey>("stocks");
  const current = ESPRESSO_DATA[activeAsset];

  return (
    <div className="mb-5 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all dark:bg-card/90">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Coffee className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-tight text-foreground">60s Market Espresso</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-2.5 w-2.5" /> Quick Summary
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Kenya markets snapshot across all 5 key asset classes</p>
          </div>
        </div>

        <span className="hidden sm:inline-block text-[11px] font-semibold text-muted-foreground/80">
          Daily Digest
        </span>
      </div>

      {/* Asset Switcher Pills */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-3">
        {ASSET_KEYS.map((key) => {
          const item = ESPRESSO_DATA[key];
          const isActive = activeAsset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveAsset(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "border border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Asset Summary Card */}
      <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 transition-all">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{current.icon}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {current.label} Benchmark
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold text-foreground">{current.metricValue}</span>
                <span className="text-xs text-muted-foreground">{current.metricLabel}</span>
              </div>
            </div>
          </div>

          {/* Metric delta badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              current.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {current.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {current.metricDelta}
          </span>
        </div>

        <p className="text-xs text-foreground/90 leading-relaxed font-medium">
          {current.takeaway}
        </p>

        <div className="mt-2.5 pt-2 border-t border-border/40 flex justify-end">
          <Link
            to={current.linkHref}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            <span>{current.linkText}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
