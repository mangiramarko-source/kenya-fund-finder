import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  Landmark,
  GitCompareArrows,
  Sparkles,
  Briefcase,
  Layers,
  Scale,
} from "lucide-react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { isBotOrPrerender } from "@/hooks/useSoftWallTrigger";
import PageLoadingGate from "@/components/PageLoadingGate";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { fetchFunds, fetchLatestSnapshots, type FundFromDB, type YieldSnapshot } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";
import { FALLBACK_KENYAN_STOCKS } from "@/lib/stockDataFallback";
import { fetchBankFixedDeposits, fetchSaccoRecords } from "@/lib/savingsApi";
import type { BankFixedDeposit, SaccoRecord } from "@/types/savings";
import { CompareWorkbench, type UniversalCompareEntity } from "@/components/compare/CompareWorkbench";
import { CompareCatalogStocks } from "@/components/compare/CompareCatalogStocks";
import { CompareCatalogFunds } from "@/components/compare/CompareCatalogFunds";
import { CompareCatalogRates } from "@/components/compare/CompareCatalogRates";
import { CompareCatalogSavings } from "@/components/compare/CompareCatalogSavings";

type CompareTab = "stocks" | "funds" | "rates" | "savings" | "cross-asset";

const T_BILLS_BENCHMARKS = [
  {
    id: "tbill-91",
    name: "91-Day Treasury Bill",
    code: "CBK-91D",
    grossRatePct: 15.35,
    netRatePct: 13.05,
    tenor: "91 Days (3 Months)",
  },
  {
    id: "tbill-182",
    name: "182-Day Treasury Bill",
    code: "CBK-182D",
    grossRatePct: 15.55,
    netRatePct: 13.22,
    tenor: "182 Days (6 Months)",
  },
  {
    id: "tbill-364",
    name: "364-Day Treasury Bill",
    code: "CBK-364D",
    grossRatePct: 15.80,
    netRatePct: 13.43,
    tenor: "364 Days (12 Months)",
  },
];

const FALLBACK_RATES = [
  { id: "usd", currency_code: "USD", currency_name: "US Dollar", rate: 129.85, previous_rate: 130.10 },
  { id: "eur", currency_code: "EUR", currency_name: "Euro", rate: 138.40, previous_rate: 138.20 },
  { id: "gbp", currency_code: "GBP", currency_name: "Sterling Pound", rate: 165.70, previous_rate: 165.90 },
  { id: "tzs", currency_code: "TZS", currency_name: "Tanzania Shilling", rate: 0.051, previous_rate: 0.051 },
  { id: "ugx", currency_code: "UGX", currency_name: "Uganda Shilling", rate: 0.035, previous_rate: 0.035 },
  { id: "cny", currency_code: "CNY", currency_name: "Chinese Yuan", rate: 17.95, previous_rate: 17.92 },
  { id: "jpy", currency_code: "JPY", currency_name: "Japanese Yen", rate: 0.86, previous_rate: 0.85 },
];

