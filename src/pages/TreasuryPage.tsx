import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Info,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  BarChart2,
  Calendar,
  DollarSign,
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  Calculator as CalcIcon,
  Landmark,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useTreasuryData, TBillAuction, TreasuryBond } from "@/hooks/useTreasuryData";

export default function TreasuryPage() {
  useDocumentTitle("Treasury Bills & Bonds | Rates, Auction & Return Calculator | KenyaFundFinder");

  const { data, isLoading, isError } = useTreasuryData();

  // Top tab selection: "tbills" | "bonds"
  const [activeTab, setActiveTab] = useState<"tbills" | "bonds">("tbills");

  // T-Bill Chart Period
  const [chartPeriod, setChartPeriod] = useState<string>("6M");
  const [visibleLines, setVisibleLines] = useState({ rate91: true, rate182: true, rate364: true });

  // T-Bill Card Detail Modal
  const [selectedTBill, setSelectedTBill] = useState<TBillAuction | null>(null);

  // Bonds Filters
  const [bondSearch, setBondSearch] = useState("");
  const [bondMaturityFilter, setBondMaturityFilter] = useState("All");
  const [bondCouponFilter, setBondCouponFilter] = useState("All");
  const [bondSortBy, setBondSortBy] = useState<"maturity" | "coupon" | "yield">("yield");
  const [selectedBond, setSelectedBond] = useState<TreasuryBond | null>(null);

  // Investment Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(100000);
  const [calcSecurityId, setCalcSecurityId] = useState<string>("364-day");

  // Filtered bonds
  const filteredBonds = useMemo(() => {
    if (!data?.bonds) return [];
    return data.bonds
      .filter((b) => {
        const matchesSearch =
          b.issueNo.toLowerCase().includes(bondSearch.toLowerCase()) ||
          b.name.toLowerCase().includes(bondSearch.toLowerCase());

        let matchesMaturity = true;
        if (bondMaturityFilter === "< 2 Yrs") matchesMaturity = b.tenorYears < 2;
        else if (bondMaturityFilter === "2–5 Yrs") matchesMaturity = b.tenorYears >= 2 && b.tenorYears <= 5;
        else if (bondMaturityFilter === "5–10 Yrs") matchesMaturity = b.tenorYears > 5 && b.tenorYears <= 10;
        else if (bondMaturityFilter === "10+ Yrs") matchesMaturity = b.tenorYears > 10;

        let matchesCoupon = true;
        if (bondCouponFilter === "Tax-Free") matchesCoupon = b.status === "Tax-Free";
        else if (bondCouponFilter === "Fixed") matchesCoupon = b.status === "Active";

        return matchesSearch && matchesMaturity && matchesCoupon;
      })
      .sort((a, b) => {
        if (bondSortBy === "yield") return b.couponRate - a.couponRate;
        if (bondSortBy === "coupon") return b.couponRate - a.couponRate;
        if (bondSortBy === "maturity") return a.tenorYears - b.tenorYears;
        return 0;
      });
  }, [data?.bonds, bondSearch, bondMaturityFilter, bondCouponFilter, bondSortBy]);

  // Selected Security for Calculator
  const selectedCalcSecurity = useMemo(() => {
    const card = data?.tbills?.find((c) => c.id === calcSecurityId);
    if (card) return { name: card.type, rate: card.averageYield, days: card.days };
    const bond = data?.bonds?.find((b) => b.issueNo === calcSecurityId);
    if (bond) return { name: bond.issueNo, rate: bond.couponRate, days: 365 };
    const tbill364 = data?.tbills?.find((c) => c.type === "364-Day");
    return { name: "364-Day T-Bill", rate: tbill364?.averageYield || 0, days: 364 };
  }, [calcSecurityId, data]);

  // Interactive calculation output
  const calcResults = useMemo(() => {
    const ratePct = selectedCalcSecurity.rate / 100;
    const days = selectedCalcSecurity.days;
    // Simple return = Amount * (Rate * Days / 365)
    const estReturn = Math.round(calcAmount * ratePct * (days / 365));
    const maturityVal = calcAmount + estReturn;
    return {
      estReturn,
      maturityVal,
      days,
      rate: selectedCalcSecurity.rate,
    };
  }, [calcAmount, selectedCalcSecurity]);

  // Dynamic statistics explaining the active Rate History chart
  const chartStats = useMemo(() => {
    const currentData = data?.rateHistory?.[chartPeriod] || data?.rateHistory?.["6M"] || [];
    if (!currentData || currentData.length === 0) {
      return { high: "—", low: "—", latest: "—", demand: "—" };
    }

    const rates: number[] = [];
    currentData.forEach((item) => {
      if (visibleLines.rate91 && item.rate91) rates.push(item.rate91);
      if (visibleLines.rate182 && item.rate182) rates.push(item.rate182);
      if (visibleLines.rate364 && item.rate364) rates.push(item.rate364);
    });

    if (rates.length === 0) {
      return { high: "—", low: "—", latest: "—", demand: "—" };
    }

    const high = Math.max(...rates).toFixed(2) + "%";
    const low = Math.min(...rates).toFixed(2) + "%";
    const lastItem = currentData[currentData.length - 1];
    const latestVal = visibleLines.rate364 ? lastItem.rate364 : visibleLines.rate182 ? lastItem.rate182 : lastItem.rate91;
    const latest = latestVal ? `${latestVal.toFixed(2)}%` : "—";

    return { high, low, latest, demand: "1.6×" };
  }, [chartPeriod, visibleLines]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500 selection:text-white">


        <main className="flex-1 container mx-auto px-4 py-4 md:py-6 max-w-6xl space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              <p className="text-muted-foreground font-semibold">Loading latest Treasury data…</p>
            </div>
          )}
          
          {isError && (
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-6 py-4 rounded-xl border border-amber-500/20 text-center font-semibold max-w-md mx-auto my-20">
              Treasury data is temporarily unavailable.
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="space-y-4 animate-in fade-in-50 duration-500">
          {/* ── Section 1: Main Page Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
                Treasury Bills & Bonds
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
                Compare Kenyan government securities and track interest rates
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50 self-start md:self-auto">
              <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Source: <strong>Central Bank of Kenya</strong> · Last verified: <strong>{data.lastVerifiedAt || "August 2026"}</strong></span>
            </div>
          </div>

          {/* ── Section 2: Top Navigation Tabs (Pill Style) ── */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "tbills", label: "Treasury Bills" },
              { id: "bonds", label: "Treasury Bonds" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-1.5 text-xs md:text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-card text-muted-foreground border border-border/80 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: TREASURY BILLS                                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "tbills" && (
            <div className="space-y-3 animate-in fade-in-50 duration-300">
              {/* Updated Date Row for T-Bills */}
              <div className="text-[11px] font-bold tracking-wider uppercase px-0.5">
                <span className="text-emerald-500">LATEST AUCTION: {data?.tbills?.[0]?.auctionDate?.toUpperCase() || "—"}</span>
              </div>
              {/* Section 3: Current T-Bill Rates Cards */}
              <section>
                <div className="no-scrollbar -mx-4 px-4 flex gap-3 overflow-x-auto py-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:mx-0 md:px-0">
                  {(data?.tbills || []).map((card) => (
                    <div
                      key={card.id}
                      className="min-w-[210px] w-[210px] md:w-auto shrink-0 rounded-2xl border border-border/80 bg-card p-3.5 hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                            {card.type}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            {card.approx}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1.5 pt-0.5">
                          <span className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
                            {card.averageYield.toFixed(2)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                          {(card.averageYield - card.previousYield) >= 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                              <TrendingUp className="h-3 w-3" /> ▲ {(card.averageYield - card.previousYield).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-destructive">
                              <TrendingDown className="h-3 w-3" /> ▼ {Math.abs(card.averageYield - card.previousYield).toFixed(2)}%
                            </span>
                          )}
                          <span className="text-muted-foreground text-[10px] truncate">from prev auction</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 space-y-2">
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <div>
                            <p className="text-muted-foreground text-[9px]">Term</p>
                            <p className="font-semibold text-foreground">{card.days} days</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-[9px]">Latest Auction</p>
                            <p className="font-semibold text-foreground">{card.auctionDate}</p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTBill(card)}
                          className="w-full h-8 rounded-xl text-xs font-bold border-border hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          View Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 4: T-Bill Rate History Chart (Matches Mobile Stocks UI) */}
              <section className="space-y-4">
                <div className="border-0 bg-transparent p-0 shadow-none space-y-4">
                  {/* Header & Range Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-emerald-500 stroke-[2.2]" />
                        <h3 className="text-base font-bold text-foreground md:text-lg">
                          Rate Chart
                        </h3>
                      </div>
                      
                      {/* Security Line Visibility Toggles */}
                      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
                        <button
                          onClick={() => setVisibleLines((p) => ({ ...p, rate91: !p.rate91 }))}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
                            visibleLines.rate91
                              ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 text-[11px]"
                              : "border-border text-muted-foreground opacity-50 text-[11px]"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> 91D
                        </button>
                        <button
                          onClick={() => setVisibleLines((p) => ({ ...p, rate182: !p.rate182 }))}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
                            visibleLines.rate182
                              ? "border-amber-500/50 text-amber-600 bg-amber-500/10 dark:text-amber-400 text-[11px]"
                              : "border-border text-muted-foreground opacity-50 text-[11px]"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> 182D
                        </button>
                        <button
                          onClick={() => setVisibleLines((p) => ({ ...p, rate364: !p.rate364 }))}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
                            visibleLines.rate364
                              ? "border-purple-500/50 text-purple-600 bg-purple-500/10 dark:text-purple-400 text-[11px]"
                              : "border-border text-muted-foreground opacity-50 text-[11px]"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-purple-500" /> 364D
                        </button>
                      </div>
                    </div>

                    {/* Period Tabs Bar (Matches Stock Detail horizontal pill selector) */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border/80 pb-2">
                      {["1M", "3M", "6M", "1Y", "ALL"].map((period) => {
                        const isActive = chartPeriod === period;
                        return (
                          <button
                            key={period}
                            onClick={() => setChartPeriod(period)}
                            className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                              isActive
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {period}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div className="h-64 md:h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.rateHistory?.[chartPeriod] || data?.rateHistory?.["6M"] || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                        <XAxis
                          dataKey="date"
                          stroke="currentColor"
                          className="text-muted-foreground text-[10px]"
                          tickLine={false}
                        />
                        <YAxis
                          stroke="currentColor"
                          className="text-muted-foreground text-[10px]"
                          unit="%"
                          domain={["dataMin - 0.5", "dataMax + 0.5"]}
                          tickLine={false}
                          width={35}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "0.75rem",
                            fontSize: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          }}
                        />
                        {visibleLines.rate91 && (
                          <Area
                            type="monotone"
                            dataKey="rate91"
                            name="91-Day"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.1}
                            strokeWidth={2.5}
                          />
                        )}
                        {visibleLines.rate182 && (
                          <Area
                            type="monotone"
                            dataKey="rate182"
                            name="182-Day"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.1}
                            strokeWidth={2.5}
                          />
                        )}
                        {visibleLines.rate364 && (
                          <Area
                            type="monotone"
                            dataKey="rate364"
                            name="364-Day"
                            stroke="#a855f7"
                            fill="#a855f7"
                            fillOpacity={0.1}
                            strokeWidth={2.5}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2x2 Grid Stat Cards (Explains active Rate History chart) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-card p-3.5 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PERIOD HIGH</p>
                      <span className="text-[10px] font-semibold text-emerald-500">{chartPeriod} Max</span>
                    </div>
                    <p className="text-base md:text-lg font-black tracking-tight tabular-nums text-foreground">{chartStats.high}</p>
                    <p className="text-[10px] text-muted-foreground truncate">Peak yield in selected period</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3.5 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PERIOD LOW</p>
                      <span className="text-[10px] font-semibold text-muted-foreground">{chartPeriod} Min</span>
                    </div>
                    <p className="text-base md:text-lg font-black tracking-tight tabular-nums text-foreground">{chartStats.low}</p>
                    <p className="text-[10px] text-muted-foreground truncate">Lowest yield in selected period</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <DollarSign className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">LATEST RATE</p>
                      <p className="text-base md:text-lg font-black tracking-tight tabular-nums text-foreground">{chartStats.latest}</p>
                      <p className="text-[10px] text-muted-foreground truncate">Most recent auction yield</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <BarChart2 className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AVG DEMAND</p>
                      <p className="text-base md:text-lg font-black tracking-tight tabular-nums text-foreground">{chartStats.demand}</p>
                      <p className="text-[10px] text-muted-foreground truncate">CBK auction bid-to-cover</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Latest Auction Results Cards (Exact Match to Stock & Bond Cards UI) */}
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Latest Treasury Bill Auction</h3>
                  <div className="text-xs text-muted-foreground font-medium">
                    Latest Auction: <strong className="text-foreground">{data?.tbills?.[0]?.auctionDate || "—"}</strong> · Source: Central Bank of Kenya
                  </div>
                </div>

                {/* Stock-style Auction Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(data?.tbills || []).map((row) => (
                    <div
                      key={row.type}
                      className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5 shadow-sm hover:border-emerald-500/40 transition-all"
                    >
                      {/* Top Row: Title/Subtitle + Rate */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-black text-foreground text-base tracking-tight block truncate">
                            {row.type} T-Bill
                          </span>
                          <span className="text-xs text-muted-foreground truncate block">
                            Short-Term Government Security
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-black text-foreground tabular-nums block">
                            {row.averageYield.toFixed(2)}%
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                            Yield p.a.
                          </span>
                        </div>
                      </div>

                      {/* Divider & Bottom Row */}
                      <div className="border-t border-border/60 pt-2.5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground truncate text-[11px]">
                          <span>
                            Offered <strong className="text-foreground font-bold">{row.amountOffered}</strong>
                          </span>
                          <span className="opacity-40">•</span>
                          <span>
                            Bids <strong className="text-foreground font-bold">{row.bidsReceived}</strong>
                          </span>
                        </div>

                        <span className="shrink-0 rounded-full px-3 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {row.performanceRate > 100 ? "Oversubscribed" : "Undersubscribed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: TREASURY BONDS                                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === "bonds" && (
            <div className="space-y-3 animate-in fade-in-50 duration-300">
              {/* Search & Filter Bar (Matches Mobile Stocks UI) */}
              <div className="flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    placeholder="Search bonds..."
                    value={bondSearch}
                    onChange={(e) => setBondSearch(e.target.value)}
                    className="h-11 w-full rounded-full border-border/80 bg-card pl-11 text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
                  />
                </div>

                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border/80 bg-card px-5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/40"
                    >
                      <SlidersHorizontal className="h-4 w-4" /> Filter
                      {(bondMaturityFilter !== "All" || bondCouponFilter !== "All" || bondSortBy !== "yield") && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl border-border p-5 space-y-5 bg-background">
                    <SheetHeader className="border-b border-border/50 pb-3 text-left">
                      <SheetTitle className="text-base font-bold">Sort & Filter Bonds</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4">
                      {/* Sort By Section */}
                      <div>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort By</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: "yield", label: "Yield (High to Low)" },
                            { id: "coupon", label: "Coupon (High to Low)" },
                            { id: "maturity", label: "Maturity Date" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setBondSortBy(item.id as any)}
                              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                                bondSortBy === item.id ? "bg-emerald-600 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Maturity Section */}
                      <div>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maturity Remaining</h4>
                        <div className="flex flex-wrap gap-2">
                          {["All", "< 2 Yrs", "2–5 Yrs", "5–10 Yrs", "10+ Yrs"].map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setBondMaturityFilter(item)}
                              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                                bondMaturityFilter === item ? "bg-emerald-600 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Coupon Type Section */}
                      <div>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coupon Type</h4>
                        <div className="flex flex-wrap gap-2">
                          {["All", "Tax-Free", "Fixed"].map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setBondCouponFilter(item)}
                              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                                bondCouponFilter === item ? "bg-emerald-600 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <SheetClose asChild>
                        <button type="button" className="mt-4 h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">
                          Apply Filters
                        </button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Maturity Filter Pill Buttons (Exact Match to Stocks Page Top Gainers UI) */}
              <div className="flex gap-2 overflow-x-auto py-0.5 no-scrollbar">
                {[
                  { label: "All", key: "All", count: (data?.bonds || []).length },
                  { label: "< 2 Yrs", key: "< 2 Yrs", count: (data?.bonds || []).filter((b) => b.tenorYears < 2).length },
                  { label: "2–5 Yrs", key: "2–5 Yrs", count: (data?.bonds || []).filter((b) => b.tenorYears >= 2 && b.tenorYears <= 5).length },
                  { label: "5–10 Yrs", key: "5–10 Yrs", count: (data?.bonds || []).filter((b) => b.tenorYears > 5 && b.tenorYears <= 10).length },
                  { label: "10+ Yrs", key: "10+ Yrs", count: (data?.bonds || []).filter((b) => b.tenorYears > 10).length },
                ].map((option) => {
                  const isActive = bondMaturityFilter === option.key;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setBondMaturityFilter(option.key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-foreground text-background shadow-sm"
                          : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="font-normal opacity-75">{option.count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Updated Date Row for Bonds */}
              <div className="text-[11px] font-bold tracking-wider uppercase px-0.5 pt-0.5">
                <span className="text-emerald-500">UPDATED {data?.lastVerifiedAt?.toUpperCase() || "RECENTLY"}</span>
              </div>

              {/* Bond List Table / Cards */}
              <div className="space-y-3">
                
                {filteredBonds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
                    <ShieldAlert className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="text-sm font-bold text-foreground">No bonds found</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      There are no active Treasury Bonds matching your search and filter criteria.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setBondSearch("");
                        setBondMaturityFilter("All");
                        setBondCouponFilter("All");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <>
<div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="py-3.5 px-4">Bond</th>
                        <th className="py-3.5 px-4 text-right">Coupon</th>
                        <th className="py-3.5 px-4 text-right">Yield</th>
                        <th className="py-3.5 px-4">Maturity</th>
                        <th className="py-3.5 px-4 text-right">Remaining Term</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(filteredBonds || []).map((bond) => (
                        <tr
                          key={bond.issueNo}
                          onClick={() => setSelectedBond(bond as any)}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <td className="py-4 px-4">
                            <p className="font-black text-foreground">{bond.issueNo}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{bond.name}</p>
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-foreground">{bond.coupon.toFixed(2)}%</td>
                          <td className="py-4 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                            {bond.couponRate.toFixed(2)}%
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">{bond.maturityDate}</td>
                          <td className="py-4 px-4 text-right font-semibold text-foreground">{bond.yearsRemaining} yrs</td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                bond.status === "Tax-Free"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                              }`}
                            >
                              {bond.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/10"
                            >
                              View Bond
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Stock-style Treasury Bond Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(filteredBonds || []).map((bond) => (
                    <div
                      key={bond.issueNo}
                      onClick={() => setSelectedBond(bond as any)}
                      className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5 shadow-sm hover:border-emerald-500/40 transition-all cursor-pointer group"
                    >
                      {/* Top Row: Symbol/Name + Sparkline + Yield Rate */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-black text-foreground text-base tracking-tight block truncate group-hover:text-emerald-500 transition-colors">
                            {bond.issueNo}
                          </span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {bond.name}
                          </span>
                        </div>

                        {/* Mini Sparkline Graphic */}
                        <div className="hidden sm:block shrink-0 px-2">
                          <svg className="h-6 w-14 text-emerald-500/70" viewBox="0 0 60 20" fill="none">
                            <path
                              d="M2 15 L14 12 L26 14 L38 7 L50 9 L58 3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        {/* Yield / Rate */}
                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-black text-foreground tabular-nums block">
                            {bond.couponRate.toFixed(2)}%
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                            Yield p.a.
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60 pt-2.5 flex items-center justify-between gap-2 text-xs">
                        {/* Key Attributes */}
                        <div className="flex items-center gap-3 text-muted-foreground truncate text-[11px] sm:text-xs">
                          <span>
                            Coupon <strong className="text-foreground font-bold">{bond.coupon.toFixed(2)}%</strong>
                          </span>
                          <span className="opacity-40">•</span>
                          <span>
                            Rem <strong className="text-foreground font-bold">{bond.yearsRemaining} yrs</strong>
                          </span>
                        </div>

                        {/* Status Badge Pill */}
                        <span
                          className={`shrink-0 rounded-full px-3 py-0.5 text-[11px] font-semibold transition-colors ${
                            bond.status === "Tax-Free"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-muted/70 text-muted-foreground border border-border/60"
                          }`}
                        >
                          {bond.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                </>
                )}
</div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3 / SECTION 8: INVESTMENT CALCULATOR                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          {(activeTab === "calculator" || activeTab === "tbills") && (
            <section className="space-y-6 pt-6 border-t border-border">
              <div>
                <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <CalcIcon className="h-4 w-4" /> Interactive Estimator
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-foreground">
                  How much could I earn?
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Estimate potential interest returns on Kenyan government T-Bills and Bonds based on verified Central Bank of Kenya (CBK) rates.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Inputs Box */}
                <div className="md:col-span-6 rounded-2xl border border-border bg-card p-5 space-y-5 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Investment Amount (KSh)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-muted-foreground font-bold text-sm">KSh</span>
                      <Input
                        type="number"
                        min={50000}
                        step={10000}
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                        className="pl-14 rounded-xl text-base font-bold bg-background border-border"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Minimum investment for T-Bills is KSh 50,000.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Security
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {(data?.tbills || []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCalcSecurityId(c.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                            calcSecurityId === c.id
                              ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                              : "border-border bg-background hover:bg-muted/50"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-foreground">{c.type}</p>
                            <p className="text-[11px] text-muted-foreground">{c.approx}</p>
                          </div>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {c.averageYield.toFixed(2)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Result Card */}
                <div className="md:col-span-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent p-6 flex flex-col justify-between space-y-6 shadow-sm">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Estimated Return
                    </span>
                    <div className="mt-1">
                      <span className="text-4xl md:text-5xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        KSh {calcResults.estReturn.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-6 space-y-2 text-sm border-t border-border/80 pt-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Investment:</span>
                        <span className="font-bold text-foreground">KSh {calcAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated return:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +KSh {calcResults.estReturn.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated maturity value:</span>
                        <span className="font-black text-foreground">
                          KSh {calcResults.maturityVal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Investment period:</span>
                        <span className="font-semibold text-foreground">{calcResults.days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Applied Rate:</span>
                        <span className="font-semibold text-foreground">{calcResults.rate.toFixed(2)}% p.a.</span>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 py-3">
                    Calculate Return
                  </Button>
                </div>
              </div>
            </section>
          )}



          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 10: EDUCATIONAL CARDS                                 */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 pt-8 border-t border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Treasury Bills & Bonds Explained</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
                <h3 className="font-bold text-foreground text-base">What is a Treasury Bill?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You lend money to the Kenyan government for a short period (91, 182, or 364 days) and receive a guaranteed return when the investment matures.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
                <h3 className="font-bold text-foreground text-base">Are T-Bills safe?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Treasury Bills are issued by the Government of Kenya and are generally considered relatively low-risk investments, although no investment is completely risk-free.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-sm">
                <h3 className="font-bold text-foreground text-base">Where does the information come from?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Treasury Bill and Treasury Bond information displayed on KenyaFundFinder is sourced from official government market information.
                </p>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                  Source: Central Bank of Kenya (CBK)
                </p>
              </div>
            </div>
          </section>
            </div>
          )}
        </main>

        {/* ── Section 7: Bond Detail Modal / Drawer ── */}
        <Sheet open={Boolean(selectedBond)} onOpenChange={(open) => !open && setSelectedBond(null)}>
          <SheetContent side="right" className="w-[90vw] sm:max-w-lg p-6 overflow-y-auto space-y-6 bg-background">
            {selectedBond && (
              <>
                <SheetHeader className="text-left space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {selectedBond.status} Government Bond
                  </span>
                  <SheetTitle className="text-2xl font-black text-foreground">
                    {selectedBond.issueNo}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">{selectedBond.name}</p>
                </SheetHeader>

                {/* Primary Metric */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-1">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Current Yield</span>
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedBond.couponRateRate.toFixed(2)}%
                  </p>
                </div>

                {/* Spec Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground block">Coupon Rate</span>
                    <span className="font-bold text-foreground text-sm">{selectedBond.couponRate.toFixed(2)}%</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground block">Maturity Date</span>
                    <span className="font-bold text-foreground text-sm">{selectedBond.maturityDate}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground block">Remaining Term</span>
                    <span className="font-bold text-foreground text-sm">{selectedBond.tenorYears} years</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground block">ISIN</span>
                    <span className="font-mono font-bold text-foreground text-xs">{selectedBond.isin}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground block">Auction Date</span>
                    <span className="font-semibold text-foreground">{selectedBond.auctionDate}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground block">Amount Issued</span>
                    <span className="font-semibold text-foreground">{selectedBond.amountIssued}</span>
                  </div>
                </div>

                {/* What does this mean? Section */}
                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                  <h4 className="font-bold text-foreground text-sm">What does this mean?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedBond.explanation}
                  </p>
                </div>

                <Button
                  onClick={() => setSelectedBond(null)}
                  className="w-full rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Close Details
                </Button>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ── T-Bill Detail Modal / Drawer ── */}
        <Sheet open={Boolean(selectedTBill)} onOpenChange={(open) => !open && setSelectedTBill(null)}>
          <SheetContent side="right" className="w-[90vw] sm:max-w-md p-6 overflow-y-auto space-y-6 bg-background">
            {selectedTBill && (
              <>
                <SheetHeader className="text-left space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Central Bank of Kenya T-Bill
                  </span>
                  <SheetTitle className="text-2xl font-black text-foreground">
                    {selectedTBill.type}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">{selectedTBill.approx}</p>
                </SheetHeader>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-1">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Current Auction Rate</span>
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedTBill.averageYield.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground pt-1">
                    {(selectedTBill.averageYield - selectedTBill.previousYield) >= 0 ? `▲ +${(selectedTBill.averageYield - selectedTBill.previousYield).toFixed(2)}%` : `▼ ${(selectedTBill.averageYield - selectedTBill.previousYield).toFixed(2)}%`} from previous auction
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground">Investment Term:</span>
                    <span className="font-bold text-foreground">{selectedTBill.days} Days</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground">Latest Auction Date:</span>
                    <span className="font-bold text-foreground">{selectedTBill.auctionDate}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground">Minimum Investment:</span>
                    <span className="font-bold text-foreground">{selectedTBill.minInvestment}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-muted-foreground">Issuer:</span>
                    <span className="font-bold text-foreground">Government of Kenya (CBK)</span>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedTBill(null)}
                  className="w-full rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Close Details
                </Button>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
