import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowUp, Bell,
  Gem, GripVertical, Plus, RotateCcw, Search, SlidersHorizontal, Star, Trash2, TrendingDown, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedWatchlist, type UnifiedWatchlistItem } from "@/hooks/useUnifiedWatchlist";
import KoraIllustration from "@/components/kora/KoraIllustration";
import { usePriceAlerts, type AlertAssetType, type PriceAlert } from "@/hooks/usePriceAlerts";
import { useMarketData } from "@/components/home/MarketTicker";
import { fetchFunds, type FundFromDB } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { getFundManagerLogoUrl } from "@/lib/fundBranding";
import { getCurrencyFlagUrl } from "@/lib/currencyBranding";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { resolveAlertAsset, isAlertTriggered, doesPriceSatisfyTarget } from "@/lib/priceAlertEvaluation";

type WorkspaceTab = "watchlist" | "alerts";
type AssetType = AlertAssetType;

type AssetRow = {
  entry: UnifiedWatchlistItem;
  type: AssetType;
  title: string;
  subtitle: string;
  value: number;
  unit: string;
  change?: number | null;
  href?: string;
  visualUrl?: string;
  meta?: Array<{ label: string; value: string }>;
};

const assetLabels: Record<AssetType, string> = {
  stock: "Stocks",
  fund: "MMFs",
  currency: "FX rates",
  commodity: "Commodities",
};

function formatValue(value: number, unit: string) {
  const formatted = value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return unit === "%" ? `${formatted}%` : `${formatted} ${unit}`;
}

function currentAlertState(alert?: PriceAlert) {
  if (!alert) return "No alert";
  if (alert.is_triggered) return "Triggered";
  return alert.is_active ? "Active" : "Paused";
}