export const ComparePage: React.FC = () => {
  useDocumentTitle(
    "Asset Comparison Hub – Compare Kenyan Stocks, MMFs & Fixed Income",
    "Compare Nairobi Securities Exchange (NSE) stocks, money market funds, CBK exchange rates, and bank fixed deposits side-by-side with live metrics.",
    {
      title: "Asset Comparison Hub – Compare Kenyan Stocks, MMFs & Fixed Income",
      description: "Side-by-side comparison of Kenya's stocks, money market funds, exchange rates, and SACCO deposits.",
    }
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Kenya Asset Comparison Hub",
    description: "Compare Kenya's top stocks, money market funds, foreign exchange rates, and fixed income deposits side-by-side.",
    url: "https://kenyafundfinder.com/compare",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const legacyType = searchParams.get("type");

  const [activeTab, setActiveTab] = useState<CompareTab>(() => {
    if (rawTab === "stocks" || rawTab === "funds" || rawTab === "rates" || rawTab === "savings" || rawTab === "cross-asset") {
      return rawTab;
    }
    if (legacyType) return "funds";
    return "stocks";
  });

  // Keep state synced if URL changes
  useEffect(() => {
    if (rawTab && rawTab !== activeTab) {
      if (rawTab === "stocks" || rawTab === "funds" || rawTab === "rates" || rawTab === "savings" || rawTab === "cross-asset") {
        setActiveTab(rawTab);
      }
    }
  }, [rawTab]);

  const handleTabChange = (tab: CompareTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // ─── Data Loading States ───
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [stocks, setStocks] = useState<any[]>(FALLBACK_KENYAN_STOCKS);
  const [rates, setRates] = useState<any[]>(FALLBACK_RATES);
  const [fixedDeposits, setFixedDeposits] = useState<BankFixedDeposit[]>([]);
  const [saccos, setSaccos] = useState<SaccoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [fundsRes, stocksRes, ratesRes, fdRes, saccoRes] = await Promise.allSettled([
          fetchFunds(),
          fetchPublicData<any>("stocks", { select: "*", order: { column: "market_cap", ascending: false } }),
          fetchPublicData<any>("cbk_exchange_rates", { select: "*" }),
          fetchBankFixedDeposits(),
          fetchSaccoRecords(),
        ]);

        if (!isMounted) return;

        if (fundsRes.status === "fulfilled" && fundsRes.value?.length > 0) {
          setFunds(fundsRes.value);
        }

        if (stocksRes.status === "fulfilled" && stocksRes.value?.length > 0) {
          setStocks(stocksRes.value);
        } else {
          setStocks(FALLBACK_KENYAN_STOCKS);
        }

        if (ratesRes.status === "fulfilled" && ratesRes.value?.length > 0) {
          setRates(ratesRes.value);
        } else {
          setRates(FALLBACK_RATES);
        }

        if (fdRes.status === "fulfilled") {
          setFixedDeposits(fdRes.value);
        }

        if (saccoRes.status === "fulfilled") {
          setSaccos(saccoRes.value);
        }
      } catch (err) {
        console.warn("Compare page data fetch failed", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Normalized Entities ───
  const stockEntities: UniversalCompareEntity[] = useMemo(() => {
    return stocks.map((s) => ({
      id: `stock-${s.symbol || s.id}`,
      type: "stock" as const,
      title: s.name,
      subtitle: s.sector || "Equities",
      symbol: s.symbol,
      badge: "NSE Stock",
      link: `/stocks/${encodeURIComponent(s.symbol)}`,
      metrics: {
        priceKes: Number(s.price || 0),
        dayChangePct: Number(s.day_change_percent || 0),
        peRatio: s.pe_ratio != null ? Number(s.pe_ratio) : undefined,
        dividendYieldPct: s.dividend_yield != null ? Number(s.dividend_yield) : 0,
        sectorOrType: s.sector || "Equities",
        marketCapFormatted:
          s.market_cap != null
            ? s.market_cap >= 1e12
              ? `KES ${(s.market_cap / 1e12).toFixed(1)}T`
              : s.market_cap >= 1e9
              ? `KES ${(s.market_cap / 1e9).toFixed(1)}B`
              : `KES ${(s.market_cap / 1e6).toFixed(0)}M`
            : "—",
        riskLevel: "Equity Market Risk",
        regulator: "CMA Regulated",
        tenorOrWithdrawal: "T+2 Settlement (NSE)",
      },
      raw: s,
    }));
  }, [stocks]);

  const fundEntities: UniversalCompareEntity[] = useMemo(() => {
    return funds.map((f) => {
      const y = f.effective_yield || f.annual_yield || 0;
      return {
        id: `fund-${f.id}`,
        type: "fund" as const,
        title: f.name,
        subtitle: f.manager,
        symbol: f.name.substring(0, 4).toUpperCase(),
        badge: f.fund_type === "money_market" ? "MMF" : "Unit Trust",
        link: f.slug ? `/compare/${f.slug}` : "/compare",
        metrics: {
          primaryYieldOrReturnPct: y,
          netReturnPct: Number((y * 0.85).toFixed(2)),
          managementFeePct: f.management_fee ? Number(f.management_fee) : undefined,
          minDepositKes: f.minimum_investment ? Number(f.minimum_investment) : 1000,
          sectorOrType: f.fund_type || "Money Market",
          riskLevel: "Low / Capital Preservation",
          regulator: "CMA Regulated",
          tenorOrWithdrawal: "Daily (24 to 48 hrs)",
        },
        raw: f,
      };
    });
  }, [funds]);

  const rateEntities: UniversalCompareEntity[] = useMemo(() => {
    return rates.map((r) => {
      const cur = Number(r.rate || 0);
      const prev = r.previous_rate != null ? Number(r.previous_rate) : null;
      const diffPct = prev && prev > 0 ? ((cur - prev) / prev) * 100 : undefined;

      return {
        id: `rate-${r.currency_code}`,
        type: "currency" as const,
        title: r.currency_name || r.currency_code,
        subtitle: `CBK Mean Exchange Rate`,
        symbol: r.currency_code,
        badge: "FX Currency",
        link: "/rates",
        metrics: {
          priceKes: cur,
          dayChangePct: diffPct,
          currencyCode: r.currency_code,
          sectorOrType: "Foreign Exchange",
          riskLevel: "Currency Fluctuations",
          regulator: "CBK Monitored",
          tenorOrWithdrawal: "Immediate (Cash / Forex)",
        },
        raw: r,
      };
    });
  }, [rates]);

  const savingsEntities: UniversalCompareEntity[] = useMemo(() => {
    const list: UniversalCompareEntity[] = [];

    // Bank Fixed Deposits
    fixedDeposits.slice(0, 15).forEach((fd) => {
      list.push({
        id: `fd-${fd.id}`,
        type: "savings" as const,
        title: `${fd.bankName} Fixed Deposit`,
        subtitle: `${fd.tenorMonths}-Month Tenor · ${fd.bankTier ? `Tier ${fd.bankTier} Bank` : "Commercial Bank"}`,
        symbol: fd.bankCode || "BANK",
        badge: "Bank Fixed Deposit",
        link: "/savings",
        metrics: {
          primaryYieldOrReturnPct: fd.grossYieldPct,
          netReturnPct: fd.netYieldPct,
          minDepositKes: fd.minDeposit,
          tenorOrWithdrawal: `${fd.tenorMonths} Months Locked`,
          riskLevel: "Low / Capital Preservation",
          regulator: "KDIC Insured Bank",
          sectorOrType: "Bank Deposit",
        },
        raw: fd,
      });
    });

    // SACCOs
    saccos.slice(0, 15).forEach((sac) => {
      list.push({
        id: `sacco-${sac.id}`,
        type: "savings" as const,
        title: `${sac.name} Rebate`,
        subtitle: `${sac.membershipCategory} · SASRA Licensed`,
        symbol: sac.code || "SACCO",
        badge: "Regulated SACCO",
        link: "/savings?tab=saccos",
        metrics: {
          primaryYieldOrReturnPct: sac.interestOnDepositsPct,
          netReturnPct: sac.netInterestPct,
          minDepositKes: sac.minMonthlyContribution,
          tenorOrWithdrawal: "Annual Dividend Distribution",
          riskLevel: "Low / Capital Preservation",
          regulator: "SASRA Regulated",
          sectorOrType: "Member Deposit",
        },
        raw: sac,
      });
    });

    // Government Treasury Bills
    T_BILLS_BENCHMARKS.forEach((tb) => {
      list.push({
        id: `tbill-${tb.id}`,
        type: "savings" as const,
        title: tb.name,
        subtitle: `Central Bank of Kenya Auction Benchmark`,
        symbol: tb.code,
        badge: "Government T-Bill",
        link: "/treasury",
        metrics: {
          primaryYieldOrReturnPct: tb.grossRatePct,
          netReturnPct: tb.netRatePct,
          minDepositKes: 50000,
          tenorOrWithdrawal: tb.tenor,
          riskLevel: "Low / Capital Preservation",
          regulator: "CBK Monitored",
          sectorOrType: "Sovereign Debt",
        },
      });
    });

    return list;
  }, [fixedDeposits, saccos]);

  // All Cross-Asset Entities
  const crossAssetEntities = useMemo(() => {
    return [
      ...fundEntities.slice(0, 20),
      ...stockEntities.slice(0, 20),
      ...savingsEntities,
      ...rateEntities.slice(0, 10),
    ];
  }, [fundEntities, stockEntities, savingsEntities, rateEntities]);

  // ─── Selected Items per Tab ───
  const [selectedStocks, setSelectedStocks] = useState<UniversalCompareEntity[]>([]);
  const [selectedFunds, setSelectedFunds] = useState<UniversalCompareEntity[]>([]);
  const [selectedRates, setSelectedRates] = useState<UniversalCompareEntity[]>([]);
  const [selectedSavings, setSelectedSavings] = useState<UniversalCompareEntity[]>([]);
  const [selectedCross, setSelectedCross] = useState<UniversalCompareEntity[]>([]);

  // Seed default selections on load
  useEffect(() => {
    if (stockEntities.length > 0 && selectedStocks.length === 0) {
      const scom = stockEntities.find((s) => s.symbol === "SCOM") || stockEntities[0];
      const eqty = stockEntities.find((s) => s.symbol === "EQTY") || stockEntities[1];
      if (scom && eqty) setSelectedStocks([scom, eqty]);
    }
  }, [stockEntities, selectedStocks.length]);

  useEffect(() => {
    if (fundEntities.length > 0 && selectedFunds.length === 0) {
      const kuza = fundEntities.find((f) => f.title.toLowerCase().includes("kuza")) || fundEntities[0];
      const etica = fundEntities.find((f) => f.title.toLowerCase().includes("etica")) || fundEntities[1];
      if (kuza && etica) setSelectedFunds([kuza, etica]);
    }
  }, [fundEntities, selectedFunds.length]);

  useEffect(() => {
    if (rateEntities.length > 0 && selectedRates.length === 0) {
      const usd = rateEntities.find((r) => r.symbol === "USD") || rateEntities[0];
      const eur = rateEntities.find((r) => r.symbol === "EUR") || rateEntities[1];
      const gbp = rateEntities.find((r) => r.symbol === "GBP") || rateEntities[2];
      if (usd && eur && gbp) setSelectedRates([usd, eur, gbp]);
    }
  }, [rateEntities, selectedRates.length]);

  useEffect(() => {
    if (savingsEntities.length > 0 && selectedSavings.length === 0) {
      const fd = savingsEntities.find((s) => s.badge === "Bank Fixed Deposit") || savingsEntities[0];
      const sac = savingsEntities.find((s) => s.badge === "Regulated SACCO") || savingsEntities[1];
      const tb = savingsEntities.find((s) => s.badge === "Government T-Bill") || savingsEntities[2];
      if (fd && sac && tb) setSelectedSavings([fd, sac, tb]);
    }
  }, [savingsEntities, selectedSavings.length]);

  useEffect(() => {
    if (crossAssetEntities.length > 0 && selectedCross.length === 0) {
      const mmf = fundEntities[0];
      const tb = savingsEntities.find((s) => s.badge === "Government T-Bill");
      const st = stockEntities.find((s) => s.symbol === "EQTY" || s.symbol === "SCOM");
      if (mmf && tb && st) setSelectedCross([mmf, tb, st]);
    }
  }, [crossAssetEntities, selectedCross.length, fundEntities, savingsEntities, stockEntities]);

  // Current active collection
  const activeData = useMemo(() => {
    switch (activeTab) {
      case "stocks":
        return {
          selected: selectedStocks,
          available: stockEntities,
          setSelected: setSelectedStocks,
        };
      case "funds":
        return {
          selected: selectedFunds,
          available: fundEntities,
          setSelected: setSelectedFunds,
        };
      case "rates":
        return {
          selected: selectedRates,
          available: rateEntities,
          setSelected: setSelectedRates,
        };
      case "savings":
        return {
          selected: selectedSavings,
          available: savingsEntities,
          setSelected: setSelectedSavings,
        };
      case "cross-asset":
      default:
        return {
          selected: selectedCross,
          available: crossAssetEntities,
          setSelected: setSelectedCross,
        };
    }
  }, [
    activeTab,
    selectedStocks,
    stockEntities,
    selectedFunds,
    fundEntities,
    selectedRates,
    rateEntities,
    selectedSavings,
    savingsEntities,
    selectedCross,
    crossAssetEntities,
  ]);

  const handleAddItem = (item: UniversalCompareEntity) => {
    if (activeData.selected.length >= 4) return;
    if (activeData.selected.some((s) => s.id === item.id)) return;
    activeData.setSelected([...activeData.selected, item]);
  };

  const handleRemoveItem = (id: string) => {
    activeData.setSelected(activeData.selected.filter((s) => s.id !== id));
  };

  const handleSwapItem = (oldId: string, newItem: UniversalCompareEntity) => {
    activeData.setSelected(activeData.selected.map((s) => (s.id === oldId ? newItem : s)));
  };

  const handleToggleCompare = (item: UniversalCompareEntity) => {
    if (activeData.selected.some((s) => s.id === item.id)) {
      handleRemoveItem(item.id);
    } else {
      handleAddItem(item);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-flex items-center gap-1">
                <GitCompareArrows className="w-3.5 h-3.5" />
                <span>Side-by-Side Analysis</span>
              </span>
              <SectionLiveStatus source="CBK & NSE" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Asset Comparison Hub
            </h1>

            <p className="text-sm text-muted-foreground max-w-2xl">
              Compare Kenyan stocks, money market funds, exchange rates, and bank fixed deposits head-to-head with live pricing, dividends, and net returns.
            </p>
          </div>
        </div>

        {/* ─── CATEGORY TABS ─── */}
        <div className="border-b border-border/80">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "stocks", label: "NSE Stocks", icon: BarChart3, count: stocks.length },
              { id: "funds", label: "Funds & MMFs", icon: Briefcase, count: funds.length },
              { id: "rates", label: "Forex Rates", icon: ArrowUpDown, count: rates.length },
              { id: "savings", label: "Savings & Fixed Deposits", icon: Landmark, count: fixedDeposits.length + saccos.length },
              { id: "cross-asset", label: "Cross-Asset Duel", icon: Sparkles, count: "All" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id as CompareTab)}
                  className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                        isActive
                          ? "bg-background/20 text-background"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─── ACTIVE COMPARISON WORKBENCH ─── */}
        {loading ? (
          <PageLoadingGate />
        ) : (
          <div className="space-y-8">
            <CompareWorkbench
              category={activeTab}
              selectedItems={activeData.selected}
              availableItems={activeData.available}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onSwapItem={handleSwapItem}
              onLoadPreset={(items) => activeData.setSelected(items)}
            />

            {/* ─── SEARCHABLE CATALOG TABLE BELOW WORKBENCH ─── */}
            {activeTab === "stocks" && (
              <CompareCatalogStocks
                stocks={stockEntities}
                selectedItems={activeData.selected}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {activeTab === "funds" && (
              <CompareCatalogFunds
                funds={fundEntities}
                selectedItems={activeData.selected}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {activeTab === "rates" && (
              <CompareCatalogRates
                rates={rateEntities}
                selectedItems={activeData.selected}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {activeTab === "savings" && (
              <CompareCatalogSavings
                savings={savingsEntities}
                selectedItems={activeData.selected}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {activeTab === "cross-asset" && (
              <div className="space-y-6 pt-4 border-t border-border/60">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Browse All Kenyan Asset Classes for Cross-Asset Comparison
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Compare any Money Market Fund, NSE share, Treasury Bill, or Bank deposit against each other.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-foreground block">Top NSE Stocks</span>
                    <CompareCatalogStocks
                      stocks={stockEntities.slice(0, 10)}
                      selectedItems={activeData.selected}
                      onToggleCompare={handleToggleCompare}
                    />
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-foreground block">Top Unit Trusts</span>
                    <CompareCatalogFunds
                      funds={fundEntities.slice(0, 10)}
                      selectedItems={activeData.selected}
                      onToggleCompare={handleToggleCompare}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePage;
