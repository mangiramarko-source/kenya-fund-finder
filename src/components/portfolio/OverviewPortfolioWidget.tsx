import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortfolio, PortfolioItem, getCurrentValue, getPnLPercent } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { holdingOneDayPerformance } from "@/components/portfolio/PortfolioHoldingCard";
import OverviewAssetCard, { OverviewAssetCardProps } from "@/components/portfolio/OverviewAssetCard";
import { useUnifiedWatchlist } from "@/hooks/useUnifiedWatchlist";
import { useMarketData } from "@/components/home/MarketTicker";
import { fetchFunds, type FundFromDB } from "@/lib/api";
import { ArrowRight, Briefcase, Plus } from "lucide-react";

type WidgetTab = "all" | "portfolio" | "watchlist";

const fmtCurrency = (val: number, curr: "KES" | "USD" = "KES") =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);

const matchWatchlistItem = (
  item: { item_type: string; item_id: string; item_name?: string },
  type: string,
  id: string,
  symbolOrCode?: string,
  name?: string
) => {
  if (item.item_type !== type) return false;
  const targetId = String(id || "").toLowerCase();
  const itemId = String(item.item_id || "").toLowerCase();
  const itemName = String(item.item_name || "").toLowerCase();

  if (itemId === targetId) return true;
  if (
    symbolOrCode &&
    (itemId === symbolOrCode.toLowerCase() ||
      itemName.includes(symbolOrCode.toLowerCase()))
  )
    return true;
  if (
    name &&
    (itemName === name.toLowerCase() || itemId === name.toLowerCase())
  )
    return true;
  return false;
};

