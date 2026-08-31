import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, TrendingUp, TrendingDown, Minus, DollarSign, Gem, BarChart3, Landmark,
  ArrowRight, Settings2, Search, SlidersHorizontal, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMarketData } from "@/components/home/MarketTicker";
import { usePriceAlerts, type PriceAlert, type AlertAssetType } from "@/hooks/usePriceAlerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import WatchCard, { type AlertState } from "@/components/watchlist/WatchCard";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import { fetchFunds, FUND_TYPE_LABELS, type FundFromDB, type FundType } from "@/lib/api";
import { computeAlertSummary } from "@/lib/watchlistAlertSummary";
import { safeUUID } from "@/lib/safeUUID";
import MarketPageLoader from "@/components/MarketPageLoader";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";

interface WatchlistItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  sort_order: number;
}

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

const trendOf = (
  current: number,
  previous: number | null | undefined
): "up" | "down" | "flat" | undefined => {
  if (previous == null) return undefined;
  const diff = current - previous;
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "flat";
};

const Change = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold">
        <TrendingDown className="h-3 w-3" />
        {pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
      <Minus className="h-3 w-3" />
      0.00%
    </span>
  );
};

const GroupHeading = ({
  icon: Icon,
  label,
  count,
  link,
}: {
  icon: any;
  label: string;
  count: number;
  link?: string;
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
    </div>
    {link && (
      <Link
        to={link}
        className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5"
      >
        Browse <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

const watchCardStatusClass =
  "flex-wrap gap-x-2 gap-y-1 [&>span]:text-[10px] [&>span]:leading-tight [&>span]:tracking-[0.12em]";

const WatchlistPage = () => {
  useDocumentTitle(
    "Watchlist – Kenya Fund Finder",
    "Your saved unit trusts, NSE stocks, FX rates and commodities — all in one place."
  );

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { rates, commodities, stocks, loading: marketLoading } = useMarketData();
  const { alerts, resetAlert } = usePriceAlerts();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [hasLocalWatchlistState, setHasLocalWatchlistState] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileFilter, setMobileFilter] = useState<MobileWatchlistFilter>("all");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addType, setAddType] = useState<AddWatchlistType>("stock");
  const [addSearch, setAddSearch] = useState("");

  const [rateHistory, setRateHistory] = useState<RateHistoryRow[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryRow[]>([]);
  const [fundSnapshots, setFundSnapshots] = useState<FundSnapshotRow[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  /* ─── Alert helpers ─── */
  const alertFor = useCallback(
    (type: AlertAssetType, id: string): PriceAlert | undefined =>
      alerts.find((a) => a.asset_type === type && a.asset_id === id),
    [alerts]
  );
  const alertStateOf = useCallback(
    (type: AlertAssetType, id: string): AlertState => {
      const a = alertFor(type, id);
      if (!a || !a.is_active) return "none";
      return a.is_triggered ? "triggered" : "active";
    },
    [alertFor]
  );

  /* ─── Create/reset alert dialog state ─── */
  const [alertDialog, setAlertDialog] = useState<{
    assetType: Exclude<AlertAssetType, "new_fund">;
    assetId: string;
    assetName: string;
    currentPrice: number;
    unit: string;
  } | null>(null);

  const openAlertForFund = (f: FundFromDB) => {
    const existing = alertFor("fund", f.id);
    if (existing?.is_triggered) {
      resetAlert(existing.id, f.annual_yield);
      toast.success("Alert reset");
      return;
    }
    setAlertDialog({
      assetType: "fund",
      assetId: f.id,
      assetName: f.name,
      currentPrice: f.annual_yield,
      unit: f.yield_unit === "%" ? "%" : f.yield_unit,
    });
  };

  const openAlertForStock = (s: { id: string; symbol: string; name: string; price: number }) => {
    const existing = alertFor("stock", s.id);
    if (existing?.is_triggered) {
      resetAlert(existing.id, s.price);
      toast.success("Alert reset");
      return;
    }
    setAlertDialog({
      assetType: "stock",
      assetId: s.id,
      assetName: `${s.name} (${s.symbol})`,
      currentPrice: s.price,
      unit: "KES",
    });
  };

  const resetFundAlert = (f: FundFromDB) => {
    const existing = alertFor("fund", f.id);
    if (existing) {
      resetAlert(existing.id, f.annual_yield);
      toast.success("Alert reset");
    }
  };

  const resetStockAlert = (s: { id: string; price: number }) => {
    const existing = alertFor("stock", s.id);
    if (existing) {
      resetAlert(existing.id, s.price);
      toast.success("Alert reset");
    }
  };

  /* ─── Funds ─── */
  useEffect(() => {
    fetchFunds()
      .then(setFunds)
      .catch((e) => console.error("Failed to load funds", e))
      .finally(() => setFundsLoading(false));
  }, []);

  /* ─── Watchlist ─── */
  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      try {
        const saved = localStorage.getItem("kf_local_watchlist");
        setHasLocalWatchlistState(saved !== null);
        setWatchlist(saved ? (JSON.parse(saved) as WatchlistItem[]) : []);
      } catch {
        setHasLocalWatchlistState(false);
        setWatchlist([]);
      }
      setWatchlistLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order");
    if (error) console.error("Failed to fetch watchlist:", error);
    setWatchlist((data as WatchlistItem[]) || []);
    setWatchlistLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  /* ─── 90-day history (for sparklines) ─── */
  useEffect(() => {
    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceISO = since.toISOString().split("T")[0];

    void Promise.allSettled([
      supabase.from("exchange_rate_history_public").select("snapshot_date, rate, currency_code").gte("snapshot_date", sinceISO).order("snapshot_date", { ascending: true }).limit(10000),
      supabase.from("stock_price_history_public").select("snapshot_date, price, stock_id").gte("snapshot_date", sinceISO).order("snapshot_date", { ascending: true }).limit(10000),
      supabase.from("fund_yield_snapshots").select("snapshot_date, annual_yield, fund_id").gte("snapshot_date", sinceISO).order("snapshot_date", { ascending: true }).limit(10000),
    ]).then(([ratesResult, stocksResult, fundsResult]) => {
      if (cancelled) return;
      if (ratesResult.status === "fulfilled") setRateHistory((ratesResult.value.data as RateHistoryRow[]) || []);
      if (stocksResult.status === "fulfilled") setStockHistory((stocksResult.value.data as StockHistoryRow[]) || []);
      if (fundsResult.status === "fulfilled") setFundSnapshots((fundsResult.value.data as FundSnapshotRow[]) || []);
      setHistoryReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const getRateSpark = (code: string) =>
    rateHistory.filter((h) => h.currency_code === code).map((h) => h.rate);
  const getStockSpark = (id: string) =>
    stockHistory.filter((h) => h.stock_id === id).map((h) => h.price);
  const getFundSpark = (id: string) =>
    fundSnapshots.filter((h) => h.fund_id === id).map((h) => h.annual_yield);

  /* ─── Toggle (remove) ─── */
  const removeItem = async (id: string) => {
    const existing = effectiveWatchlist.find((w) => w.id === id);
    if (!existing) return;
    const nextWatchlist = effectiveWatchlist.filter((w) => w.id !== id);
    setWatchlist(nextWatchlist);
    if (!user) {
      setHasLocalWatchlistState(true);
      localStorage.setItem("kf_local_watchlist", JSON.stringify(nextWatchlist));
      toast.success(`Removed ${existing.item_name}`);
      return;
    }
    const { error } = await supabase.from("user_watchlist").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
      fetchWatchlist();
      return;
    }
    toast.success(`Removed ${existing.item_name}`);
  };

  const removeByTypeAndId = (type: string, itemId: string) => {
    const found = effectiveWatchlist.find((w) => w.item_type === type && w.item_id === itemId);
    if (found) removeItem(found.id);
  };

  const addToWatchlist = async (type: AddWatchlistType, itemId: string, itemName: string) => {
    if (!itemId) {
      toast.error("This item cannot be added yet");
      return;
    }

    const duplicate = watchlist.find((w) => w.item_type === type && w.item_id === itemId);
    if (duplicate) {
      toast.info(`${itemName} is already in your watchlist`);
      return;
    }

    const nextSortOrder = watchlist.length;
    const tempItem: WatchlistItem = {
      id: safeUUID(),
      user_id: user?.id || "guest",
      item_type: type,
      item_id: itemId,
      item_name: itemName,
      sort_order: nextSortOrder,
    };

    setWatchlist((prev) => [...prev, tempItem]);

    if (!user) {
      const nextWatchlist = [...watchlist, tempItem];
      setHasLocalWatchlistState(true);
      localStorage.setItem("kf_local_watchlist", JSON.stringify(nextWatchlist));
      toast.success(`Added ${itemName} to watchlist`);
      setShowAddSheet(false);
      setAddSearch("");
      return;
    }

    const { error } = await supabase
      .from("user_watchlist")
      .upsert(
        {
          user_id: user.id,
          item_type: type,
          item_id: itemId,
          item_name: itemName,
          sort_order: nextSortOrder,
        },
        { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true }
      );

    if (error) {
      console.error("Failed to add to watchlist:", error);
      toast.error("Failed to add to watchlist");
      fetchWatchlist();
      return;
    }

    toast.success(`Added ${itemName} to watchlist`);
    setShowAddSheet(false);
    setAddSearch("");
    fetchWatchlist();
  };

  /* ─── Derived groups ─── */
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
    const ids = new Set(
      effectiveWatchlist.filter((w) => w.item_type === "commodity").map((w) => w.item_id)
    );
    return commodities.filter((c) => ids.has(c.id));
  }, [commodities, effectiveWatchlist]);

  const watchedFunds = useMemo(() => {
    const ids = new Set(effectiveWatchlist.filter((w) => w.item_type === "fund").map((w) => w.item_id));
    return funds.filter((f) => ids.has(f.id));
  }, [funds, effectiveWatchlist]);

  const normalizedSearch = search.trim().toLowerCase();
  const fundMatchesSearch = useCallback((f: FundFromDB) => {
    if (!normalizedSearch) return true;
    return [
      f.name,
      f.manager,
      f.slug,
      FUND_TYPE_LABELS[f.fund_type as FundType] || f.fund_type,
    ]
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

  // Group funds by fund_type for clearer organisation
  const fundsByType = useMemo(() => {
    const grouped: Record<string, FundFromDB[]> = {};
    watchedFunds.filter(fundMatchesSearch).forEach((f) => {
      const key = f.fund_type || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    });
    return grouped;
  }, [watchedFunds, fundMatchesSearch]);

  const filteredWatchedFunds = useMemo(
    () => watchedFunds.filter(fundMatchesSearch),
    [watchedFunds, fundMatchesSearch]
  );
  const filteredWatchedStocks = useMemo(
    () => watchedStocks.filter(stockMatchesSearch),
    [watchedStocks, stockMatchesSearch]
  );
  const filteredWatchedRates = useMemo(
    () => watchedRates.filter(rateMatchesSearch),
    [watchedRates, rateMatchesSearch]
  );
  const filteredWatchedCommodities = useMemo(
    () => watchedCommodities.filter(commodityMatchesSearch),
    [watchedCommodities, commodityMatchesSearch]
  );

  const totalCount =
    watchedStocks.length +
    watchedRates.length +
    watchedCommodities.length +
    watchedFunds.length;

  // Alert summary across all watched assets
  const watchedKeys = useMemo(() => {
    const keys = new Set<string>();
    watchedFunds.forEach((f) => keys.add(`fund:${f.id}`));
    watchedStocks.forEach((s) => keys.add(`stock:${s.id}`));
    return keys;
  }, [watchedFunds, watchedStocks]);

  const alertSummary = useMemo(
    () => computeAlertSummary(
      alerts.map((a) => ({
        asset_type: a.asset_type,
        asset_id: a.asset_id,
        is_active: a.is_active,
        is_triggered: a.is_triggered,
      })),
      watchedKeys,
    ),
    [alerts, watchedKeys],
  );

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
  }, [addSearch, addType, commodities, funds, normalizedAddSearch, rates, stocks]);
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

  const showPageLoading = useMinimumLoadingDuration(
    authLoading || marketLoading || fundsLoading || watchlistLoading || !historyReady,
  );

  if (showPageLoading) return <MarketPageLoader message="Loading your watchlist…" className="min-h-screen" />;

  return (
    <div className="space-y-6 px-4 md:px-6 py-4 md:py-6">
      {/* Header */}
      <div>
        <div className="md:hidden mb-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Watchlist</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your saved funds, stocks, FX rates, and commodities in one place.
            </p>
            {showingGuestDemo && (
              <p className="mt-2 text-xs font-medium text-accent">
                Demo watchlist · Sign in only when you want to save across devices.
              </p>
            )}
          </div>

          {!loading && (
            <>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
                  <Input
                    placeholder="Search watchlist..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 rounded-full bg-card border-border/80 w-full text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
                  />
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors active:scale-95"
                      aria-label="Filter watchlist"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-foreground/80" />
                      <span>Filter</span>
                      {mobileFilter !== "all" && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl border-border p-5">
                    <SheetHeader className="border-b border-border/50 pb-3 text-left">
                      <SheetTitle className="text-base font-bold">Filters</SheetTitle>
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
                                  ? "bg-emerald-600 text-white shadow-sm"
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
                          className="mt-5 h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                        >
                          Apply Filters
                        </button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="mb-3.5 flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
                    <Star className="h-3 w-3 text-warning" />
                    <span className="tabular-nums font-semibold text-foreground">{totalCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
                    <span>Alerts</span>
                    <span className="tabular-nums font-semibold text-foreground">{alertSummary.active}</span>
                  </span>
                  {alertSummary.triggered > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-destructive">
                      <span>Triggered</span>
                      <span className="tabular-nums font-semibold">{alertSummary.triggered}</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSheet(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#00A651] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#008f45] active:scale-[0.98]"
                  aria-label="Add watchlist item"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden md:flex flex-row items-end justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" /> Watchlist
            </h1>
            <p className="text-sm text-muted-foreground md:mt-1">
              All your saved funds, stocks, currencies and commodities — grouped for quick scanning.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => navigate("/")}
            >
              <Settings2 className="h-3.5 w-3.5" /> Customize on Overview
            </Button>
            <SectionLiveStatus section="overview" />
          </div>
        </div>
      </div>

      {/* Summary pills (neutral labels — no recommendations) */}
      {!loading && totalCount > 0 && (
        <div className="hidden md:flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border">
            <Star className="h-3 w-3 text-warning" />
            <span className="text-muted-foreground">Saved assets</span>
            <span className="font-semibold text-foreground tabular-nums">{totalCount}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border">
            <span className="text-muted-foreground">Active alerts</span>
            <span className="font-semibold text-foreground tabular-nums">{alertSummary.active}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/30">
            <span className="text-destructive/90">Triggered alerts</span>
            <span className="font-semibold text-destructive tabular-nums">{alertSummary.triggered}</span>
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-foreground mb-1">
            Your watchlist is empty
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Add funds, stocks, currencies or commodities to track them in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs h-8">
              <Link to="/funds">Browse Funds</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="text-xs h-8">
              <Link to="/stocks">Browse Stocks</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="text-xs h-8">
              <Link to="/rates">FX Rates</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="text-xs h-8">
              <Link to="/commodities">Commodities</Link>
            </Button>
          </div>
        </div>
      )}

      {!loading && !isEmpty && !mobileHasResults && (
        <div className="md:hidden rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center">
          <h2 className="text-base font-semibold text-foreground mb-1">No matches found</h2>
          <p className="text-sm text-muted-foreground">
            Try another search term or switch asset groups.
          </p>
        </div>
      )}

      {/* ─── Funds (grouped by type) ─── */}
      {!loading && filteredWatchedFunds.length > 0 && showFundsSection && (
        <section>
          <GroupHeading
            icon={BarChart3}
            label="Funds"
            count={filteredWatchedFunds.length}
            link="/funds"
          />
          <div className="space-y-4">
            {Object.entries(fundsByType).map(([type, list]) => (
              <div key={type}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {FUND_TYPE_LABELS[type as FundType] || type.replace("_", " ")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {list.map((f) => {
                    const spark = getFundSpark(f.id);
                    const trend: "up" | "down" | "flat" | undefined =
                      spark.length >= 2
                        ? spark[spark.length - 1] > spark[0]
                          ? "up"
                          : spark[spark.length - 1] < spark[0]
                            ? "down"
                            : "flat"
                        : undefined;
                    return (
                      <WatchCard
                        key={f.id}
                        title={f.name}
                        sub={f.manager}
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
                        onAlert={() => openAlertForFund(f)}
                        onReset={() => resetFundAlert(f)}
                        alertState={alertStateOf("fund", f.id)}
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

      {/* ─── Stocks ─── */}
      {!loading && filteredWatchedStocks.length > 0 && showStocksSection && (
        <section>
          <GroupHeading
            icon={TrendingUp}
            label="Stocks"
            count={filteredWatchedStocks.length}
            link="/stocks"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredWatchedStocks.map((s) => {
              const spark = getStockSpark(s.id);
              return (
                <WatchCard
                  key={s.id}
                  title={s.symbol}
                  sub={s.name}
                  value={`KES ${s.price.toFixed(2)}`}
                  change={<Change current={s.price} previous={s.previous_price} />}
                  sparkData={spark.length > 2 ? spark : undefined}
                  trend={trendOf(s.price, s.previous_price)}
                  linkTo={`/stocks/${s.symbol}`}
                  onRemove={() => removeByTypeAndId("stock", s.id)}
                  onAlert={() => openAlertForStock(s)}
                  onReset={() => resetStockAlert(s)}
                  alertState={alertStateOf("stock", s.id)}
                  mobileFooter={<SectionLiveStatus section="stocks" className={watchCardStatusClass} />}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ─── FX Rates ─── */}
      {!loading && filteredWatchedRates.length > 0 && showRatesSection && (
        <section>
          <GroupHeading
            icon={DollarSign}
            label="FX Rates"
            count={filteredWatchedRates.length}
            link="/rates"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredWatchedRates.map((r) => {
              const spark = getRateSpark(r.currency_code);
              return (
                <WatchCard
                  key={r.id}
                  title={`${r.currency_code}/KES`}
                  sub={r.currency_name}
                  value={`KES ${Number(r.rate).toFixed(2)}`}
                  change={
                    <Change
                      current={Number(r.rate)}
                      previous={r.previous_rate != null ? Number(r.previous_rate) : null}
                    />
                  }
                  sparkData={spark.length > 2 ? spark : undefined}
                  trend={trendOf(
                    Number(r.rate),
                    r.previous_rate != null ? Number(r.previous_rate) : null
                  )}
                  linkTo="/rates"
                  onRemove={() => removeByTypeAndId("currency", r.id)}
                  mobileFooter={<SectionLiveStatus section="rates" className={watchCardStatusClass} />}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Commodities ─── */}
      {!loading && filteredWatchedCommodities.length > 0 && showCommoditiesSection && (
        <section>
          <GroupHeading
            icon={Gem}
            label="Commodities"
            count={filteredWatchedCommodities.length}
            link="/commodities"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredWatchedCommodities.map((c) => (
              <WatchCard
                key={c.id}
                title={c.name}
                sub={c.symbol}
                value={`${Number(c.price).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })} ${c.unit}`}
                change={
                  <Change
                    current={Number(c.price)}
                    previous={c.previous_price != null ? Number(c.previous_price) : null}
                  />
                }
                trend={trendOf(
                  Number(c.price),
                  c.previous_price != null ? Number(c.previous_price) : null
                )}
                linkTo="/commodities"
                onRemove={() => removeByTypeAndId("commodity", c.id)}
                mobileFooter={<SectionLiveStatus section="commodities" className={watchCardStatusClass} />}
              />
            ))}
          </div>
        </section>
      )}

      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="max-h-[86vh] overflow-y-auto rounded-t-2xl border-border p-5 md:hidden">
          <SheetHeader className="border-b border-border/50 pb-3 text-left">
            <SheetTitle className="text-base font-bold">Add to watchlist</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ADD_WATCHLIST_OPTIONS.map((option) => {
                const active = addType === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setAddType(option.key);
                      setAddSearch("");
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                      active
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                value={addSearch}
                onChange={(event) => setAddSearch(event.target.value)}
                placeholder={`Search ${ADD_WATCHLIST_OPTIONS.find((option) => option.key === addType)?.label.toLowerCase()}...`}
                className="h-11 w-full rounded-full border-border/80 bg-card pl-10 text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
              />
            </div>

            <div className="space-y-3">
              {addSheetItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-foreground">No items found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try another search term.</p>
                </div>
              ) : addType === "fund" ? (
                groupedAddFundItems.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {group.label}
                      </p>
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((item) => {
                      const saved = watchlist.some((entry) => entry.item_type === addType && entry.item_id === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addToWatchlist(addType, item.id, item.name)}
                          disabled={saved}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-default disabled:opacity-70"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.sub}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-semibold text-foreground tabular-nums">{item.value}</p>
                            <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${saved ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {saved ? "Saved" : "Add"}
                            </p>
                          </div>
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
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-default disabled:opacity-70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-foreground tabular-nums">{item.value}</p>
                        <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${saved ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {saved ? "Saved" : "Add"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Controlled alert dialog opened from individual rows */}
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
};

export default WatchlistPage;
