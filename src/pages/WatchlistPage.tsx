import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star, TrendingUp, TrendingDown, Minus, DollarSign, Gem, BarChart3, Landmark,
  ArrowRight, Settings2,
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
import SectionLiveStatus from "@/components/SectionLiveStatus";
import WatchCard, { type AlertState } from "@/components/watchlist/WatchCard";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import { fetchFunds, FUND_TYPE_LABELS, type FundFromDB, type FundType } from "@/lib/api";

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

  const [rateHistory, setRateHistory] = useState<RateHistoryRow[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryRow[]>([]);
  const [fundSnapshots, setFundSnapshots] = useState<FundSnapshotRow[]>([]);

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

  /* ─── Auth gate ─── */
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/watchlist");
  }, [authLoading, user, navigate]);

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
      setWatchlist([]);
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
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceISO = since.toISOString().split("T")[0];

    supabase
      .from("exchange_rate_history_public")
      .select("snapshot_date, rate, currency_code")
      .gte("snapshot_date", sinceISO)
      .order("snapshot_date", { ascending: true })
      .limit(10000)
      .then(({ data }) => setRateHistory((data as RateHistoryRow[]) || []));

    supabase
      .from("stock_price_history_public")
      .select("snapshot_date, price, stock_id")
      .gte("snapshot_date", sinceISO)
      .order("snapshot_date", { ascending: true })
      .limit(10000)
      .then(({ data }) => setStockHistory((data as StockHistoryRow[]) || []));

    supabase
      .from("fund_yield_snapshots")
      .select("snapshot_date, annual_yield, fund_id")
      .gte("snapshot_date", sinceISO)
      .order("snapshot_date", { ascending: true })
      .limit(10000)
      .then(({ data }) => setFundSnapshots((data as FundSnapshotRow[]) || []));
  }, []);

  const getRateSpark = (code: string) =>
    rateHistory.filter((h) => h.currency_code === code).map((h) => h.rate);
  const getStockSpark = (id: string) =>
    stockHistory.filter((h) => h.stock_id === id).map((h) => h.price);
  const getFundSpark = (id: string) =>
    fundSnapshots.filter((h) => h.fund_id === id).map((h) => h.annual_yield);

  /* ─── Toggle (remove) ─── */
  const removeItem = async (id: string) => {
    const existing = watchlist.find((w) => w.id === id);
    if (!existing) return;
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
    const { error } = await supabase.from("user_watchlist").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
      fetchWatchlist();
      return;
    }
    toast.success(`Removed ${existing.item_name}`);
  };

  const removeByTypeAndId = (type: string, itemId: string) => {
    const found = watchlist.find((w) => w.item_type === type && w.item_id === itemId);
    if (found) removeItem(found.id);
  };

  /* ─── Derived groups ─── */
  const watchedStocks = useMemo(() => {
    const ids = new Set(watchlist.filter((w) => w.item_type === "stock").map((w) => w.item_id));
    return stocks.filter((s) => ids.has(s.id));
  }, [stocks, watchlist]);

  const watchedRates = useMemo(() => {
    const ids = new Set(watchlist.filter((w) => w.item_type === "currency").map((w) => w.item_id));
    return rates.filter((r) => ids.has(r.id));
  }, [rates, watchlist]);

  const watchedCommodities = useMemo(() => {
    const ids = new Set(
      watchlist.filter((w) => w.item_type === "commodity").map((w) => w.item_id)
    );
    return commodities.filter((c) => ids.has(c.id));
  }, [commodities, watchlist]);

  const watchedFunds = useMemo(() => {
    const ids = new Set(watchlist.filter((w) => w.item_type === "fund").map((w) => w.item_id));
    return funds.filter((f) => ids.has(f.id));
  }, [funds, watchlist]);

  // Group funds by fund_type for clearer organisation
  const fundsByType = useMemo(() => {
    const grouped: Record<string, FundFromDB[]> = {};
    watchedFunds.forEach((f) => {
      const key = f.fund_type || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    });
    return grouped;
  }, [watchedFunds]);

  const totalCount =
    watchedStocks.length +
    watchedRates.length +
    watchedCommodities.length +
    watchedFunds.length;

  const loading = marketLoading || fundsLoading || watchlistLoading;
  const isEmpty = !loading && totalCount === 0;

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6 py-4 md:py-6">
      {/* Header */}
      <div>
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
        <div className="md:hidden flex items-center justify-between w-full">
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Star className="h-4 w-4 text-warning" /> Watchlist
            <span className="text-[10px] text-muted-foreground font-normal ml-1">
              {totalCount} item{totalCount === 1 ? "" : "s"}
            </span>
          </h1>
          <SectionLiveStatus section="overview" hideDate />
        </div>
        <div className="md:hidden border-b border-border mt-3" />
      </div>

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

      {/* ─── Funds (grouped by type) ─── */}
      {!loading && watchedFunds.length > 0 && (
        <section>
          <GroupHeading
            icon={BarChart3}
            label="Funds"
            count={watchedFunds.length}
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
      {!loading && watchedStocks.length > 0 && (
        <section>
          <GroupHeading
            icon={TrendingUp}
            label="Stocks"
            count={watchedStocks.length}
            link="/stocks"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {watchedStocks.map((s) => {
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
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ─── FX Rates ─── */}
      {!loading && watchedRates.length > 0 && (
        <section>
          <GroupHeading
            icon={DollarSign}
            label="FX Rates"
            count={watchedRates.length}
            link="/rates"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {watchedRates.map((r) => {
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
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Commodities ─── */}
      {!loading && watchedCommodities.length > 0 && (
        <section>
          <GroupHeading
            icon={Gem}
            label="Commodities"
            count={watchedCommodities.length}
            link="/commodities"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {watchedCommodities.map((c) => (
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
              />
            ))}
          </div>
        </section>
      )}

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