export default function OverviewPortfolioWidget() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WidgetTab>("all");
  const [funds, setFunds] = useState<FundFromDB[]>([]);

  // Portfolio hooks (pulls authenticated database rows or guest local storage)
  const { items: portfolioItems } = usePortfolio();
  const { changes: portfolioChanges } = usePortfolioChanges(portfolioItems);

  // Watchlist & Market hooks (pulls live stocks, rates, commodities, and user's saved items)
  const { items: watchlistItems } = useUnifiedWatchlist();
  const { stocks, rates, commodities } = useMarketData();

  useEffect(() => {
    fetchFunds()
      .then((data) => setFunds(data || []))
      .catch(() => setFunds([]));
  }, []);

  const isPortfolioEmpty = portfolioItems.length === 0;
  const isWatchlistEmpty = watchlistItems.length === 0;

  // Transform Real Portfolio Holdings into Unified Card Format
  const portfolioCards = useMemo<OverviewAssetCardProps[]>(() => {
    if (isPortfolioEmpty) {
      // Pull live real-time market data for Safaricom example holding
      const scom = stocks.find((s) => s.symbol === "SCOM");
      const currentPrice = scom?.price && scom.price > 0 ? scom.price : 15.25;
      const dayChangePct = scom?.day_change_percent != null ? scom.day_change_percent : 1.2;
      const dayChangeVal = scom?.day_change != null ? scom.day_change : 0.18;
      const units = 1000;
      const buyPrice = 14.55;
      const val = units * currentPrice;
      const pnlPct = ((currentPrice - buyPrice) / buyPrice) * 100;

      return [
        {
          type: "holding",
          title: "Safaricom PLC",
          subtitle: "SCOM",
          categoryLabel: "STOCKS",
          badgeLabel: "EXAMPLE",
          badgeTone: "amber",
          primaryValue: fmtCurrency(val),
          secondaryValue: `${units.toLocaleString()} shares · ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% overall`,
          statLabel: "1D Move",
          oneDay: {
            available: true,
            percent: dayChangePct,
            amount: dayChangeVal * units,
            unit: "KES",
          },
          assetType: "stock",
          onClick: () => navigate("/portfolio"),
        },
      ];
    }

    return portfolioItems.slice(0, 10).map((item) => {
      const val = getCurrentValue(item);
      const pnlPct = getPnLPercent(item);

      // Money Market Funds (MMFs) compound daily based on published annual yield
      if (item.asset_type === "mmf") {
        const yld = item.current_yield || 14.5;
        const dailyInterest = (val * (yld / 100)) / 365;
        return {
          type: "holding",
          title: item.asset_name,
          subtitle: item.ticker || "MMF",
          categoryLabel: "MMF",
          badgeLabel: "HOLDING",
          badgeTone: "emerald",
          primaryValue: fmtCurrency(val, "KES"),
          secondaryValue: `${item.units.toLocaleString()} units · ${yld.toFixed(2)}% p.a.`,
          statLabel: "Daily Interest",
          oneDay: {
            available: true,
            percent: yld,
            amount: dailyInterest,
            unit: "KES",
            amountSuffix: "/day",
          },
          assetType: "mmf",
          onClick: () => navigate("/portfolio"),
        };
      }

      // Stocks, FX, Fixed Income, and Commodities
      const change = portfolioChanges.find((c) => c.itemId === item.id);
      const perf = holdingOneDayPerformance(item, change);
      const category =
        item.asset_type === "fixed_income"
          ? "T-BILLS"
          : item.asset_type === "stock"
          ? "STOCKS"
          : item.asset_type === "fx" || item.asset_type === "currency"
          ? "FX"
          : item.asset_type.toUpperCase();

      return {
        type: "holding",
        title: item.asset_name,
        subtitle: item.ticker || item.asset_type.toUpperCase(),
        categoryLabel: category,
        badgeLabel: "HOLDING",
        badgeTone: "emerald",
        primaryValue: fmtCurrency(val, "KES"),
        secondaryValue: `${item.units.toLocaleString()} units · ${
          pnlPct >= 0 ? "+" : ""
        }${pnlPct.toFixed(1)}% overall`,
        statLabel: "1D Move",
        oneDay: {
          available: perf.available,
          percent: perf.percent,
          amount: perf.amount,
          unit: "KES",
        },
        assetType: item.asset_type,
        onClick: () => navigate("/portfolio"),
      };
    });
  }, [portfolioItems, portfolioChanges, isPortfolioEmpty, stocks, navigate]);

  // Transform Real Watchlist Assets into Unified Card Format (with Benchmark Fallbacks)
  const watchlistCards = useMemo<OverviewAssetCardProps[]>(() => {
    if (isWatchlistEmpty) {
      // Live Balanced 4-Asset Market Mix: Top Stocks (SCOM, EQTY) + Top Yielding MMF + USD/KES
      const scom = stocks.find((s) => s.symbol === "SCOM");
      const eqty = stocks.find((s) => s.symbol === "EQTY");
      const usd = rates.find((r) => r.currency_code === "USD");

      const topMmf = funds
        .filter((f) => (f.effective_yield || f.annual_yield || 0) > 0)
        .sort((a, b) => (b.effective_yield || b.annual_yield || 0) - (a.effective_yield || a.annual_yield || 0))[0];

      const scomPrice = scom?.price && scom.price > 0 ? scom.price : 15.25;
      const eqtyPrice = eqty?.price && eqty.price > 0 ? eqty.price : 42.50;
      const usdRate = usd?.rate && usd.rate > 0 ? usd.rate : 129.50;
      const usdPct = usd?.day_change_percent != null
        ? usd.day_change_percent
        : usd?.previous_rate && usd.previous_rate > 0
        ? ((usd.rate - usd.previous_rate) / usd.previous_rate) * 100
        : 0.05;

      const benchmarkCards: OverviewAssetCardProps[] = [
        {
          type: "watching",
          title: "Safaricom PLC",
          subtitle: "SCOM",
          categoryLabel: "STOCKS",
          badgeLabel: "MARKET",
          badgeTone: "sky",
          primaryValue: `KES ${scomPrice.toFixed(2)}`,
          secondaryValue: "NSE Equity · Telecommunications",
          statLabel: "1D Move",
          oneDay: {
            available: true,
            percent: scom?.day_change_percent ?? 1.2,
            amount: scom?.day_change ?? 0.18,
            unit: "KES",
          },
          assetType: "stock",
          onClick: () => navigate("/stocks/SCOM"),
        },
        {
          type: "watching",
          title: "Equity Group Holdings",
          subtitle: "EQTY",
          categoryLabel: "STOCKS",
          badgeLabel: "MARKET",
          badgeTone: "sky",
          primaryValue: `KES ${eqtyPrice.toFixed(2)}`,
          secondaryValue: "NSE Equity · Banking",
          statLabel: "1D Move",
          oneDay: {
            available: true,
            percent: eqty?.day_change_percent ?? 0.5,
            amount: eqty?.day_change ?? 0.25,
            unit: "KES",
          },
          assetType: "stock",
          onClick: () => navigate("/stocks/EQTY"),
        },
      ];

      if (topMmf) {
        const mmfYield = topMmf.effective_yield || topMmf.annual_yield || 14.85;
        benchmarkCards.push({
          type: "watching",
          title: topMmf.name,
          subtitle: topMmf.slug?.substring(0, 4).toUpperCase() || "MMF",
          categoryLabel: "MMF",
          badgeLabel: "MARKET",
          badgeTone: "sky",
          primaryValue: `${mmfYield.toFixed(2)}% p.a.`,
          secondaryValue: `${topMmf.fund_type_label || "Money Market Fund"} · CMA Yield`,
          statLabel: "Yield p.a.",
          oneDay: {
            available: true,
            percent: mmfYield,
            amount: null,
            unit: "%",
          },
          assetType: "fund",
          onClick: () => navigate(`/compare/${topMmf.slug || ""}`),
        });
      }

      benchmarkCards.push({
        type: "watching",
        title: "US Dollar / KES",
        subtitle: "USD/KES",
        categoryLabel: "FX",
        badgeLabel: "MARKET",
        badgeTone: "sky",
        primaryValue: `KES ${usdRate.toFixed(2)}`,
        secondaryValue: "Central Bank Official Rate",
        statLabel: "1D Move",
        oneDay: {
          available: true,
          percent: usdPct,
          amount: usd?.previous_rate ? Math.abs(usd.rate - usd.previous_rate) : null,
          unit: "KES",
        },
        assetType: "currency",
        onClick: () => navigate("/rates"),
      });

      return benchmarkCards;
    }

    return watchlistItems.slice(0, 10).map((item) => {
      // 1. Stock watchlist match
      if (item.item_type === "stock") {
        const stock = stocks.find((s) =>
          matchWatchlistItem(item, "stock", s.id, s.symbol, s.name)
        );
        const price = stock?.price ?? 0;
        const changePct = stock?.day_change_percent ?? 0;
        const changeVal = stock?.day_change ?? 0;
        return {
          type: "watching",
          title: stock?.name || item.item_name || "Stock",
          subtitle: stock?.symbol || item.item_name?.substring(0, 4).toUpperCase(),
          categoryLabel: "STOCKS",
          badgeLabel: "WATCHING",
          badgeTone: "sky",
          primaryValue: price > 0 ? `KES ${price.toFixed(2)}` : "Live Tracking",
          secondaryValue: stock?.sector ? `${stock.sector} · NSE` : "NSE Equity",
          statLabel: "1D Move",
          oneDay: {
            available: price > 0,
            percent: changePct,
            amount: changeVal !== 0 ? changeVal : null,
            unit: "KES",
          },
          assetType: "stock",
          onClick: () => navigate(`/stocks/${stock?.symbol || item.item_id}`),
        };
      }

      // 2. Fund / MMF watchlist match
      if (item.item_type === "fund") {
        const fund = funds.find((f) =>
          matchWatchlistItem(item, "fund", f.id, f.slug, f.name)
        );
        const yld = fund?.effective_yield || fund?.annual_yield || 0;
        return {
          type: "watching",
          title: fund?.name || item.item_name || "Fund",
          subtitle: fund?.name?.substring(0, 4).toUpperCase() || "MMF",
          categoryLabel: "MMF",
          badgeLabel: "WATCHING",
          badgeTone: "sky",
          primaryValue: yld > 0 ? `${yld.toFixed(2)}% p.a.` : "Active Fund",
          secondaryValue: fund?.fund_type_label || "Money Market Fund",
          statLabel: "Yield p.a.",
          oneDay: {
            available: yld > 0,
            percent: yld,
            amount: null,
            unit: "%",
          },
          assetType: "fund",
          onClick: () =>
            fund?.slug ? navigate(`/compare/${fund.slug}`) : navigate("/compare"),
        };
      }

      // 3. FX / Currency watchlist match
      if (item.item_type === "currency") {
        const rate = rates.find((r) =>
          matchWatchlistItem(item, "currency", r.id, r.currency_code, r.currency_name)
        );
        const currentRate = rate?.rate ?? 0;
        return {
          type: "watching",
          title: rate?.currency_name || item.item_name || "Foreign Exchange",
          subtitle: `${rate?.currency_code || "FX"}/KES`,
          categoryLabel: "FX",
          badgeLabel: "WATCHING",
          badgeTone: "sky",
          primaryValue: currentRate > 0 ? `KES ${currentRate.toFixed(2)}` : "CBK Rate",
          secondaryValue: "Exchange Rate",
          statLabel: "1D Move",
          oneDay: {
            available: rate != null && rate.day_change_percent != null,
            percent: rate?.day_change_percent ?? null,
            amount: null,
            unit: "KES",
          },
          assetType: "currency",
          onClick: () => navigate("/rates"),
        };
      }

      // 4. Commodity watchlist match
      if (item.item_type === "commodity") {
        const cmd = commodities.find((c) =>
          matchWatchlistItem(item, "commodity", c.id, c.symbol, c.name)
        );
        const price = cmd?.price ?? 0;
        return {
          type: "watching",
          title: cmd?.name || item.item_name || "Commodity",
          subtitle: cmd?.symbol || "CMD",
          categoryLabel: "COMMODITY",
          badgeLabel: "WATCHING",
          badgeTone: "sky",
          primaryValue: price > 0 ? `KES ${price.toFixed(2)}` : "Market Price",
          secondaryValue: cmd?.unit ? `Per ${cmd.unit}` : "Commodity Market",
          statLabel: "1D Move",
          oneDay: {
            available: cmd != null && cmd.day_change_percent != null,
            percent: cmd?.day_change_percent ?? null,
            amount: null,
            unit: "KES",
          },
          assetType: "commodity",
          onClick: () => navigate("/commodities"),
        };
      }

      // Generic fallback
      return {
        type: "watching",
        title: item.item_name || "Watched Asset",
        subtitle: item.item_type.toUpperCase(),
        categoryLabel: item.item_type.toUpperCase(),
        badgeLabel: "WATCHING",
        badgeTone: "sky",
        primaryValue: "Tracked",
        secondaryValue: "Market Asset",
        statLabel: "1D Move",
        oneDay: { available: false, percent: null },
        assetType: item.item_type,
        onClick: () => navigate("/watchlist"),
      };
    });
  }, [watchlistItems, isWatchlistEmpty, stocks, rates, commodities, funds, navigate]);

  // Combined cards based on selected tab and user data presence (Hybrid Stream)
  const displayCards = useMemo<OverviewAssetCardProps[]>(() => {
    if (activeTab === "portfolio") return portfolioCards;
    if (activeTab === "watchlist") return watchlistCards;

    // activeTab === "all":
    // 1. User with real portfolio but empty watchlist: show real holdings + 3 suggested benchmarks
    if (!isPortfolioEmpty && isWatchlistEmpty) {
      return [...portfolioCards.slice(0, 7), ...watchlistCards.slice(0, 3)];
    }
    // 2. User with real watchlist but empty portfolio: show demo holding + real watchlist
    if (isPortfolioEmpty && !isWatchlistEmpty) {
      return [...portfolioCards.slice(0, 1), ...watchlistCards.slice(0, 9)];
    }
    // 3. User with BOTH real portfolio and watchlist: strictly real user data (up to 10 total)
    if (!isPortfolioEmpty && !isWatchlistEmpty) {
      return [...portfolioCards, ...watchlistCards].slice(0, 10);
    }
    // 4. Guest with neither: show demo holding + suggested benchmarks
    return [...portfolioCards, ...watchlistCards];
  }, [activeTab, portfolioCards, watchlistCards, isPortfolioEmpty, isWatchlistEmpty]);

  const totalPortfolioCount = portfolioItems.length;
  const totalWatchlistCount = watchlistItems.length;
  const combinedCount = totalPortfolioCount + totalWatchlistCount;

  // Determine whether to show "See More" or "Add" in action card
  const isAllMore = combinedCount > 10;
  const isPortfolioMore = totalPortfolioCount > 10;
  const isWatchlistMore = totalWatchlistCount > 10;

  return (
    <div className="mb-6 space-y-3">
      {/* Header Row with Segmented Control on the Right */}
      <div className="flex items-center justify-between gap-2.5 px-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-1.5 shrink-0">
          <Briefcase className="h-4 w-4 text-[#00A651]" />
          <span>Portfolio &amp; Watchlist</span>
        </h2>

        {/* Segmented Pill Tabs on the Right */}
        <div className="inline-flex items-center bg-[#1c1c1f] border border-zinc-800/90 rounded-full p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              activeTab === "all"
                ? "bg-[#2c2c30] text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              activeTab === "portfolio"
                ? "bg-[#2c2c30] text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("watchlist")}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              activeTab === "watchlist"
                ? "bg-[#2c2c30] text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Watchlist
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Carousel */}
      <div className="flex overflow-x-auto gap-3.5 pb-2.5 -mx-4 px-4 scroll-px-4 md:mx-0 md:px-0 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {displayCards.map((card, idx) => (
          <OverviewAssetCard
            key={`${card.type}-${card.title}-${idx}`}
            {...card}
          />
        ))}

        {/* End-of-Carousel Quick Action Card */}
        <div className="w-[170px] sm:w-[180px] shrink-0 snap-start min-h-[148px]">
          {activeTab === "watchlist" ? (
            <Link
              to="/watchlist"
              className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[148px] bg-[#131316]/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-[#18181c] rounded-xl p-3 text-center transition-all group select-none"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                {isWatchlistMore ? <ArrowRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  {isWatchlistMore
                    ? `See More (${totalWatchlistCount - 10} more)`
                    : "Add to Watchlist"}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  {isWatchlistMore
                    ? "View full watchlist"
                    : "Track Stocks & Funds"}
                </div>
              </div>
            </Link>
          ) : activeTab === "portfolio" ? (
            <Link
              to="/portfolio"
              className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[148px] bg-[#131316]/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-[#18181c] rounded-xl p-3 text-center transition-all group select-none"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                {isPortfolioMore ? <ArrowRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {isPortfolioMore
                    ? `See More (${totalPortfolioCount - 10} more)`
                    : "Add Investment"}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  {isPortfolioMore
                    ? "View all portfolio"
                    : "Track MMF, Stocks & FX"}
                </div>
              </div>
            </Link>
          ) : (
            <Link
              to={isPortfolioEmpty ? "/portfolio" : "/watchlist"}
              className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[148px] bg-[#131316]/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-[#18181c] rounded-xl p-3 text-center transition-all group select-none"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                {isAllMore ? <ArrowRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {isAllMore
                    ? `See More (${combinedCount - 10} more)`
                    : "Add Asset"}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  {isAllMore
                    ? "View all holdings & markets"
                    : "Portfolio or Watchlist"}
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
