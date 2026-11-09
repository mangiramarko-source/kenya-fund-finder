import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star,
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Check,
  Sparkles,
} from "lucide-react";
import type { Stock } from "@/types";
import type { FundFromDB } from "@/lib/api";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { usePortfolio, getCurrentValue, getPnLPercent } from "@/hooks/usePortfolio";

export interface WatchlistRawItem {
  id: string;
  item_type: string;
  item_id: string;
  item_name?: string;
}

export interface DesktopWatchlistPortfolioCardProps {
  watchlist: WatchlistRawItem[];
  stocks?: Stock[];
  funds?: FundFromDB[];
  rates?: any[];
  commodities?: any[];
  onToggleAsset?: (type: string, id: string, name: string, symbol?: string) => Promise<void> | void;
  onOpenCustomize?: () => void;
  compact?: boolean;
}

interface ResolvedWatchItem {
  id: string;
  rawId: string;
  type: "stock" | "fund" | "currency" | "commodity";
  symbol: string;
  name: string;
  priceLabel: string;
  subLabel: string;
  dayChangePct?: number;
  logoUrl?: string | null;
  manager?: string | null;
  currencyCode?: string;
  link: string;
}

const fmtKES = (val: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);

export const DesktopWatchlistPortfolioCard: React.FC<DesktopWatchlistPortfolioCardProps> = ({
  watchlist = [],
  stocks = [],
  funds = [],
  rates = [],
  commodities = [],
  onToggleAsset,
  onOpenCustomize,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"watchlist" | "portfolio">("watchlist");
  const [addingId, setAddingId] = useState<string | null>(null);

  // Portfolio hooks
  const { items: portfolioItems, totalValue, totalPnLPercent } = usePortfolio();

  // Matcher helper
  const matchItem = (item: WatchlistRawItem, type: string, id: string, symbolOrCode?: string, name?: string) => {
    if (item.item_type !== type) return false;
    const targetId = String(id || "").toLowerCase();
    const itemId = String(item.item_id || "").toLowerCase();
    const itemName = String(item.item_name || "").toLowerCase();

    if (itemId === targetId) return true;
    if (symbolOrCode && (itemId === symbolOrCode.toLowerCase() || itemName.includes(symbolOrCode.toLowerCase()))) {
      return true;
    }
    if (name && (itemName === name.toLowerCase() || itemId === name.toLowerCase())) {
      return true;
    }
    return false;
  };

  // Resolve watchlist items with rich data
  const resolvedWatchlist = useMemo<ResolvedWatchItem[]>(() => {
    if (!watchlist || watchlist.length === 0) return [];

    const items: ResolvedWatchItem[] = [];

    watchlist.forEach((w) => {
      if (w.item_type === "stock") {
        const s = stocks.find((st) => matchItem(w, "stock", st.id, st.symbol, st.name));
        if (s) {
          items.push({
            id: s.id,
            rawId: w.id,
            type: "stock",
            symbol: s.symbol,
            name: s.name,
            priceLabel: `KES ${s.price.toFixed(2)}`,
            subLabel: s.sector ? `${s.sector} · NSE` : "NSE Equity",
            dayChangePct: s.day_change_percent,
            logoUrl: s.logo_url,
            link: `/stocks/${s.symbol}`,
          });
        } else {
          items.push({
            id: w.id,
            rawId: w.id,
            type: "stock",
            symbol: (w.item_name || "STK").substring(0, 4).toUpperCase(),
            name: w.item_name || "Stock",
            priceLabel: "Live Tracking",
            subLabel: "NSE Equity",
            dayChangePct: 0,
            link: "/stocks",
          });
        }
      } else if (w.item_type === "fund") {
        const f = funds.find((fn) => matchItem(w, "fund", fn.id, fn.slug, fn.name));
        const yld = f?.effective_yield || f?.annual_yield || 0;
        if (f) {
          items.push({
            id: f.id,
            rawId: w.id,
            type: "fund",
            symbol: f.name.substring(0, 4).toUpperCase(),
            name: f.name,
            priceLabel: yld > 0 ? `${yld.toFixed(2)}% p.a.` : "Active Fund",
            subLabel: f.manager || "Money Market Fund",
            dayChangePct: f.daily_yield ? f.daily_yield * 100 : undefined,
            logoUrl: f.logo_url,
            manager: f.manager,
            link: f.slug ? `/compare/${f.slug}` : "/compare",
          });
        } else {
          items.push({
            id: w.id,
            rawId: w.id,
            type: "fund",
            symbol: (w.item_name || "MMF").substring(0, 4).toUpperCase(),
            name: w.item_name || "Money Market Fund",
            priceLabel: "Active Yield",
            subLabel: "Unit Trust",
            dayChangePct: undefined,
            link: "/compare",
          });
        }
      } else if (w.item_type === "currency") {
        const r = rates.find((rt) => matchItem(w, "currency", rt.id, rt.currency_code, rt.currency_name));
        if (r) {
          items.push({
            id: r.id || r.currency_code,
            rawId: w.id,
            type: "currency",
            symbol: `${r.currency_code}/KES`,
            name: r.currency_name || r.currency_code,
            priceLabel: `KES ${Number(r.rate).toFixed(2)}`,
            subLabel: "Exchange Rate",
            dayChangePct: r.day_change_percent,
            currencyCode: r.currency_code,
            link: "/rates",
          });
        } else {
          items.push({
            id: w.id,
            rawId: w.id,
            type: "currency",
            symbol: w.item_name || "FX/KES",
            name: w.item_name || "Foreign Currency",
            priceLabel: "CBK Rate",
            subLabel: "Exchange Rate",
            dayChangePct: 0,
            link: "/rates",
          });
        }
      } else if (w.item_type === "commodity") {
        const c = commodities.find((cm) => matchItem(w, "commodity", cm.id, cm.symbol, cm.name));
        if (c) {
          items.push({
            id: c.id,
            rawId: w.id,
            type: "commodity",
            symbol: c.symbol,
            name: c.name,
            priceLabel: `KES ${Number(c.price).toFixed(2)}`,
            subLabel: c.unit ? `Per ${c.unit}` : "Commodity",
            dayChangePct: c.day_change_percent,
            link: "/commodities",
          });
        } else {
          items.push({
            id: w.id,
            rawId: w.id,
            type: "commodity",
            symbol: w.item_name || "CMD",
            name: w.item_name || "Commodity",
            priceLabel: "Market Price",
            subLabel: "Commodity",
            dayChangePct: 0,
            link: "/commodities",
          });
        }
      }
    });

    return items;
  }, [watchlist, stocks, funds, rates, commodities]);

  // 3 Curated Live Example Assets for Empty State
  const exampleAssets = useMemo(() => {
    // 1. Safaricom Stock (uses bundled local logo so it never fails)
    const scom = stocks.find((s) => s.symbol === "SCOM") || {
      id: "scom-default",
      symbol: "SCOM",
      name: "Safaricom PLC",
      price: 36.2,
      day_change_percent: -2.92,
      logo_url: "/images/stocks/safaricom.png",
    };

    // 2. Top Performing Money Market Fund
    const bestMmf =
      funds.find((f) => f.slug?.includes("sanlam") || f.slug?.includes("lofty") || f.fund_type === "money_market") ||
      funds[0] || {
        id: "sanlam-mmf-default",
        name: "Sanlam Money Market Fund",
        manager: "Sanlam Investments",
        slug: "sanlam-money-market-fund",
        annual_yield: 17.5,
        effective_yield: 17.5,
        logo_url: null,
      };

    const mmfTitle = bestMmf.name
      .replace(/Money Market Fund/i, "MMF")
      .replace(/Fund/i, "")
      .trim();

    // 3. US Dollar FX
    const usd = rates.find((r) => r.currency_code === "USD") || {
      id: "usd-rate-default",
      currency_code: "USD",
      currency_name: "US Dollar",
      rate: 129.42,
      day_change_percent: 0.08,
    };

    return [
      {
        type: "stock" as const,
        id: scom.id,
        symbol: scom.symbol,
        title: scom.symbol,
        name: scom.name,
        displayMetric: `KES ${scom.price.toFixed(2)}`,
        subtitle: "Safaricom",
        logoUrl: scom.logo_url || "/images/stocks/safaricom.png",
        isAdded: watchlist.some((w) => matchItem(w, "stock", scom.id, scom.symbol, scom.name)),
        onAdd: async () => {
          if (onToggleAsset) {
            setAddingId(scom.id);
            try {
              await onToggleAsset("stock", scom.id, scom.name, scom.symbol);
            } finally {
              setAddingId(null);
            }
          }
        },
      },
      {
        type: "fund" as const,
        id: bestMmf.id,
        symbol: "MMF",
        title: mmfTitle || "Sanlam MMF",
        name: bestMmf.name,
        displayMetric: `${(bestMmf.annual_yield || (bestMmf as any).effective_yield || 16.5).toFixed(2)}% p.a.`,
        subtitle: "Daily Yield",
        logoUrl: bestMmf.logo_url,
        manager: bestMmf.manager,
        isAdded: watchlist.some((w) => matchItem(w, "fund", bestMmf.id, bestMmf.slug, bestMmf.name)),
        onAdd: async () => {
          if (onToggleAsset) {
            setAddingId(bestMmf.id);
            try {
              await onToggleAsset("fund", bestMmf.id, bestMmf.name, bestMmf.slug);
            } finally {
              setAddingId(null);
            }
          }
        },
      },
      {
        type: "currency" as const,
        id: usd.id || "USD",
        symbol: "USD/KES",
        title: "USD / KES",
        name: "US Dollar",
        displayMetric: `KES ${Number(usd.rate).toFixed(2)}`,
        subtitle: "CBK Rate",
        currencyCode: "USD",
        isAdded: watchlist.some((w) => matchItem(w, "currency", usd.id || "USD", "USD", "US Dollar")),
        onAdd: async () => {
          if (onToggleAsset) {
            setAddingId(usd.id || "USD");
            try {
              await onToggleAsset("currency", usd.id || "USD", "US Dollar", "USD");
            } finally {
              setAddingId(null);
            }
          }
        },
      },
    ];
  }, [stocks, funds, rates, watchlist, onToggleAsset]);

  const isWatchlistEmpty = resolvedWatchlist.length === 0;
  const isPortfolioEmpty = portfolioItems.length === 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-4">
      {/* Tab Switcher Header */}
      <div className="border-b border-border/50 pb-3">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/60">
          <button
            type="button"
            onClick={() => setActiveTab("watchlist")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "watchlist"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${activeTab === "watchlist" ? "text-amber-500 fill-amber-500" : ""}`} />
            <span>Watchlist</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "watchlist"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {watchlist.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "portfolio"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className={`w-3.5 h-3.5 ${activeTab === "portfolio" ? "text-emerald-500" : ""}`} />
            <span>Portfolio</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "portfolio"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {portfolioItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: WATCHLIST ─── */}
      {activeTab === "watchlist" && (
        <div className="space-y-3.5">
          {isWatchlistEmpty ? (
            /* Empty State with Benefits & 3 Live Quick-Add Examples */
            <div className="space-y-3.5">
              {/* Sleek Benefit Header */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground">Build Your Watchlist</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight">Track assets across Kenya's markets</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Live MMF yields &amp; NSE share quotes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">Custom price &amp; yield change alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span className="truncate">Personalized news &amp; market updates</span>
                  </div>
                </div>
              </div>

              {/* 3 Live Quick-Add Asset Examples */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] px-0.5">
                  <span className="font-extrabold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Quick Add Examples
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click + to track</span>
                </div>

                <div className="space-y-2">
                  {exampleAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <WatchlistAssetAvatar
                          type={asset.type}
                          symbol={asset.symbol}
                          name={asset.name}
                          logoUrl={asset.logoUrl}
                          manager={asset.manager}
                          currencyCode={asset.currencyCode}
                          size={34}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-foreground tracking-tight truncate">
                            {asset.title}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums truncate flex items-center gap-1 mt-0.5">
                            <span>{asset.displayMetric}</span>
                            <span className="text-muted-foreground font-normal text-[10px] truncate">
                              · {asset.subtitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={asset.isAdded || addingId === asset.id}
                        onClick={asset.onAdd}
                        title={asset.isAdded ? "Added to watchlist" : `Add ${asset.title} to watchlist`}
                        className={`h-7 px-2.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-all ${
                          asset.isAdded
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                            : "bg-foreground text-background hover:bg-emerald-600 hover:text-white"
                        }`}
                      >
                        {asset.isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : addingId === asset.id ? (
                          <span>...</span>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customize Button CTA */}
              <button
                type="button"
                onClick={onOpenCustomize}
                className="w-full py-2 rounded-xl border border-dashed border-border hover:border-emerald-500/50 hover:bg-muted/30 text-xs font-bold text-foreground flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>Browse All 40+ Funds &amp; Stocks</span>
              </button>
            </div>
          ) : (
            /* Populated Watchlist State with Official Logos & High Detail */
            <div className="space-y-3">
              <div className="space-y-1.5">
                {resolvedWatchlist.slice(0, 6).map((item) => {
                  const isPos = (item.dayChangePct || 0) >= 0;
                  return (
                    <Link
                      to={item.link}
                      key={item.rawId}
                      className="flex items-center justify-between p-2 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all group text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <WatchlistAssetAvatar
                          type={item.type}
                          symbol={item.symbol}
                          name={item.name}
                          logoUrl={item.logoUrl}
                          manager={item.manager}
                          currencyCode={item.currencyCode}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground tracking-tight group-hover:text-emerald-500 transition-colors truncate">
                            {item.symbol}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.name}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-foreground tabular-nums">{item.priceLabel}</div>
                        {item.dayChangePct != null ? (
                          <div
                            className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                              isPos
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isPos ? "+" : ""}
                            {item.dayChangePct.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground">{item.subLabel}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Bottom Navigation & Edit Links */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-semibold">
                <Link
                  to="/watchlist"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  <span>View All ({watchlist.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={onOpenCustomize}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Assets</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PORTFOLIO ─── */}
      {activeTab === "portfolio" && (
        <div className="space-y-3.5">
          {isPortfolioEmpty ? (
            /* Empty Portfolio State */
            <div className="space-y-3 text-center py-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <Briefcase className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">Track Your Investments</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Add your Money Market Funds, NSE shares, and FX to see daily compounding interest and total returns.
                </p>
              </div>

              <div className="pt-1">
                <Link
                  to="/portfolio"
                  className="w-full py-2 px-3 rounded-xl bg-foreground text-background hover:bg-emerald-600 hover:text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create My Portfolio</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Populated Portfolio Holdings List */
            <div className="space-y-3">
              {/* Portfolio Summary Card */}
              <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Total Net Worth
                  </span>
                  <div className="text-base font-extrabold text-foreground tabular-nums">
                    {fmtKES(totalValue)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Overall P&amp;L
                  </span>
                  <div
                    className={`text-xs font-extrabold flex items-center justify-end gap-1 ${
                      totalPnLPercent >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {totalPnLPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{totalPnLPercent >= 0 ? "+" : ""}{totalPnLPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Holdings Rows */}
              <div className="space-y-1.5">
                {portfolioItems.slice(0, 5).map((holding) => {
                  const val = getCurrentValue(holding);
                  const pnl = getPnLPercent(holding);
                  const isPos = pnl >= 0;

                  // Resolve holding visual type
                  const holdingType =
                    holding.asset_type === "mmf"
                      ? "fund"
                      : holding.asset_type === "fx"
                      ? "currency"
                      : (holding.asset_type as any);

                  return (
                    <div
                      key={holding.id}
                      onClick={() => navigate("/portfolio")}
                      className="flex items-center justify-between p-2 rounded-xl border border-border/60 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all cursor-pointer group text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <WatchlistAssetAvatar
                          type={holdingType}
                          symbol={holding.ticker || holding.asset_name.slice(0, 4).toUpperCase()}
                          name={holding.asset_name}
                          currencyCode={holding.ticker || undefined}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground tracking-tight group-hover:text-emerald-500 transition-colors truncate">
                            {holding.asset_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {holding.units.toLocaleString()} units · {holding.asset_type.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-foreground tabular-nums">{fmtKES(val)}</div>
                        <div
                          className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                            isPos
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {isPos ? "+" : ""}{pnl.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-semibold">
                <Link
                  to="/portfolio"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  <span>Manage Portfolio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/portfolio"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Holding</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
