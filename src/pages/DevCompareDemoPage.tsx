import { useState } from "react";
import {
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  Plus,
  Sparkles,
  Info,
} from "lucide-react";
import {
  UniversalCompareProvider,
  useUniversalCompare,
  type CompareAssetCategory,
  type CompareItem,
} from "@/hooks/useUniversalCompare";
import UniversalCompareBar from "@/components/compare/UniversalCompareBar";
import UniversalCompareModal from "@/components/compare/UniversalCompareModal";

// ─── Realistic Sample Data for Demo ───
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
    fund_type: "money_market",
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
    fund_type: "money_market",
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
    fund_type: "money_market",
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
    fund_type: "money_market",
  },
];

const SAMPLE_STOCKS = [
  {
    id: "stock-scom",
    symbol: "SCOM",
    name: "Safaricom PLC",
    price: 16.85,
    day_change_percent: 1.51,
    pe_ratio: 11.4,
    dividend_yield: 7.2,
    year_low: 13.5,
    year_high: 19.8,
    sector: "Telecommunication",
  },
  {
    id: "stock-eqty",
    symbol: "EQTY",
    name: "Equity Group Holdings",
    price: 43.5,
    day_change_percent: -0.68,
    pe_ratio: 4.8,
    dividend_yield: 9.1,
    year_low: 36.0,
    year_high: 48.5,
    sector: "Banking",
  },
  {
    id: "stock-kcb",
    symbol: "KCB",
    name: "KCB Group PLC",
    price: 34.2,
    day_change_percent: 2.4,
    pe_ratio: 4.2,
    dividend_yield: 8.8,
    year_low: 28.5,
    year_high: 38.0,
    sector: "Banking",
  },
  {
    id: "stock-eabl",
    symbol: "EABL",
    name: "East African Breweries",
    price: 152.0,
    day_change_percent: 0.0,
    pe_ratio: 13.9,
    dividend_yield: 5.6,
    year_low: 125.0,
    year_high: 168.0,
    sector: "Manufacturing",
  },
];

const SAMPLE_RATES = [
  { id: "fx-usd", code: "USD", name: "US Dollar", rate: 129.45, change24h: -0.15 },
  { id: "fx-eur", code: "EUR", name: "Euro", rate: 140.8, change24h: 0.32 },
  { id: "fx-gbp", code: "GBP", name: "British Pound", rate: 167.9, change24h: 0.45 },
  { id: "fx-tzs", code: "TZS", name: "Tanzanian Shilling", rate: 0.048, change24h: 0.0 },
];

const SAMPLE_COMMODITIES = [
  { id: "com-gold", name: "Gold", symbol: "XAU", price: 2740.5, change24h: 0.65, unit: "per troy oz" },
  { id: "com-oil", name: "Brent Crude", symbol: "BRENT", price: 74.2, change24h: -1.2, unit: "per barrel" },
  { id: "com-tea", name: "Kenya Tea (Mombasa)", symbol: "TEA", price: 2.25, change24h: 1.8, unit: "per kg" },
  { id: "com-coffee", name: "Arabica Coffee", symbol: "COFFEE", price: 2.45, change24h: -0.4, unit: "per lb" },
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
  const { add, remove, isSelected, selected } = useUniversalCompare();

  const handleToggle = (item: CompareItem) => {
    if (isSelected(item.id)) {
      remove(item.id);
    } else {
      add(item);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 md:px-6 py-6 pb-32 space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2 border border-emerald-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Interactive Compare Demo UI</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Universal Asset Comparison
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Test the seamless peer comparison experience. Tap <strong>"+ Compare"</strong> on any 2 to 4 cards below to open the floating tray and side-by-side comparison sheet.
        </p>
      </div>

      {/* Guide Banner */}
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3 text-xs leading-relaxed text-blue-900 dark:text-blue-200">
        <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
        <div>
          <strong className="block font-bold">Try the category auto-switch feature:</strong>
          Select 2 Funds, then switch tabs to <strong>NSE Stocks</strong> and tap Compare on Safaricom. Notice how it seamlessly auto-switches your tray with a polite toast notification!
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

      {/* Cards Feed */}
      <div className="space-y-3">
        {/* 1. MMFs View */}
        {activeCategory === "fund" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_FUNDS.map((fund) => {
              const added = isSelected(fund.id);
              return (
                <div
                  key={fund.id}
                  className={`rounded-3xl border p-4.5 bg-card transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400"
                      : "border-border/80 hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-foreground text-base tracking-tight leading-snug">
                        {fund.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{fund.manager}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black text-foreground tabular-nums">
                        {fund.annual_yield}%
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Annual Yield
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div className="text-muted-foreground">
                      Fee: <strong className="text-foreground">{fund.management_fee}%</strong> · Min: <strong className="text-foreground">KES {fund.minimum_investment.toLocaleString()}</strong>
                    </div>
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
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        added
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{added ? "Added" : "Compare"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Stocks View */}
        {activeCategory === "stock" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_STOCKS.map((stock) => {
              const added = isSelected(stock.id);
              const isUp = stock.day_change_percent > 0;
              const isFlat = stock.day_change_percent === 0;
              const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
              const colorClass = isFlat
                ? "text-muted-foreground"
                : isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400";

              return (
                <div
                  key={stock.id}
                  className={`rounded-3xl border p-4.5 bg-card transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400"
                      : "border-border/80 hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-foreground text-base tracking-tight">
                          {stock.symbol}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {stock.sector}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stock.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black text-foreground tabular-nums">
                        KSh {stock.price.toFixed(2)}
                      </div>
                      <div className={`flex items-center justify-end gap-0.5 text-xs font-bold ${colorClass}`}>
                        <Icon className="h-3 w-3" />
                        <span>{stock.day_change_percent > 0 ? `+${stock.day_change_percent}%` : `${stock.day_change_percent}%`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div className="text-muted-foreground">
                      P/E: <strong className="text-foreground">{stock.pe_ratio}x</strong> · Div: <strong className="text-foreground">{stock.dividend_yield}%</strong>
                    </div>
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
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        added
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{added ? "Added" : "Compare"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. FX View */}
        {activeCategory === "currency" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_RATES.map((fx) => {
              const added = isSelected(fx.id);
              return (
                <div
                  key={fx.id}
                  className={`rounded-3xl border p-4.5 bg-card transition-all shadow-sm flex items-center justify-between ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400"
                      : "border-border/80 hover:border-border"
                  }`}
                >
                  <div>
                    <h3 className="font-extrabold text-foreground text-base tracking-tight">
                      1 {fx.code}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{fx.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-black text-foreground tabular-nums">
                        KSh {fx.rate.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">Live Rate</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggle({
                          id: fx.id,
                          category: "currency",
                          title: fx.name,
                          subtitle: fx.code,
                          data: fx,
                        })
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        added
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{added ? "Added" : "Compare"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Commodities View */}
        {activeCategory === "commodity" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_COMMODITIES.map((com) => {
              const added = isSelected(com.id);
              return (
                <div
                  key={com.id}
                  className={`rounded-3xl border p-4.5 bg-card transition-all shadow-sm flex items-center justify-between ${
                    added
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400"
                      : "border-border/80 hover:border-border"
                  }`}
                >
                  <div>
                    <h3 className="font-extrabold text-foreground text-base tracking-tight">
                      {com.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{com.unit}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-black text-foreground tabular-nums">
                        ${com.price.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">Spot Price</span>
                    </div>
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
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        added
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{added ? "Added" : "Compare"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Compare Dock & Modal */}
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
