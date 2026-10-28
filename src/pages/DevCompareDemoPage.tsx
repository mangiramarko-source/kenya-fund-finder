import { useState } from "react";
import {
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  Star,
  Sparkles,
  Info,
  WalletCards,
  BadgePercent,
  Coins,
} from "lucide-react";
import {
  UniversalCompareProvider,
  useUniversalCompare,
  type CompareAssetCategory,
  type CompareItem,
} from "@/hooks/useUniversalCompare";
import UniversalCompareBar from "@/components/compare/UniversalCompareBar";
import UniversalCompareModal from "@/components/compare/UniversalCompareModal";

// ─── Formatters matching production ───
const formatNumber = (n: number, decimals = 2) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatVolume = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const formatMarketCap = (mc: number | null) => {
  if (mc == null) return "—";
  if (mc >= 1e12) return `KSh ${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `KSh ${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `KSh ${(mc / 1e6).toFixed(0)}M`;
  return `KSh ${mc.toLocaleString()}`;
};

// ─── Lightweight SVG Sparkline ───
const MiniSparkline = ({ trend = "up" }: { trend?: "up" | "down" | "flat" }) => {
  const stroke =
    trend === "up"
      ? "hsl(152 60% 42%)"
      : trend === "down"
      ? "hsl(0 72% 51%)"
      : "hsl(var(--muted-foreground))";
  const path =
    trend === "up"
      ? "M0,18 L14,16 L28,10 L42,12 L56,4"
      : trend === "down"
      ? "M0,6 L14,8 L28,14 L42,12 L56,18"
      : "M0,11 L14,10 L28,12 L42,11 L56,11";

  return (
    <svg width={56} height={22} className="overflow-visible shrink-0" aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Production Sample Data ───
const SAMPLE_FUNDS = [
  {
    id: "fund-kuza",
    name: "Kuza Asset MMF",
    manager: "Kuza Asset Management",
    annual_yield: 13.65,
    daily_yield: 13.02,
    management_fee: 1.5,
    minimum_investment: 1000,
    withdrawal_time: "1-2 days",
    diff: 0.12,
    bg: "bg-emerald-600",
    initials: "KZ",
  },
  {
    id: "fund-etica",
    name: "Etica Money Market Fund",
    manager: "Etica Capital",
    annual_yield: 14.12,
    daily_yield: 13.45,
    management_fee: 2.0,
    minimum_investment: 500,
    withdrawal_time: "Same day",
    diff: 0.25,
    bg: "bg-blue-600",
    initials: "ET",
  },
  {
    id: "fund-sanlam",
    name: "Sanlam Pesa MMF",
    manager: "Sanlam Investments",
    annual_yield: 12.85,
    daily_yield: 12.2,
    management_fee: 1.8,
    minimum_investment: 2500,
    withdrawal_time: "2-3 days",
    diff: -0.05,
    bg: "bg-indigo-600",
    initials: "SN",
  },
  {
    id: "fund-cic",
    name: "CIC Money Market Fund",
    manager: "CIC Asset Management",
    annual_yield: 12.4,
    daily_yield: 11.9,
    management_fee: 2.0,
    minimum_investment: 5000,
    withdrawal_time: "1-2 days",
    diff: 0.0,
    bg: "bg-purple-600",
    initials: "CI",
  },
];

const SAMPLE_STOCKS = [
  {
    id: "stock-scom",
    symbol: "SCOM",
    name: "Safaricom PLC",
    sector: "Telecom",
    price: 16.85,
    day_change: 0.25,
    day_change_percent: 1.51,
    pe_ratio: 11.4,
    dividend_yield: 7.2,
    volume: 3420000,
    market_cap: 675000000000,
    year_low: 13.5,
    year_high: 19.8,
    bg: "bg-emerald-600",
  },
  {
    id: "stock-eqty",
    symbol: "EQTY",
    name: "Equity Group Holdings",
    sector: "Banking",
    price: 43.5,
    day_change: -0.3,
    day_change_percent: -0.68,
    pe_ratio: 4.8,
    dividend_yield: 9.1,
    volume: 890000,
    market_cap: 164000000000,
    year_low: 36.0,
    year_high: 48.5,
    bg: "bg-rose-700",
  },
  {
    id: "stock-kcb",
    symbol: "KCB",
    name: "KCB Group PLC",
    sector: "Banking",
    price: 34.2,
    day_change: 0.8,
    day_change_percent: 2.4,
    pe_ratio: 4.2,
    dividend_yield: 8.8,
    volume: 1250000,
    market_cap: 109000000000,
    year_low: 28.5,
    year_high: 38.0,
    bg: "bg-blue-600",
  },
  {
    id: "stock-eabl",
    symbol: "EABL",
    name: "East African Breweries",
    sector: "Manufacturing",
    price: 152.0,
    day_change: 0.0,
    day_change_percent: 0.0,
    pe_ratio: 13.9,
    dividend_yield: 5.6,
    volume: 210000,
    market_cap: 120000000000,
    year_low: 125.0,
    year_high: 168.0,
    bg: "bg-amber-700",
  },
];

const SAMPLE_RATES = [
  { id: "fx-usd", code: "USD", name: "US Dollar", rate: 129.45, prev: 129.6, change24h: -0.15, flag: "🇺🇸" },
  { id: "fx-eur", code: "EUR", name: "Euro", rate: 140.8, prev: 140.35, change24h: 0.32, flag: "🇪🇺" },
  { id: "fx-gbp", code: "GBP", name: "British Pound", rate: 167.9, prev: 167.15, change24h: 0.45, flag: "🇬🇧" },
  { id: "fx-tzs", code: "TZS", name: "Tanzanian Shilling", rate: 0.048, prev: 0.048, change24h: 0.0, flag: "🇹🇿" },
];

const SAMPLE_COMMODITIES = [
  { id: "com-gold", symbol: "XAU", name: "Gold", category: "Precious Metals", price: 2740.5, prev: 2722.8, change24h: 0.65, unit: "per troy oz", icon: "🪙" },
  { id: "com-oil", symbol: "BRENT", name: "Brent Crude", category: "Energy", price: 74.2, prev: 75.1, change24h: -1.2, unit: "per barrel", icon: "🛢️" },
  { id: "com-tea", symbol: "TEA", name: "Kenya Tea (Mombasa)", category: "Agriculture", price: 2.25, prev: 2.21, change24h: 1.8, unit: "per kg", icon: "🍃" },
  { id: "com-coffee", symbol: "COFFEE", name: "Arabica Coffee", category: "Agriculture", price: 2.45, prev: 2.46, change24h: -0.4, unit: "per lb", icon: "☕" },
];

const CATEGORIES: Array<{ key: CompareAssetCategory; label: string; count: number }> = [
  { key: "fund", label: "Money Market Funds", count: SAMPLE_FUNDS.length },
  { key: "stock", label: "NSE Stocks", count: SAMPLE_STOCKS.length },
  { key: "currency", label: "FX Rates", count: SAMPLE_RATES.length },
  { key: "commodity", label: "Commodities", count: SAMPLE_COMMODITIES.length },
];

// ─── Inner Showcase View ───
const CompareDemoContent = () => {
  const [activeCategory, setActiveCategory] = useState<CompareAssetCategory>("fund");
  const [favourites, setFavourites] = useState<Set<string>>(new Set(["stock-scom", "fund-etica"]));
  const { add, remove, isSelected } = useUniversalCompare();

  const toggleFavourite = (id: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = (item: CompareItem) => {
    if (isSelected(item.id)) {
      remove(item.id);
    } else {
      add(item);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 md:px-6 py-6 pb-36 space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2 border border-emerald-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Interactive Within-Card Compare Demo</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          In-Card Compare Button Layout
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          The redundant bottom-right category/sector pill has been replaced with a native <strong>[⇄ Compare]</strong> action alongside the <strong>[★ Watchlist]</strong> star, matching the live app card design.
        </p>
      </div>

      {/* Guide Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200">
        <Info className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div>
          <strong className="block font-bold mb-0.5">How the within-card comparison works:</strong>
          Tap <strong>[⇄ Compare]</strong> on any 2 or more cards below. Notice how the card outlines in emerald, the button changes to <strong>[✓ Added]</strong>, and the floating comparison tray docks at the bottom. Tapping <strong>Compare peers</strong> opens the side-by-side bottom sheet!
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[11px] font-normal opacity-80 ${isActive ? "text-background" : "text-muted-foreground"}`}>
                ({cat.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards Feed Matching Actual Local UI */}
      <div className="space-y-3">
        {/* 1. MMFs View */}
        {activeCategory === "fund" && (
          <div className="space-y-3">
            {SAMPLE_FUNDS.map((fund) => {
              const added = isSelected(fund.id);
              const isFav = favourites.has(fund.id);
              const isUp = fund.diff > 0;
              const isFlat = fund.diff === 0;
              const DiffIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
              const diffColor = isFlat
                ? "text-muted-foreground"
                : isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400";

              return (
                <div
                  key={fund.id}
                  className={`block rounded-[22px] border bg-card p-4 shadow-sm transition-all overflow-hidden ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.02]"
                      : "border-border/80 hover:border-emerald-500/30"
                  }`}
                >
                  {/* Top Row: Brand avatar, fund details, sparkline, and annual yield */}
                  <div className="flex items-center gap-3">
                    {/* Fund Logo Avatar */}
                    <div
                      className={`h-12 w-12 rounded-full flex shrink-0 items-center justify-center text-sm font-black text-white shadow-sm ${fund.bg}`}
                    >
                      {fund.initials}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-foreground text-[17px] tracking-tight truncate block">
                        {fund.name}
                      </span>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{fund.manager}</p>
                    </div>

                    {/* Center Sparkline */}
                    <div className="shrink-0 px-1 hidden sm:block">
                      <MiniSparkline trend={isUp ? "up" : isFlat ? "flat" : "down"} />
                    </div>

                    {/* Right Yield & Diff */}
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-foreground text-[17px] tabular-nums">
                        {fund.annual_yield.toFixed(2)}%
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${diffColor}`}>
                          <DiffIcon className="h-3 w-3" />
                          <span>{fund.diff > 0 ? `+${fund.diff.toFixed(2)}%` : `${fund.diff.toFixed(2)}%`}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thin Divider Line */}
                  <div className="border-t border-border/40 my-3.5" />

                  {/* Bottom Row: Key fund details on left, Compare button + Star on right */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <WalletCards className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        Min <strong className="font-semibold text-foreground">KES {fund.minimum_investment.toLocaleString()}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BadgePercent className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        Fee <strong className="font-semibold text-foreground">{fund.management_fee}%</strong>
                      </span>
                    </div>

                    {/* Action Hub (Replacing redundant 'Money Market' badge) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggle({
                            id: fund.id,
                            category: "fund",
                            title: fund.name,
                            subtitle: fund.manager,
                            data: fund,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          added
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted"
                        }`}
                        aria-label={added ? `Remove ${fund.name} from compare` : `Compare ${fund.name}`}
                      >
                        {added ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>{added ? "Added" : "Compare"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavourite(fund.id)}
                        className="p-1 -mr-1"
                        aria-label={isFav ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Stocks View */}
        {activeCategory === "stock" && (
          <div className="space-y-3">
            {SAMPLE_STOCKS.map((stock) => {
              const added = isSelected(stock.id);
              const isFav = favourites.has(stock.id);
              const isUp = stock.day_change_percent > 0;
              const isFlat = stock.day_change_percent === 0;
              const DiffIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
              const diffColor = isFlat
                ? "text-muted-foreground"
                : isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400";

              return (
                <div
                  key={stock.id}
                  className={`block rounded-[20px] border bg-card p-4 shadow-sm transition-all overflow-hidden ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.02]"
                      : "border-border/80 hover:border-emerald-500/30"
                  }`}
                >
                  {/* Top Row: Symbol/Name (Left), Sparkline (Center), Price/Return (Right) */}
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Symbol + Name */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-full flex shrink-0 items-center justify-center text-xs font-black text-white shadow-sm ${stock.bg}`}
                      >
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="block truncate font-extrabold text-base tracking-tight text-foreground">
                            {stock.symbol}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">· {stock.sector}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{stock.name}</p>
                      </div>
                    </div>

                    {/* Sparkline in Center */}
                    <div className="shrink-0 px-1 hidden sm:block">
                      <MiniSparkline trend={isUp ? "up" : isFlat ? "flat" : "down"} />
                    </div>

                    {/* Price + Return % */}
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-foreground text-base tabular-nums">
                        KES {formatNumber(stock.price)}
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${diffColor}`}>
                          <DiffIcon className="h-3 w-3" />
                          <span>{stock.day_change_percent > 0 ? `+${stock.day_change_percent.toFixed(2)}%` : `${stock.day_change_percent.toFixed(2)}%`}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thin Divider Line */}
                  <div className="border-t border-border/40 my-3" />

                  {/* Bottom Row: Vol, Cap (Left) and Compare Button + Star (Right) */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>
                        Vol <strong className="font-semibold text-foreground ml-0.5">{formatVolume(stock.volume)}</strong>
                      </span>
                      <span>
                        Cap <strong className="font-semibold text-foreground ml-0.5">{formatMarketCap(stock.market_cap)}</strong>
                      </span>
                    </div>

                    {/* Action Hub (Replacing redundant Sector pill) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggle({
                            id: stock.id,
                            category: "stock",
                            title: stock.name,
                            subtitle: stock.symbol,
                            data: stock,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          added
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted"
                        }`}
                        aria-label={added ? `Remove ${stock.symbol} from compare` : `Compare ${stock.symbol}`}
                      >
                        {added ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>{added ? "Added" : "Compare"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavourite(stock.id)}
                        className="p-1 -mr-1"
                        aria-label={isFav ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Rates View */}
        {activeCategory === "currency" && (
          <div className="space-y-3">
            {SAMPLE_RATES.map((rate) => {
              const added = isSelected(rate.id);
              const isFav = favourites.has(rate.id);
              const isUp = rate.change24h > 0;
              const isFlat = rate.change24h === 0;
              const DiffIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
              const diffColor = isFlat
                ? "text-muted-foreground"
                : isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400";

              return (
                <div
                  key={rate.id}
                  className={`block rounded-[22px] border bg-card p-4 shadow-sm transition-all overflow-hidden ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.02]"
                      : "border-border/80 hover:border-emerald-500/30"
                  }`}
                >
                  {/* Top Row: Currency Flag, Pair, Sparkline, and Live Rate */}
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/60 border border-border/80 flex shrink-0 items-center justify-center text-xl shadow-xs">
                      {rate.flag}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-foreground text-[17px] tracking-tight truncate block">
                        {rate.code}/KES
                      </span>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{rate.name}</p>
                    </div>

                    <div className="shrink-0 px-1 hidden sm:block">
                      <MiniSparkline trend={isUp ? "up" : isFlat ? "flat" : "down"} />
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-foreground text-[17px] tabular-nums">
                        KES {rate.rate.toFixed(2)}
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${diffColor}`}>
                          <DiffIcon className="h-3 w-3" />
                          <span>{rate.change24h > 0 ? `+${rate.change24h.toFixed(2)}%` : `${rate.change24h.toFixed(2)}%`}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 my-3.5" />

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>
                        Prev <strong className="font-semibold text-foreground ml-0.5">KES {rate.prev.toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggle({
                            id: rate.id,
                            category: "currency",
                            title: rate.name,
                            subtitle: `${rate.code}/KES`,
                            data: rate,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          added
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted"
                        }`}
                        aria-label={added ? `Remove ${rate.code} from compare` : `Compare ${rate.code}`}
                      >
                        {added ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>{added ? "Added" : "Compare"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavourite(rate.id)}
                        className="p-1 -mr-1"
                        aria-label={isFav ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Commodities View */}
        {activeCategory === "commodity" && (
          <div className="space-y-3">
            {SAMPLE_COMMODITIES.map((com) => {
              const added = isSelected(com.id);
              const isFav = favourites.has(com.id);
              const isUp = com.change24h > 0;
              const isFlat = com.change24h === 0;
              const DiffIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
              const diffColor = isFlat
                ? "text-muted-foreground"
                : isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400";

              return (
                <div
                  key={com.id}
                  className={`block rounded-[22px] border bg-card p-4 shadow-sm transition-all overflow-hidden ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.02]"
                      : "border-border/80 hover:border-emerald-500/30"
                  }`}
                >
                  {/* Top Row: Commodity Icon, Name, Sparkline, and Price */}
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/60 border border-border/80 flex shrink-0 items-center justify-center text-xl shadow-xs">
                      {com.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-foreground text-[17px] tracking-tight truncate block">
                        {com.name} ({com.symbol})
                      </span>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{com.category}</p>
                    </div>

                    <div className="shrink-0 px-1 hidden sm:block">
                      <MiniSparkline trend={isUp ? "up" : isFlat ? "flat" : "down"} />
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-foreground text-[17px] tabular-nums">
                        ${com.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${diffColor}`}>
                          <DiffIcon className="h-3 w-3" />
                          <span>{com.change24h > 0 ? `+${com.change24h.toFixed(2)}%` : `${com.change24h.toFixed(2)}%`}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 my-3.5" />

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>
                        Unit <strong className="font-semibold text-foreground ml-0.5">{com.unit}</strong>
                      </span>
                      <span>
                        Prev <strong className="font-semibold text-foreground ml-0.5">${com.prev.toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggle({
                            id: com.id,
                            category: "commodity",
                            title: com.name,
                            subtitle: com.symbol,
                            data: com,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          added
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted"
                        }`}
                        aria-label={added ? `Remove ${com.name} from compare` : `Compare ${com.name}`}
                      >
                        {added ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        <span>{added ? "Added" : "Compare"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavourite(com.id)}
                        className="p-1 -mr-1"
                        aria-label={isFav ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Star
                          className={`h-4 w-4 transition-colors ${
                            isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Floating Compare Pill Bar & Modal */}
      <UniversalCompareBar />
      <UniversalCompareModal />
    </div>
  );
};

export default function DevCompareDemoPage() {
  return (
    <UniversalCompareProvider>
      <CompareDemoContent />
    </UniversalCompareProvider>
  );
}
