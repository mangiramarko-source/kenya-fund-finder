import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, TrendingUp, TrendingDown, Minus, DollarSign, Gem, BarChart3, Landmark,
  ArrowRight, Settings2, Search, SlidersHorizontal, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMarketData } from "@/components/home/MarketTicker";
import { usePriceAlerts, type PriceAlert, type AlertAssetType } from "@/hooks/usePriceAlerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import WatchCard, { type AlertState } from "@/components/watchlist/WatchCard";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import { fetchFunds, FUND_TYPE_LABELS, type FundFromDB, type FundType } from "@/lib/api";
import { computeAlertSummary } from "@/lib/watchlistAlertSummary";
import { useUnifiedWatchlist, type UnifiedWatchlistItem as WatchlistItem } from "@/hooks/useUnifiedWatchlist";
import WatchlistAlertsTabs from "@/components/watchlist/WatchlistAlertsTabs";
import MobileWatchlistAlertsPanel, { type WatchlistAlertAsset } from "@/components/watchlist/MobileWatchlistAlertsPanel";
import KoraIllustration from "@/components/kora/KoraIllustration";

interface RateHistoryRow { snapshot_date: string; rate: number; currency_code: string }
interface StockHistoryRow { snapshot_date: string; price: number; stock_id: string }
interface FundSnapshotRow { snapshot_date: string; annual_yield: number; fund_id: string }

type MobileWatchlistFilter = "all" | "funds" | "stocks" | "rates" | "commodities";
type AddWatchlistType = "fund" | "stock" | "currency" | "commodity";
type AddSheetItem = {
  id: string;
  name: string;
  sub: string;
  value: string;
  group?: string;
};

const ADD_WATCHLIST_OPTIONS: Array<{ key: AddWatchlistType; label: string }> = [
  { key: "fund", label: "Funds" },
  { key: "stock", label: "Stocks" },
  { key: "currency", label: "FX Rates" },
  { key: "commodity", label: "Commodities" },
];

const ADD_FUND_TYPE_ORDER: FundType[] = [
  "money_market",
  "fixed_income",
  "bond",
  "balanced",
  "equity",
  "special",
];

const ADD_FUND_TYPE_SHORT_LABELS: Record<FundType, string> = {
  money_market: "MMF",
  fixed_income: "Fixed Income",
  bond: "Bond",
  balanced: "Balanced",
  equity: "Equity",
  special: "Special",
};

