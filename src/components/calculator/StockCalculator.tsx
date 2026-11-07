import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  BarChart3,
  Coins,
  X,
} from "lucide-react";
import { stockCache, type CachedStock } from "@/lib/stockCache";
import { FALLBACK_KENYAN_STOCKS } from "@/lib/stockDataFallback";
import CalculatorTrajectoryChart, { type TrajectoryPoint } from "./CalculatorTrajectoryChart";

const DIVIDEND_TAX_RATE = 0.05; // 5% KRA Withholding Tax on resident dividends
const NSE_TRANSACTION_FEE_RATE = 0.018; // ~1.8% round-trip brokerage, CMA, CDSC & stamp duty

type SectorFilter = "all" | "banking" | "telecom" | "manufacturing" | "energy" | "other";

const AMOUNT_PRESETS = [
  { label: "25K", value: 25_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "250K", value: 250_000 },
  { label: "500K", value: 500_000 },
  { label: "1M", value: 1_000_000 },
];

const PERIOD_PRESETS = [
  { label: "1 Yr", value: 1 },
  { label: "2 Yrs", value: 2 },
  { label: "3 Yrs", value: 3 },
  { label: "5 Yrs", value: 5 },
  { label: "10 Yrs", value: 10 },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-KE");

export interface StockCalculatorProps {
  initialSymbol?: string;
}

export const StockCalculator = ({ initialSymbol }: StockCalculatorProps = {}) => {
  const [stocks, setStocks] = useState<CachedStock[]>(() => {
    const cached = stockCache.loadStocks();
    if (cached?.stocks && cached.stocks.length > 0) return cached.stocks;
    return FALLBACK_KENYAN_STOCKS;
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => initialSymbol || "SCOM");
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("all");
  const [stockSearch, setStockSearch] = useState<string>("");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Inputs
  const [investmentMode, setInvestmentMode] = useState<"amount" | "shares">("amount");
  const [amount, setAmount] = useState<number>(100_000);
  const [shareCount, setShareCount] = useState<number>(5_000);
  const [sharePrice, setSharePrice] = useState<number>(17.5);
  const [dividendYield, setDividendYield] = useState<number>(7.5);
  const [capitalGrowth, setCapitalGrowth] = useState<number>(6.0); // % p.a.
  const [years, setYears] = useState<number>(3);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [includeFees, setIncludeFees] = useState<boolean>(true);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // When selected symbol changes, sync defaults
  useEffect(() => {
    if (selectedSymbol === "CUSTOM") return;
    const stock = stocks.find((s) => s.symbol.toUpperCase() === selectedSymbol.toUpperCase());
    if (stock) {
      if (typeof stock.price === "number" && stock.price > 0) {
        setSharePrice(Number(stock.price.toFixed(2)));
      }
      if (typeof stock.dividend_yield === "number" && stock.dividend_yield > 0) {
        setDividendYield(Number(stock.dividend_yield.toFixed(2)));
      } else {
        setDividendYield(6.5);
      }
    }
  }, [selectedSymbol, stocks]);

  const activeStock = useMemo(() => {
    if (selectedSymbol === "CUSTOM") return null;
    return stocks.find((s) => s.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || null;
  }, [selectedSymbol, stocks]);

  const handleSelectStock = (stk: CachedStock | null) => {
    if (!stk) {
      setSelectedSymbol("CUSTOM");
    } else {
      setSelectedSymbol(stk.symbol);
      setSharePrice(Number(stk.price.toFixed(2)));
      setDividendYield(stk.dividend_yield ? Number(stk.dividend_yield.toFixed(2)) : 6.5);
    }
    setIsSelectorOpen(false);
  };

  // Comprehensive stock filtering without restrictive slicing
  const filteredStocks = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return stocks.filter((s) => {
      const sec = (s.sector || "").toLowerCase();
      if (sectorFilter === "banking" && !sec.includes("bank")) return false;
      if (sectorFilter === "telecom" && !sec.includes("telecom") && !sec.includes("tech")) return false;
      if (sectorFilter === "manufacturing" && !sec.includes("manufactur") && !sec.includes("commercial")) return false;
      if (sectorFilter === "energy" && !sec.includes("energy") && !sec.includes("petroleum")) return false;
      if (
        sectorFilter === "other" &&
        (sec.includes("bank") || sec.includes("telecom") || sec.includes("manufactur") || sec.includes("energy"))
      ) {
        return false;
      }

      if (!q) return true;
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        sec.includes(q)
      );
    });
  }, [stocks, stockSearch, sectorFilter]);

  // Sector counts
  const sectorCounts = useMemo(() => {
    const total = stocks.length;
    const b = stocks.filter((s) => (s.sector || "").toLowerCase().includes("bank")).length;
    const t = stocks.filter((s) => (s.sector || "").toLowerCase().includes("telecom") || (s.sector || "").toLowerCase().includes("tech")).length;
    const m = stocks.filter((s) => (s.sector || "").toLowerCase().includes("manufactur") || (s.sector || "").toLowerCase().includes("commercial")).length;
    const e = stocks.filter((s) => (s.sector || "").toLowerCase().includes("energy") || (s.sector || "").toLowerCase().includes("petroleum")).length;
    return { all: total, banking: b, telecom: t, manufacturing: m, energy: e };
  }, [stocks]);

  // Calculations
  const { results, trajectory } = useMemo(() => {
    const p = Math.max(0.1, sharePrice);
    const initialShares =
      investmentMode === "amount" ? Math.floor((amount || 0) / p) : Math.max(1, shareCount || 0);
    const effectiveInitialCost = initialShares * p;

    const brokerFeeInitial = includeFees ? effectiveInitialCost * (NSE_TRANSACTION_FEE_RATE / 2) : 0;
    const growthRate = capitalGrowth / 100;

    let currentShares = initialShares;
    let currentPrice = p;
    let cumulativeNetDividends = 0;
    let cumulativeTaxWithheld = 0;

    const traj: TrajectoryPoint[] = [
      {
        periodLabel: "Start",
        principal: Math.round(effectiveInitialCost),
        netTotal: Math.round(effectiveInitialCost),
        netInterest: 0,
        taxDeducted: 0,
      },
    ];

    for (let y = 1; y <= years; y++) {
      const grossDivThisYear = currentShares * currentPrice * (dividendYield / 100);
      const taxThisYear = grossDivThisYear * DIVIDEND_TAX_RATE;
      const netDivThisYear = grossDivThisYear - taxThisYear;

      cumulativeTaxWithheld += taxThisYear;
      currentPrice = currentPrice * (1 + growthRate);

      if (reinvestDividends) {
        const newSharesBought = Math.floor(netDivThisYear / currentPrice);
        currentShares += newSharesBought;
        cumulativeNetDividends += netDivThisYear;
      } else {
        cumulativeNetDividends += netDivThisYear;
      }

      const totalEquityValue = currentShares * currentPrice;
      const totalPortfolioWorth = reinvestDividends
        ? totalEquityValue
        : totalEquityValue + cumulativeNetDividends;

      traj.push({
        periodLabel: `Yr ${y}`,
        principal: Math.round(effectiveInitialCost),
        netTotal: Math.round(totalPortfolioWorth),
        netInterest: Math.max(0, Math.round(totalPortfolioWorth - effectiveInitialCost)),
        taxDeducted: Math.round(cumulativeTaxWithheld),
      });
    }

    const finalEquityValue = currentShares * currentPrice;
    const exitBrokerFee = includeFees ? finalEquityValue * (NSE_TRANSACTION_FEE_RATE / 2) : 0;
    const totalFees = Math.round(brokerFeeInitial + exitBrokerFee);

    const finalPortfolioValue = Math.max(
      0,
      Math.round(
        (reinvestDividends
          ? finalEquityValue
          : finalEquityValue + cumulativeNetDividends) - exitBrokerFee
      )
    );

    const netProfit = Math.max(0, Math.round(finalPortfolioValue - effectiveInitialCost));
    const capitalGainsEarned = Math.round(
      finalEquityValue - effectiveInitialCost - (reinvestDividends ? cumulativeNetDividends : 0)
    );

    const finalYearAnnualDividend = Math.round(
      currentShares * currentPrice * (dividendYield / 100) * (1 - DIVIDEND_TAX_RATE)
    );
    const monthlyPassiveDividend = Math.round(finalYearAnnualDividend / 12);

    return {
      results: {
        initialShares,
        finalShares: currentShares,
        effectiveInitialCost: Math.round(effectiveInitialCost),
        finalPortfolioValue,
        netProfit,
        capitalGainsEarned,
        cumulativeNetDividends: Math.round(cumulativeNetDividends),
        cumulativeTaxWithheld: Math.round(cumulativeTaxWithheld),
        totalFees,
        finalPrice: Number(currentPrice.toFixed(2)),
        monthlyPassiveDividend,
        finalYearAnnualDividend,
      },
      trajectory: traj,
    };
  }, [
    investmentMode,
    amount,
    shareCount,
    sharePrice,
    dividendYield,
    capitalGrowth,
    years,
    reinvestDividends,
    includeFees,
  ]);

  const returnPct =
    results.effectiveInitialCost > 0
      ? ((results.netProfit / results.effectiveInitialCost) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* ─── 1. STOCK SELECTOR (POP-UP FROM BOTTOM ON CLICK) ─── */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            className="flex-1 flex items-center justify-between gap-3 text-left hover:opacity-90 transition-opacity min-w-0"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeStock ? (activeStock.sector || "Equities") : "Custom Equity"}
                  </span>
                  <span>•</span>
                  <span className="truncate">
                    {activeStock ? `NSE: ${activeStock.symbol}` : "Manual Assumptions"}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-foreground truncate">
                  {activeStock ? `${activeStock.name} (${activeStock.symbol})` : "Custom Equity Projection"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                {activeStock ? "Change" : "Select Stock"}
              </span>
              <div className="h-8 px-2.5 rounded-lg border border-border/80 bg-background flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <span className="text-[11px]">Choose</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </button>
        </div>

        {activeStock && (
          <div className="flex items-center gap-3 pt-2.5 mt-2.5 border-t border-border/50 text-[11px] text-muted-foreground flex-wrap">
            <span>Market Price: <strong className="text-foreground">KES {activeStock.price.toFixed(2)}</strong></span>
            <span>•</span>
            <span>Div Yield: <strong className="text-emerald-600 dark:text-emerald-400">{activeStock.dividend_yield ? `${activeStock.dividend_yield.toFixed(2)}%` : "—"}</strong></span>
            <span>•</span>
            <span>P/E Ratio: <strong className="text-foreground">{activeStock.pe_ratio ? activeStock.pe_ratio.toFixed(1) : "—"}</strong></span>
            <Link
              to={`/stocks/${activeStock.symbol.toLowerCase()}`}
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
            >
              <span>View stock dashboard</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => handleSelectStock(null)}
              className="text-xs text-muted-foreground hover:text-destructive ml-auto font-medium"
            >
              Reset to custom
            </button>
          </div>
        )}
      </div>

      {/* ─── BOTTOM POP-UP SHEET FOR STOCK SELECTION ─── */}
      <Sheet open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className="rounded-t-3xl border-t border-border max-h-[85vh] overflow-y-auto px-4 sm:px-6 pt-3 pb-8 max-w-2xl mx-auto bg-background"
        >
          {/* Grab Handle */}
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30 mb-3" />

          <SheetHeader className="text-left pb-2 space-y-1">
            <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
              Select NSE Listed Stock
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Choose from all equities listed on the Nairobi Securities Exchange
            </p>
          </SheetHeader>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or company name (e.g. SCOM, EQTY, BAT)..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="h-10 pl-9 text-xs sm:text-sm rounded-xl"
              autoFocus
            />
          </div>

          {/* Sector Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 text-xs">
            <button
              type="button"
              onClick={() => setSectorFilter("all")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                sectorFilter === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({sectorCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter("banking")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                sectorFilter === "banking"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Banking ({sectorCounts.banking})
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter("telecom")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                sectorFilter === "telecom"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Telecom ({sectorCounts.telecom})
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter("manufacturing")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                sectorFilter === "manufacturing"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Manufacturing ({sectorCounts.manufacturing})
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter("energy")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                sectorFilter === "energy"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Energy ({sectorCounts.energy})
            </button>
          </div>

          {/* Stock List */}
          <div className="space-y-1.5 mt-1 max-h-[50vh] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => handleSelectStock(null)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                selectedSymbol === "CUSTOM"
                  ? "border-emerald-500 bg-emerald-500/10 text-foreground font-bold"
                  : "border-border/70 hover:bg-muted/50 text-foreground"
              }`}
            >
              <div>
                <span className="font-bold text-xs sm:text-sm">Custom Stock Projection</span>
                <p className="text-[11px] text-muted-foreground">Type in any custom share price & dividend yield</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted">Manual</span>
            </button>

            {filteredStocks.map((s) => {
              const isSelected = selectedSymbol === s.symbol;

              return (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => handleSelectStock(s)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <div className="truncate pr-3">
                    <div className="truncate font-bold text-xs sm:text-sm flex items-center gap-2">
                      <span>{s.symbol}</span>
                      <span className="font-normal text-muted-foreground truncate">• {s.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {s.sector || "Equities"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-sm sm:text-base text-foreground tabular-nums">
                      KES {s.price?.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {s.dividend_yield ? `${s.dividend_yield.toFixed(1)}% div` : "Dividend"}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredStocks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No stocks found matching "{stockSearch}"
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 2. CALCULATOR CONTROLS & INPUTS (FIRST) ─── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Stock Assumptions & Capital
        </h3>

        {/* Investment Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 max-w-sm">
          <button
            type="button"
            onClick={() => setInvestmentMode("amount")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              investmentMode === "amount"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Investment Amount (KSh)
          </button>
          <button
            type="button"
            onClick={() => setInvestmentMode("shares")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              investmentMode === "shares"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Number of Shares
          </button>
        </div>

        {/* Amount or Share Count Input */}
        {investmentMode === "amount" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stock-amount" className="text-xs font-semibold text-foreground">
                Investment Capital (KSh)
              </Label>
              <span className="text-xs font-bold text-foreground tabular-nums">
                KSh {fmt(amount)}
              </span>
            </div>
            <Input
              id="stock-amount"
              type="number"
              inputMode="numeric"
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
              placeholder="e.g. 100000"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {AMOUNT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setAmount(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    amount === p.value
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stock-shares" className="text-xs font-semibold text-foreground">
                Number of Shares to Buy
              </Label>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {fmt(shareCount)} shares
              </span>
            </div>
            <Input
              id="stock-shares"
              type="number"
              inputMode="numeric"
              value={shareCount || ""}
              onChange={(e) => setShareCount(Math.max(1, Number(e.target.value)))}
              className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
              placeholder="e.g. 5000"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {[500, 1000, 2500, 5000, 10000, 25000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setShareCount(count)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    shareCount === count
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {fmt(count)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Share Price & Dividend Yield */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stock-price" className="text-xs font-semibold text-foreground">
                Stock Price (KES / share)
              </Label>
              <span className="text-xs font-bold text-foreground tabular-nums">
                KES {sharePrice.toFixed(2)}
              </span>
            </div>
            <Input
              id="stock-price"
              type="number"
              inputMode="decimal"
              step="0.05"
              value={sharePrice || ""}
              onChange={(e) => setSharePrice(Math.max(0.01, Number(e.target.value)))}
              className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
              placeholder="e.g. 17.50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="stock-div-yield" className="text-xs font-semibold text-foreground">
                Expected Dividend Yield (% p.a.)
              </Label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
                {dividendYield}% p.a.
              </span>
            </div>
            <Input
              id="stock-div-yield"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={dividendYield || ""}
              onChange={(e) => setDividendYield(Math.max(0, Number(e.target.value)))}
              className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
              placeholder="e.g. 7.5"
            />
          </div>
        </div>

        {/* Expected Price Growth Slider */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-foreground">
                Expected Capital Appreciation (% p.a.)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Assumed average annual stock price growth or decline
              </p>
            </div>
            <span
              className={`text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                capitalGrowth > 0
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : capitalGrowth === 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {capitalGrowth > 0 ? `+${capitalGrowth}%` : `${capitalGrowth}%`} p.a.
            </span>
          </div>
          <Slider
            min={-15}
            max={30}
            step={0.5}
            value={[capitalGrowth]}
            onValueChange={([val]) => setCapitalGrowth(val)}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>-15% (Bear)</span>
            <span>0% (Flat)</span>
            <span>+10% (Moderate)</span>
            <span>+30% (Bull)</span>
          </div>
        </div>

        {/* Investment Horizon */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">Investment Horizon</Label>
            <span className="text-xs font-bold text-foreground">
              {years} {years === 1 ? "Year" : "Years"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setYears(p.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  years === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* DRIP and Brokerage Switches */}
        <div className="pt-2 border-t border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Reinvest Dividends (DRIP)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Automatically use net dividend proceeds to acquire additional shares
              </p>
            </div>
            <Switch checked={reinvestDividends} onCheckedChange={setReinvestDividends} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Include NSE & CDSC Brokerage Fees (~1.8%)
              </p>
              <p className="text-[11px] text-muted-foreground">
                CMA statutory transaction levy, CDSC clearing, and licensed stockbroker commission
              </p>
            </div>
            <Switch checked={includeFees} onCheckedChange={setIncludeFees} />
          </div>
        </div>
      </div>

      {/* ─── 3. PROJECTIONS & RESULTS (SECOND) ─── */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-card/70 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>{years}-Year Estimated Stock Value</span>
            </div>
            <div className="text-3xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums mt-1.5">
              KSh {fmt(results.finalPortfolioValue)}
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              +KSh {fmt(results.netProfit)} ({returnPct}%)
            </span>
            <span className="text-xs text-muted-foreground">
              Dividends + Price Growth after 5% WHT
            </span>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Total Invested</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              KSh {fmt(results.effectiveInitialCost)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmt(results.initialShares)} shares @ KES {sharePrice.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-emerald-500/10 p-3">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Net Dividends Kept</p>
            <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              +KSh {fmt(results.cumulativeNetDividends)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">After 5% KRA WHT</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Projected Share Price</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              KES {results.finalPrice.toFixed(2)}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
              +{capitalGrowth}% p.a. growth
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Monthly Passive Dividends</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              ~KSh {fmt(results.monthlyPassiveDividend)}/mo
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Year {years} Run-rate</p>
          </div>
        </div>

        {/* Visual Trajectory Chart */}
        <div className="pt-2">
          <CalculatorTrajectoryChart data={trajectory} height={230} />
        </div>

        {/* Collapsible Tax & Fee Breakdown */}
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowBreakdown((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Kenyan brokerage fees & dividend tax breakdown</span>
            {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Shares Accumulated</span>
                <span className="font-semibold text-foreground">{fmt(results.finalShares)} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">KRA Resident Dividend WHT (5%)</span>
                <span className="font-semibold text-destructive">-KSh {fmt(results.cumulativeTaxWithheld)}</span>
              </div>
              {includeFees && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NSE & CDSC Brokerage Fees (~1.8% round-trip)</span>
                  <span className="font-semibold text-destructive">-KSh {fmt(results.totalFees)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                <span>Net Return on Investment</span>
                <span className="text-emerald-600 dark:text-emerald-400">KSh {fmt(results.netProfit)} ({returnPct}%)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockCalculator;