export default function DesktopWatchlistWorkspace({ active }: { active: WorkspaceTab }) {
  const { user } = useAuth();
  const { items, loading: watchlistLoading, add, remove, reorder, hasLocalState } = useUnifiedWatchlist();
  const { alerts, loading: alertsLoading, deleteAlert, toggleAlert, resetAlert } = usePriceAlerts();
  const { stocks, rates, commodities, loading: marketLoading } = useMarketData();
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<AssetType>("stock");
  const [addQuery, setAddQuery] = useState("");
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [alertFilter, setAlertFilter] = useState<"active" | "triggered" | "paused">("active");
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchFunds()
      .then((data) => { if (mounted) setFunds(data); })
      .catch(() => { if (mounted) toast.error("Unable to load funds"); })
      .finally(() => { if (mounted) setFundsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const demoItems = useMemo<UnifiedWatchlistItem[]>(() => {
    if (user || hasLocalState || items.length > 0) return [];
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
  }, [commodities, funds, hasLocalState, items.length, rates, stocks, user]);

  const effectiveItems = items.length > 0 ? items : demoItems;
  const showingGuestDemo = !user && items.length === 0 && demoItems.length > 0;

  const rows = useMemo<AssetRow[]>(() => {
    return effectiveItems.reduce<AssetRow[]>((result, entry) => {
      const targetId = String(entry.item_id || "").toLowerCase();
      const targetName = String(entry.item_name || "").toLowerCase();

      if (entry.item_type === "stock") {
        const asset = stocks.find((s) =>
          s.id === entry.item_id ||
          s.symbol.toLowerCase() === targetId ||
          s.name.toLowerCase() === targetName
        );
        if (asset) {
          result.push({
            entry,
            type: "stock",
            title: asset.symbol,
            subtitle: asset.name,
            value: asset.price,
            unit: "KES",
            change: asset.day_change_percent,
            href: `/stocks/${asset.symbol}`,
            visualUrl: getStockLogoUrl(asset.symbol, asset.logo_url),
            meta: [
              { label: "Vol", value: asset.volume ? `${(asset.volume / 1_000_000).toFixed(1)}M` : "—" },
              { label: "Cap", value: asset.market_cap ? `KES ${(asset.market_cap / 1_000_000_000).toFixed(1)}B` : "—" },
            ],
          });
        }
      } else if (entry.item_type === "fund") {
        const asset = funds.find((f) =>
          f.id === entry.item_id ||
          f.slug?.toLowerCase() === targetId ||
          f.name.toLowerCase() === targetName
        );
        if (asset) {
          result.push({
            entry,
            type: "fund",
            title: asset.name,
            subtitle: asset.manager,
            value: asset.annual_yield,
            unit: "%",
            href: `/compare/${asset.slug}`,
            visualUrl: getFundManagerLogoUrl(asset.manager, asset.logo_url),
            meta: [
              { label: "Yield", value: `${asset.annual_yield.toFixed(2)}%` },
              { label: "Manager", value: asset.manager },
            ],
          });
        }
      } else if (entry.item_type === "currency") {
        const asset = rates.find((r) =>
          r.id === entry.item_id ||
          r.currency_code.toLowerCase() === targetId ||
          r.currency_name.toLowerCase() === targetName
        );
        if (asset) {
          result.push({
            entry,
            type: "currency",
            title: `${asset.currency_code}/KES`,
            subtitle: asset.currency_name,
            value: asset.rate,
            unit: "KES",
            change: asset.day_change_percent,
            href: "/rates",
            visualUrl: getCurrencyFlagUrl(asset.currency_code),
            meta: [
              { label: "Pair", value: `${asset.currency_code}/KES` },
              { label: "Rate", value: formatValue(asset.rate, "KES") },
            ],
          });
        }
      } else if (entry.item_type === "commodity") {
        const asset = commodities.find((c) =>
          c.id === entry.item_id ||
          c.symbol?.toLowerCase() === targetId ||
          c.name.toLowerCase() === targetName
        );
        if (asset) {
          result.push({
            entry,
            type: "commodity",
            title: asset.name,
            subtitle: asset.symbol,
            value: asset.price,
            unit: asset.unit,
            change: asset.day_change_percent,
            href: "/commodities",
            meta: [
              { label: "Symbol", value: asset.symbol },
              { label: "Unit", value: asset.unit },
            ],
          });
        }
      }
      return result;
    }, []);
  }, [commodities, effectiveItems, funds, rates, stocks]);

  const rowByAlert = useMemo(() => new Map(rows.map((row) => [`${row.type}:${row.entry.item_id}`, row])), [rows]);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesType = filter === "all" || row.type === filter;
      const matchesQuery = !normalized || `${row.title} ${row.subtitle}`.toLowerCase().includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [filter, query, rows]);

  const addableRows = useMemo(() => {
    const normalized = addQuery.trim().toLowerCase();
    const saved = new Set(items.map((item) => `${item.item_type}:${item.item_id}`));
    const match = (...values: Array<string | undefined>) => !normalized || values.some((value) => value?.toLowerCase().includes(normalized));
    if (addType === "stock") return stocks.filter((asset) => !saved.has(`stock:${asset.id}`) && match(asset.name, asset.symbol)).slice(0, 50).map((asset) => ({ id: asset.id, name: `${asset.symbol} · ${asset.name}`, value: formatValue(asset.price, "KES") }));
    if (addType === "fund") return funds.filter((asset) => !saved.has(`fund:${asset.id}`) && match(asset.name, asset.manager)).slice(0, 50).map((asset) => ({ id: asset.id, name: asset.name, value: formatValue(asset.annual_yield, "%") }));
    if (addType === "currency") return rates.filter((asset) => !saved.has(`currency:${asset.id}`) && match(asset.currency_code, asset.currency_name)).slice(0, 50).map((asset) => ({ id: asset.id, name: `${asset.currency_code}/KES`, value: formatValue(asset.rate, "KES") }));
    return commodities.filter((asset) => !saved.has(`commodity:${asset.id}`) && match(asset.name, asset.symbol)).slice(0, 50).map((asset) => ({ id: asset.id, name: asset.name, value: formatValue(asset.price, asset.unit) }));
  }, [addQuery, addType, commodities, funds, items, rates, stocks]);

  const enrichedAlerts = useMemo(() => {
    return alerts.map((alert) => {
      const parsed = resolveAlertAsset(alert, stocks, rates, commodities);
      const isHit = isAlertTriggered(alert, parsed.currentPrice);
      return {
        ...alert,
        _parsed: parsed,
        _isHit: isHit,
      };
    });
  }, [alerts, stocks, rates, commodities]);

  const counts = useMemo(() => ({
    active: enrichedAlerts.filter((a) => a.is_active && !a._isHit && !a.is_triggered).length,
    triggered: enrichedAlerts.filter((a) => a._isHit || a.is_triggered).length,
    paused: enrichedAlerts.filter((a) => !a.is_active && !a._isHit && !a.is_triggered).length,
  }), [enrichedAlerts]);

  const visibleAlerts = useMemo(() => {
    return enrichedAlerts.filter((a) => {
      if (alertFilter === "triggered") return a._isHit || a.is_triggered;
      if (alertFilter === "paused") return !a.is_active && !a._isHit && !a.is_triggered;
      return a.is_active && !a._isHit && !a.is_triggered;
    });
  }, [alertFilter, enrichedAlerts]);

  const handleReset = async (id: string, currentPrice?: number | null) => {
    const res = await resetAlert(id, currentPrice);
    if (res?.error) {
      toast.error("Failed to re-arm alert");
    } else {
      toast.success("Alert re-armed");
    }
  };

  const handleResetOrEdit = (alert: (typeof enrichedAlerts)[number]) => {
    const currentPrice = alert._parsed?.currentPrice;
    const stillSatisfied = doesPriceSatisfyTarget(alert.condition, alert.target_price, currentPrice);

    if (stillSatisfied) {
      editAlert(alert);
      toast.info(`Price (${alert.asset_unit} ${currentPrice?.toLocaleString()}) already meets target. Set a new target to re-arm.`);
    } else {
      void handleReset(alert.id, currentPrice);
    }
  };

  const loading = watchlistLoading || marketLoading || fundsLoading;
  const move = async (row: AssetRow, offset: -1 | 1) => {
    const index = items.findIndex((item) => item.id === row.entry.id);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const result = await reorder(next.map((item) => item.id));
    if (!result.ok) toast.error("Unable to save the new order");
  };

  const addAsset = async (id: string, name: string) => {
    const result = await add(addType, id, name);
    if (!result.ok) {
      toast.error("Unable to add that asset");
      return;
    }
    if (result.duplicate) {
      toast.info("That asset is already saved");
      return;
    }
    toast.success(`${name} added to your watchlist`);
  };

  const removeAsset = async (row: AssetRow) => {
    const result = await remove(row.entry.id);
    if (!result.ok) return toast.error("Unable to remove that asset");
    toast.success(`${row.title} removed from your watchlist`);
  };

  const editAlert = (alert: PriceAlert) => {
    const asset = rowByAlert.get(`${alert.asset_type}:${alert.asset_id}`);
    setEditing({
      entry: asset?.entry ?? { id: alert.id, user_id: alert.user_id, item_type: alert.asset_type, item_id: alert.asset_id, item_name: alert.asset_name, sort_order: 0 },
      type: alert.asset_type,
      title: alert.asset_name,
      subtitle: asset?.subtitle ?? assetLabels[alert.asset_type],
      value: asset?.value ?? alert.target_price,
      unit: alert.asset_unit,
    });
    setEditingAlert(alert);
  };

  return (
    <section className="mx-auto max-w-[1600px] space-y-5 bg-background text-foreground px-4 md:px-6 py-6">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Personal market workspace</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">{active === "watchlist" ? "Watchlist" : "Alerts"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{active === "watchlist" ? "Track saved funds, stocks, FX rates, and commodities in one focused market view." : "Monitor and manage price alerts for the assets you save."}</p>
        </div>
        <SectionLiveStatus section="stocks" />
      </header>

      {showingGuestDemo && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-3">
          <span>Demo watchlist · Sign in only when you want to save across devices.</span>
          <Link to="/auth?redirect=/watchlist" className="font-bold underline hover:no-underline">Sign in ↗</Link>
        </div>
      )}

      {active === "watchlist" ? (
        <>
          <div className="flex items-center gap-2 overflow-hidden flex-wrap">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
              <nav className="flex items-center gap-2" aria-label="Watchlist workspace">
                <Link to="/watchlist" className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold transition-colors", active === "watchlist" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>Saved assets <span className="tabular-nums opacity-70">{rows.length}</span></Link>
                <Link to="/alerts" className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold transition-colors", active === "alerts" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>Alerts <span className="tabular-nums opacity-70">{counts.active + counts.triggered + counts.paused}</span></Link>
              </nav>
            </div>
            <div className="relative ml-auto w-72 shrink-0"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved assets..." className="h-10 rounded-full border-border bg-card pl-10 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500/50" /></div>
            <Button onClick={() => setShowAdd(true)} size="sm" className="h-10 shrink-0 gap-1.5 rounded-full bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Add assets</Button>
          </div>

          {!user && !showingGuestDemo && <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">Saved items are stored in this browser. <Link to="/auth?redirect=/watchlist" className="font-bold text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400">Sign in</Link> to create alerts and keep your watchlist across devices.</div>}

          {loading ? <div className="grid grid-cols-2 gap-4"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div> : rows.length === 0 ? <EmptyWatchlist onAdd={() => setShowAdd(true)} /> : (
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <div className="w-full overflow-x-auto border-b border-border px-4 py-3 scrollbar-hide">
                <nav className="flex min-w-max items-center gap-2" aria-label="Saved asset type">
                  {(["all", "stock", "fund", "currency", "commodity"] as const).map((value) => {
                    const activeFilter = filter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-xs font-bold transition-colors", activeFilter ? "border-foreground bg-foreground text-background" : "border-border bg-muted/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground")}
                      >
                        {value === "all" ? "All assets" : assetLabels[value]}
                      </button>
                    );
                  })}
                </nav>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
                <div><h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saved assets ({filteredRows.length})</h2><p className="mt-0.5 text-xs text-muted-foreground">Live values are refreshed with the latest published market data.</p></div>
                <Button variant="ghost" size="sm" onClick={() => setIsReordering((value) => !value)} className={cn("gap-1.5 rounded-lg text-xs font-bold", isReordering && "bg-muted text-foreground")}><SlidersHorizontal className="h-3.5 w-3.5" /> {isReordering ? "Done" : "Reorder"}</Button>
              </div>
              {filteredRows.length === 0 ? <div className="px-5 py-12 text-center"><p className="text-sm font-bold">No matching saved assets</p><p className="mt-1 text-sm text-muted-foreground">Try another search term or select a different asset type.</p></div> : <div className="grid gap-3 p-4 lg:grid-cols-2">
                {filteredRows.map((row) => {
                  const alert = alerts.find((item) => item.asset_type === row.type && item.asset_id === row.entry.item_id);
                  return <AssetListRow key={row.entry.id} row={row} alert={alert} reordering={isReordering} canMoveUp={items[0]?.id !== row.entry.id} canMoveDown={items[items.length - 1]?.id !== row.entry.id} onMove={move} onAlert={() => { setEditing(row); setEditingAlert(alert ?? null); }} onRemove={() => void removeAsset(row)} />;
                })}
              </div>}
            </section>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-hidden flex-wrap">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
              <nav className="flex items-center gap-2" aria-label="Watchlist workspace">
                <Link to="/watchlist" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground">Saved assets <span className="tabular-nums opacity-70">{rows.length}</span></Link>
                <Link to="/alerts" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-foreground bg-foreground px-4 text-xs font-bold text-background">Alerts <span className="tabular-nums opacity-70">{counts.active + counts.triggered + counts.paused}</span></Link>
              </nav>
              <span className="h-6 w-px shrink-0 bg-border" />
              {(["active", "triggered", "paused"] as const).map((value) => <button key={value} type="button" onClick={() => setAlertFilter(value)} className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold capitalize transition-colors", alertFilter === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value} <span className="tabular-nums opacity-70">{counts[value]}</span></button>)}
            </div>
            <Button disabled={!user || rows.length === 0} size="sm" onClick={() => { const first = rows[0]; if (first) { setEditing(first); setEditingAlert(null); } }} className="ml-auto h-9 shrink-0 gap-1.5 rounded-full bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> New alert</Button>
          </div>
          {!user ? <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">Sign in to create and manage alerts.</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">Save an asset first, then create its alert here.</div> : alertsLoading ? <div className="h-32 animate-pulse rounded-2xl bg-muted" /> : visibleAlerts.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No {alertFilter} alerts.</div> : <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-bold capitalize">{alertFilter} alerts</h2><p className="mt-0.5 text-xs text-muted-foreground">One-shot alerts are delivered when their target is met.</p></div><div className="grid gap-3 p-4 lg:grid-cols-2">{visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} visualUrl={rowByAlert.get(`${alert.asset_type}:${alert.asset_id}`)?.visualUrl} onEdit={() => editAlert(alert)} onToggle={() => void toggleAlert(alert.id, !alert.is_active)} onReset={() => handleResetOrEdit(alert)} onDelete={() => void deleteAlert(alert.id)} />)}</div></section>}
        </>
      )}

      <AddAssetsDialog open={showAdd} onOpenChange={setShowAdd} type={addType} onTypeChange={setAddType} query={addQuery} onQueryChange={setAddQuery} items={addableRows} onAdd={addAsset} />
      {editing && <CreateAlertDialog open onOpenChange={(open) => { if (!open) { setEditing(null); setEditingAlert(null); } }} assetType={editing.type} assetId={editing.entry.item_id} assetName={editing.title} currentPrice={editing.value} unit={editing.unit} editAlert={editingAlert} />}
    </section>
  );
}

function AssetIcon({ type }: { type: AssetType }) {
  const Icon = type === "stock" ? TrendingUp : type === "commodity" ? Gem : type === "currency" ? TrendingDown : Star;
  return <Icon className="h-4 w-4" />;
}

function AssetVisual({ type, visualUrl, title, subtitle }: { type: AssetType; visualUrl?: string; title?: string; subtitle?: string }) {
  return (
    <WatchlistAssetAvatar
      type={type}
      symbol={title}
      name={subtitle || title || ""}
      logoUrl={visualUrl}
      size={40}
    />
  );
}

function AssetListRow({ row, alert, reordering, canMoveUp, canMoveDown, onMove, onAlert, onRemove }: {
  row: AssetRow;
  alert?: PriceAlert;
  reordering: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (row: AssetRow, offset: -1 | 1) => Promise<void>;
  onAlert: () => void;
  onRemove: () => void;
}) {
  const isPositive = (row.change ?? 0) >= 0;

  return (
    <article className="group flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all hover:border-emerald-500/40 hover:shadow-xs">
      <div className="flex min-w-0 w-full items-start gap-3">
        <AssetVisual type={row.type} visualUrl={row.visualUrl} title={row.title} subtitle={row.subtitle} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={row.href ?? "/watchlist"} className="truncate text-base sm:text-lg font-bold tracking-tight text-foreground hover:text-emerald-600 dark:hover:text-emerald-400">
              {row.title}
            </Link>
            <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold capitalize text-muted-foreground">
              {row.type === "fund" ? "MMF" : row.type}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs sm:text-sm text-muted-foreground">{row.subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base sm:text-lg font-bold tabular-nums text-foreground">{formatValue(row.value, row.unit)}</p>
          <p className={cn("mt-0.5 text-xs font-bold tabular-nums", row.change == null ? "text-muted-foreground/60" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {row.change == null ? "No daily change" : `${isPositive ? "+" : ""}${row.change.toFixed(2)}% today`}
          </p>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 gap-4 text-xs text-muted-foreground">
          {row.meta?.map((item) => (
            <span key={item.label} className="truncate">
              <span>{item.label} </span>
              <strong className="text-foreground">{item.value}</strong>
            </span>
          ))}
        </div>
        {reordering ? (
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <Button variant="ghost" size="icon" title="Move up" disabled={!canMoveUp} onClick={() => void onMove(row, -1)}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Move down" disabled={!canMoveDown} onClick={() => void onMove(row, 1)}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title={currentAlertState(alert)} onClick={onAlert} className="rounded-full hover:bg-emerald-500/10">
              <Bell className={cn("h-4 w-4", alert?.is_triggered ? "text-amber-500" : alert?.is_active ? "text-emerald-500" : "text-muted-foreground/50")} />
            </Button>
            <Button variant="ghost" size="icon" title="Remove from watchlist" className="rounded-full text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyWatchlist({ onAdd }: { onAdd: () => void }) {
  return <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-xs"><KoraIllustration pose="wave" className="absolute bottom-0 right-5 hidden h-36 w-36 md:block" /><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10"><Star className="h-5 w-5 text-amber-500" /></span><h2 className="mt-4 text-sm font-bold text-foreground">No saved assets</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add funds, stocks, FX rates, or commodities to begin tracking them.</p><Button className="mt-5 h-10 gap-1.5 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700" onClick={onAdd}><Plus className="h-4 w-4" /> Add assets</Button></div>;
}

function AddAssetsDialog({ open, onOpenChange, type, onTypeChange, query, onQueryChange, items, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; type: AssetType; onTypeChange: (type: AssetType) => void; query: string; onQueryChange: (query: string) => void; items: Array<{ id: string; name: string; value: string }>; onAdd: (id: string, name: string) => Promise<void>; }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl rounded-2xl border-border p-6 shadow-soft"><DialogHeader><DialogTitle className="text-lg tracking-tight">Add to watchlist</DialogTitle></DialogHeader><div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1">{(Object.keys(assetLabels) as AssetType[]).map((value) => <button key={value} type="button" onClick={() => onTypeChange(value)} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors", type === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground")}>{assetLabels[value]}</button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${assetLabels[type].toLowerCase()}`} className="h-10 rounded-xl pl-9" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{items.map((item) => <button key={item.id} type="button" onClick={() => void onAdd(item.id, item.name)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"><span className="text-sm font-bold">{item.name}</span><span className="text-xs font-semibold text-muted-foreground">{item.value}</span></button>)}{items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching assets available.</p>}</div></DialogContent></Dialog>;
}

function AlertRow({ alert, visualUrl, onEdit, onToggle, onReset, onDelete }: { alert: PriceAlert & { _isHit?: boolean; _parsed?: any }; visualUrl?: string; onEdit: () => void; onToggle: () => void; onReset: () => void; onDelete: () => void; }) {
  const triggered = Boolean(alert._isHit || alert.is_triggered);
  return (
    <article className={cn("flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-emerald-500/40", triggered && "border-emerald-500/30 bg-emerald-500/[0.04]")}>
      <AssetVisual type={alert.asset_type} visualUrl={visualUrl} title={alert.asset_name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">{alert.asset_name}</span>
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold capitalize text-muted-foreground">
            {alert.asset_type === "fund" ? "MMF" : alert.asset_type}
          </span>
          {triggered && <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Hit</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{alert.condition === "above" ? "Above" : "Below"} {formatValue(alert.target_price, alert.asset_unit)}</span>
          <span className="ml-2">{triggered ? "Target hit" : alert.is_active ? "Monitoring" : "Paused"}</span>
        </p>
      </div>
      {triggered ? (
        <Button size="sm" variant="outline" onClick={onReset} className="h-8 rounded-full border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 text-xs font-bold gap-1">
          <RotateCcw className="h-3.5 w-3.5" /> Re-arm
        </Button>
      ) : (
        <Switch checked={alert.is_active} onCheckedChange={onToggle} aria-label={alert.is_active ? "Pause alert" : "Resume alert"} />
      )}
      <Button variant="ghost" size="sm" onClick={onEdit} className="rounded-lg text-xs font-bold">Edit</Button>
      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete} aria-label="Delete alert"><Trash2 className="h-4 w-4" /></Button>
    </article>
  );
}