export default function MobileWatchlistView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rates, stocks, commodities, loading: marketLoading } = useMarketData();
  const {
    items: watchlist,
    loading: watchlistLoading,
    hasLocalState: hasLocalWatchlistState,
    addToWatchlist,
    removeFromWatchlist,
  } = useUnifiedWatchlist();
  const { alerts, deleteAlert, toggleAlert } = usePriceAlerts();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [rateHistory, setRateHistory] = useState<RateHistoryRow[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryRow[]>([]);
  const [fundHistory, setFundHistory] = useState<FundSnapshotRow[]>([]);
  const [mobileFilter, setMobileFilter] = useState<MobileWatchlistFilter>("all");
  const [mobileTab, setMobileTab] = useState<"watchlist" | "alerts">("watchlist");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addType, setAddType] = useState<AddWatchlistType>("fund");
  const [addSearch, setAddSearch] = useState("");
  const [search, setSearch] = useState("");
  const [mobileAlertPickerOpen, setMobileAlertPickerOpen] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    assetType: AlertAssetType;
    assetId: string;
    assetName: string;
    currentPrice: number;
    unit?: string;
  } | null>(null);

  useEffect(() => {
    fetchFunds().then((data) => {
      setFunds(data);
      setFundsLoading(false);
    });

    supabase
      .from("exchange_rate_history_public" as any)
      .select("snapshot_date, rate, currency_code")
      .order("snapshot_date", { ascending: true })
      .limit(300)
      .then(({ data }) => setRateHistory((data as any) || []));

    supabase
      .from("stock_history_public" as any)
      .select("snapshot_date, price, stock_id")
      .order("snapshot_date", { ascending: true })
      .limit(300)
      .then(({ data }) => setStockHistory((data as any) || []));

    supabase
      .from("fund_daily_yields_public" as any)
      .select("snapshot_date, annual_yield, fund_id")
      .order("snapshot_date", { ascending: true })
      .limit(500)
      .then(({ data }) => setFundHistory((data as any) || []));
  }, []);

  const getFundSpark = (fundId: string): number[] =>
    fundHistory.filter((h) => h.fund_id === fundId).map((h) => Number(h.annual_yield));
  const getStockSpark = (stockId: string): number[] =>
    stockHistory.filter((h) => h.stock_id === stockId).map((h) => Number(h.price));
  const getRateSpark = (code: string): number[] =>
    rateHistory.filter((h) => h.currency_code === code).map((h) => Number(h.rate));

  const removeByTypeAndId = async (itemType: string, itemId: string) => {
    const entry = watchlist.find((w) => w.item_type === itemType && w.item_id === itemId);
    if (!entry) return;
    const res = await removeFromWatchlist(entry.id);
    if (res.ok) {
      toast.success("Removed from watchlist");
    } else {
      toast.error("Failed to remove item");
    }
  };

  const demoWatchlist = useMemo<WatchlistItem[]>(() => {
    if (user || hasLocalWatchlistState || watchlist.length > 0) return [];
    const samples = [
      funds[0] && { type: "fund", id: funds[0].id, name: funds[0].name },
      stocks[0] && { type: "stock", id: stocks[0].id, name: stocks[0].name },
      rates[0] && { type: "currency", id: rates[0].id, name: rates[0].currency_name },
      commodities[0] && { type: "commodity", id: commodities[0].id, name: commodities[0].name },
    ].filter(Boolean) as Array<{ type: string; id: string; name: string }>;

    return samples.map((sample, index) => ({
      id: `demo-${sample.type}-${sample.id}`,
      user_id: "guest",
      item_type: sample.type,
      item_id: sample.id,
      item_name: sample.name,
      sort_order: index,
    }));
  }, [commodities, funds, hasLocalWatchlistState, rates, stocks, user, watchlist.length]);

  const effectiveWatchlist = watchlist.length > 0 ? watchlist : demoWatchlist;
  const showingGuestDemo = !user && watchlist.length === 0 && demoWatchlist.length > 0;

  const watchedStocks = useMemo(() => {
    const ids = new Set(effectiveWatchlist.filter((w) => w.item_type === "stock").map((w) => w.item_id));
    return stocks.filter((s) => ids.has(s.id));
  }, [stocks, effectiveWatchlist]);

  const watchedRates = useMemo(() => {
    const ids = new Set(effectiveWatchlist.filter((w) => w.item_type === "currency").map((w) => w.item_id));
    return rates.filter((r) => ids.has(r.id));
  }, [rates, effectiveWatchlist]);

  const watchedCommodities = useMemo(() => {
    const ids = new Set(effectiveWatchlist.filter((w) => w.item_type === "commodity").map((w) => w.item_id));
    return commodities.filter((c) => ids.has(c.id));
  }, [commodities, effectiveWatchlist]);

  const watchedFunds = useMemo(() => {
    const ids = new Set(effectiveWatchlist.filter((w) => w.item_type === "fund").map((w) => w.item_id));
    return funds.filter((f) => ids.has(f.id));
  }, [funds, effectiveWatchlist]);

  const mobileAlertAssets = useMemo<WatchlistAlertAsset[]>(() => [
    ...watchedStocks.map((asset) => ({ type: "stock" as const, id: asset.id, name: `${asset.name} (${asset.symbol})`, value: Number(asset.price), unit: "KES" })),
    ...watchedFunds.map((asset) => ({ type: "fund" as const, id: asset.id, name: asset.name, value: Number(asset.annual_yield), unit: "%" })),
    ...watchedRates.map((asset) => ({ type: "currency" as const, id: asset.id, name: `${asset.currency_code}/KES`, value: Number(asset.rate), unit: "KES" })),
    ...watchedCommodities.map((asset) => ({ type: "commodity" as const, id: asset.id, name: asset.name, value: Number(asset.price), unit: asset.unit })),
  ], [watchedCommodities, watchedFunds, watchedRates, watchedStocks]);

  const normalizedSearch = search.trim().toLowerCase();
  const fundMatchesSearch = useCallback((f: FundFromDB) => {
    if (!normalizedSearch) return true;
    return [f.name, f.manager, f.slug, FUND_TYPE_LABELS[f.fund_type as FundType] || f.fund_type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const stockMatchesSearch = useCallback((s: any) => {
    if (!normalizedSearch) return true;
    return [s.symbol, s.name, s.sector]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const rateMatchesSearch = useCallback((r: any) => {
    if (!normalizedSearch) return true;
    return [r.currency_code, r.currency_name, `${r.currency_code}/KES`]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const commodityMatchesSearch = useCallback((c: any) => {
    if (!normalizedSearch) return true;
    return [c.name, c.symbol, c.unit]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const fundsByType = useMemo(() => {
    const grouped: Record<string, FundFromDB[]> = {};
    watchedFunds.filter(fundMatchesSearch).forEach((f) => {
      const key = f.fund_type || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    });
    return grouped;
  }, [watchedFunds, fundMatchesSearch]);

  const filteredWatchedFunds = useMemo(() => watchedFunds.filter(fundMatchesSearch), [watchedFunds, fundMatchesSearch]);
  const filteredWatchedStocks = useMemo(() => watchedStocks.filter(stockMatchesSearch), [watchedStocks, stockMatchesSearch]);
  const filteredWatchedRates = useMemo(() => watchedRates.filter(rateMatchesSearch), [watchedRates, rateMatchesSearch]);
  const filteredWatchedCommodities = useMemo(() => watchedCommodities.filter(commodityMatchesSearch), [watchedCommodities, commodityMatchesSearch]);

  const totalCount = watchedStocks.length + watchedRates.length + watchedCommodities.length + watchedFunds.length;
  const loading = marketLoading || fundsLoading || watchlistLoading;
  const isEmpty = !loading && totalCount === 0;

  const visibleCount =
    filteredWatchedFunds.length +
    filteredWatchedStocks.length +
    filteredWatchedRates.length +
    filteredWatchedCommodities.length;

  const mobileFilterOptions = [
    { key: "all" as const, label: "All", count: visibleCount },
    { key: "funds" as const, label: "Funds", count: filteredWatchedFunds.length },
    { key: "stocks" as const, label: "Stocks", count: filteredWatchedStocks.length },
    { key: "rates" as const, label: "FX Rates", count: filteredWatchedRates.length },
    { key: "commodities" as const, label: "Commodities", count: filteredWatchedCommodities.length },
  ];

  const showFundsSection = mobileFilter === "all" || mobileFilter === "funds";
  const showStocksSection = mobileFilter === "all" || mobileFilter === "stocks";
  const showRatesSection = mobileFilter === "all" || mobileFilter === "rates";
  const showCommoditiesSection = mobileFilter === "all" || mobileFilter === "commodities";
  const mobileHasResults = visibleCount > 0;

  const normalizedAddSearch = addSearch.trim().toLowerCase();
  const addSheetItems = useMemo<AddSheetItem[]>(() => {
    const matches = (...values: Array<string | null | undefined>) =>
      !normalizedAddSearch || values.some((value) => String(value || "").toLowerCase().includes(normalizedAddSearch));

    if (addType === "fund") {
      return funds
        .filter((fund) => matches(fund.name, fund.manager, fund.slug, FUND_TYPE_LABELS[fund.fund_type as FundType]))
        .slice(0, 40)
        .map((fund) => ({
          id: fund.id,
          name: fund.name,
          sub: fund.manager || FUND_TYPE_LABELS[fund.fund_type as FundType] || "Fund",
          value: `${fund.annual_yield.toFixed(2)}%`,
          group: fund.fund_type || "money_market",
        }));
    }

    if (addType === "stock") {
      return stocks
        .filter((stock: any) => matches(stock.symbol, stock.name, stock.sector))
        .slice(0, 40)
        .map((stock: any) => ({
          id: stock.id,
          name: stock.name,
          sub: stock.symbol,
          value: `KES ${Number(stock.price || 0).toFixed(2)}`,
        }));
    }

    if (addType === "currency") {
      return rates
        .filter((rate: any) => matches(rate.currency_code, rate.currency_name, `${rate.currency_code}/KES`))
        .slice(0, 40)
        .map((rate: any) => ({
          id: rate.id,
          name: `${rate.currency_code}/KES`,
          sub: rate.currency_name,
          value: `KES ${Number(rate.rate || 0).toFixed(2)}`,
        }));
    }

    return commodities
      .filter((commodity: any) => matches(commodity.name, commodity.symbol, commodity.unit))
      .slice(0, 40)
      .map((commodity: any) => ({
        id: commodity.id,
        name: commodity.name,
        sub: commodity.symbol || commodity.unit,
        value: `${Number(commodity.price || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${commodity.unit || ""}`.trim(),
      }));
  }, [addType, commodities, funds, normalizedAddSearch, rates, stocks]);

  const groupedAddFundItems = useMemo(() => {
    const grouped: Record<string, AddSheetItem[]> = {};
    addSheetItems.forEach((item) => {
      const key = item.group || "money_market";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    const orderedKeys = [
      ...ADD_FUND_TYPE_ORDER.filter((key) => grouped[key]?.length),
      ...Object.keys(grouped).filter((key) => !ADD_FUND_TYPE_ORDER.includes(key as FundType)),
    ];
    return orderedKeys.map((key) => ({
      key,
      label: ADD_FUND_TYPE_SHORT_LABELS[key as FundType] || key.replace(/_/g, " "),
      items: grouped[key],
    }));
  }, [addSheetItems]);

  const watchCardStatusClass = "mt-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground";

  return (
    <div className="space-y-4 px-4 py-3">
      {/* Search & Filter Bar */}
      <div>
        {showingGuestDemo && (
          <p className="mb-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            Demo watchlist · Sign in only when you want to save across devices.
          </p>
        )}

        {!loading && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                <Input
                  placeholder={mobileTab === "watchlist" ? "Search saved assets..." : "Search alerts..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-full bg-card border-border/80 w-full text-sm shadow-xs placeholder:text-muted-foreground/60"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={`relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 text-xs font-semibold text-foreground shadow-xs transition-colors active:scale-95 ${mobileTab === "alerts" ? "hidden" : ""}`}
                    aria-label="Filter watchlist"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-foreground/80" />
                    <span>Filter</span>
                    {mobileFilter !== "all" && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl border-border p-5">
                  <SheetHeader className="border-b border-border/50 pb-3 text-left">
                    <SheetTitle className="text-base font-bold">Filter Assets</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Asset group
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {mobileFilterOptions.map((option) => {
                        const active = mobileFilter === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setMobileFilter(option.key)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                              active
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <span>{option.label}</span>
                            <span className={`tabular-nums font-normal ${active ? "text-white/80" : "text-muted-foreground/80"}`}>
                              {option.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <SheetClose asChild>
                      <button
                        type="button"
                        className="mt-5 h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                      >
                        Apply Filters
                      </button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
              <WatchlistAlertsTabs active={mobileTab} onSelect={setMobileTab} />
              <button
                type="button"
                onClick={() => {
                  if (mobileTab === "watchlist") {
                    setShowAddSheet(true);
                  } else if (!user) {
                    navigate("/auth?redirect=/portfolio?tab=watchlist");
                  } else {
                    setMobileAlertPickerOpen(true);
                  }
                }}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98]"
                aria-label={mobileTab === "watchlist" ? "Add to watchlist" : "Create alert"}
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                Add
              </button>
            </div>
          </>
        )}
      </div>

      {mobileTab === "alerts" ? (
        <MobileWatchlistAlertsPanel
          alerts={alerts}
          assets={mobileAlertAssets}
          query={search}
          onQueryChange={setSearch}
          pickerOpen={mobileAlertPickerOpen}
          onPickerOpenChange={setMobileAlertPickerOpen}
          onDelete={async (id) => { await deleteAlert(id); toast.success("Alert deleted"); }}
          onToggle={async (id, active) => { await toggleAlert(id, active); toast.success(active ? "Alert resumed" : "Alert paused"); }}
        />
      ) : (
        <>
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-18 rounded-2xl" />
              ))}
            </div>
          )}

          {isEmpty && (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
              <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Your watchlist is empty
              </h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                Add funds, stocks, currencies or commodities to track them in one place.
              </p>
              <Button
                onClick={() => setShowAddSheet(true)}
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-full text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add an Asset
              </Button>
            </div>
          )}

          {!loading && !isEmpty && !mobileHasResults && (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
              <h3 className="text-sm font-semibold text-foreground mb-1">No matching assets</h3>
              <p className="text-xs text-muted-foreground">Try another search term or switch filters.</p>
            </div>
          )}

          {/* Funds */}
          {!loading && filteredWatchedFunds.length > 0 && showFundsSection && (
            <section className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Unit Trust Funds ({filteredWatchedFunds.length})</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(fundsByType).map(([type, list]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {FUND_TYPE_LABELS[type as FundType] || type.replace("_", " ")}
                    </p>
                    <div className="space-y-2">
                      {list.map((f) => {
                        const spark = getFundSpark(f.id);
                        const trend: "up" | "down" | "flat" | undefined =
                          spark.length >= 2
                            ? spark[spark.length - 1] > spark[0] ? "up" : spark[spark.length - 1] < spark[0] ? "down" : "flat"
                            : undefined;
                        return (
                          <WatchCard
                            key={f.id}
                            title={f.name}
                            sub={f.manager}
                            visual={<WatchlistAssetAvatar type="fund" name={f.name} manager={f.manager} logoUrl={f.logo_url} size={36} />}
                            value={`${f.annual_yield.toFixed(2)}%`}
                            change={
                              <span className="text-[11px] text-muted-foreground">
                                Daily: {f.daily_yield.toFixed(4)}%
                              </span>
                            }
                            sparkData={spark.length > 2 ? spark : undefined}
                            trend={trend}
                            linkTo={`/compare/${f.slug}`}
                            onRemove={() => removeByTypeAndId("fund", f.id)}
                            mobileFooter={<SectionLiveStatus section="funds" className={watchCardStatusClass} />}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Stocks */}
          {!loading && filteredWatchedStocks.length > 0 && showStocksSection && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                <span>NSE Stocks ({filteredWatchedStocks.length})</span>
              </div>
              <div className="space-y-2">
                {filteredWatchedStocks.map((s) => {
                  const diff = s.day_change_percent != null ? Number(s.day_change_percent) : 0;
                  const isUp = diff > 0;
                  const isDown = diff < 0;
                  const spark = getStockSpark(s.id);
                  return (
                    <WatchCard
                      key={s.id}
                      title={s.name}
                      sub={s.symbol}
                      visual={<WatchlistAssetAvatar type="stock" symbol={s.symbol} name={s.name} logoUrl={s.logo_url} size={36} />}
                      value={`KES ${Number(s.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                      change={
                        <span className={`inline-flex items-center gap-0.5 font-bold ${isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
                          {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {isUp ? "+" : ""}{diff.toFixed(2)}%
                        </span>
                      }
                      sparkData={spark.length > 2 ? spark : undefined}
                      trend={isUp ? "up" : isDown ? "down" : "flat"}
                      linkTo={`/stocks/${s.symbol}`}
                      onRemove={() => removeByTypeAndId("stock", s.id)}
                      mobileFooter={<SectionLiveStatus section="stocks" className={watchCardStatusClass} />}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* FX Rates */}
          {!loading && filteredWatchedRates.length > 0 && showRatesSection && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-teal-500" />
                <span>Exchange Rates ({filteredWatchedRates.length})</span>
              </div>
              <div className="space-y-2">
                {filteredWatchedRates.map((r) => {
                  const diff = r.previous_rate != null ? Number(r.rate) - Number(r.previous_rate) : null;
                  const pct = diff != null && r.previous_rate ? ((diff / Number(r.previous_rate)) * 100).toFixed(2) : null;
                  const isUp = diff != null && diff > 0;
                  const isDown = diff != null && diff < 0;
                  const spark = getRateSpark(r.currency_code);
                  return (
                    <WatchCard
                      key={r.id}
                      title={`${r.currency_code}/KES`}
                      sub={r.currency_name}
                      visual={<WatchlistAssetAvatar type="currency" currencyCode={r.currency_code} name={r.currency_name} size={36} />}
                      value={`KES ${Number(r.rate).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                      change={
                        pct != null ? (
                          <span className={`inline-flex items-center gap-0.5 font-bold ${isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
                            {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {isUp ? "+" : ""}{pct}%
                          </span>
                        ) : undefined
                      }
                      sparkData={spark.length > 2 ? spark : undefined}
                      trend={isUp ? "up" : isDown ? "down" : "flat"}
                      linkTo="/rates"
                      onRemove={() => removeByTypeAndId("currency", r.id)}
                      mobileFooter={<SectionLiveStatus section="rates" className={watchCardStatusClass} />}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Commodities */}
          {!loading && filteredWatchedCommodities.length > 0 && showCommoditiesSection && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Gem className="h-3.5 w-3.5 text-amber-500" />
                <span>Commodities ({filteredWatchedCommodities.length})</span>
              </div>
              <div className="space-y-2">
                {filteredWatchedCommodities.map((c) => {
                  const diff = c.previous_price != null ? Number(c.price) - Number(c.previous_price) : null;
                  const pct = diff != null && c.previous_price ? ((diff / Number(c.previous_price)) * 100).toFixed(2) : null;
                  const isUp = diff != null && diff > 0;
                  const isDown = diff != null && diff < 0;
                  return (
                    <WatchCard
                      key={c.id}
                      title={c.name}
                      sub={c.symbol || c.unit}
                      visual={<WatchlistAssetAvatar type="commodity" symbol={c.symbol} name={c.name} size={36} />}
                      value={`${Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${c.unit || ""}`.trim()}
                      change={
                        pct != null ? (
                          <span className={`inline-flex items-center gap-0.5 font-bold ${isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
                            {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {isUp ? "+" : ""}{pct}%
                          </span>
                        ) : undefined
                      }
                      trend={isUp ? "up" : isDown ? "down" : "flat"}
                      linkTo="/commodities"
                      onRemove={() => removeByTypeAndId("commodity", c.id)}
                      mobileFooter={<SectionLiveStatus section="commodities" className={watchCardStatusClass} />}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Add Asset Bottom Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl border-border p-0">
          <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
            <SheetTitle className="text-base font-bold">Add to Watchlist</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/60 rounded-xl">
              {ADD_WATCHLIST_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setAddType(opt.key); setAddSearch(""); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    addType === opt.key ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search to add..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="pl-10 h-10 rounded-full bg-card text-sm"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pb-6">
              {addType === "fund" ? (
                groupedAddFundItems.map((group) => (
                  <div key={group.key} className="space-y-1 pt-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      {group.label}
                    </p>
                    {group.items.map((item) => {
                      const saved = watchlist.some((entry) => entry.item_type === addType && entry.item_id === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addToWatchlist(addType, item.id, item.name)}
                          disabled={saved}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{item.sub}</p>
                          </div>
                          <span className={`text-xs font-bold shrink-0 ${saved ? "text-emerald-500" : "text-foreground"}`}>
                            {saved ? "Saved ✓" : item.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                addSheetItems.map((item) => {
                  const saved = watchlist.some((entry) => entry.item_type === addType && entry.item_id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addToWatchlist(addType, item.id, item.name)}
                      disabled={saved}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{item.sub}</p>
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${saved ? "text-emerald-500" : "text-foreground"}`}>
                        {saved ? "Saved ✓" : item.value}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Price Alert Dialog */}
      {alertDialog && (
        <CreateAlertDialog
          open
          onOpenChange={(o) => { if (!o) setAlertDialog(null); }}
          assetType={alertDialog.assetType}
          assetId={alertDialog.assetId}
          assetName={alertDialog.assetName}
          currentPrice={alertDialog.currentPrice}
          unit={alertDialog.unit}
        />
      )}
    </div>
  );
}
