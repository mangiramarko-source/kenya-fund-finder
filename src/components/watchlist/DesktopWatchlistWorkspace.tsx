import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowUp, Bell,
  Gem, GripVertical, Plus, Search, SlidersHorizontal, Star, Trash2, TrendingDown, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedWatchlist, type UnifiedWatchlistItem } from "@/hooks/useUnifiedWatchlist";
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
};

const assetLabels: Record<AssetType, string> = {
  stock: "Stocks",
  fund: "Funds",
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
  const { items, loading: watchlistLoading, add, remove, reorder } = useUnifiedWatchlist();
  const { alerts, loading: alertsLoading, deleteAlert, toggleAlert } = usePriceAlerts();
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

  const rows = useMemo<AssetRow[]>(() => {
    const stockMap = new Map(stocks.map((stock) => [stock.id, stock]));
    const fundMap = new Map(funds.map((fund) => [fund.id, fund]));
    const rateMap = new Map(rates.map((rate) => [rate.id, rate]));
    const commodityMap = new Map(commodities.map((commodity) => [commodity.id, commodity]));

    return items.reduce<AssetRow[]>((result, entry) => {
      if (entry.item_type === "stock") {
        const asset = stockMap.get(entry.item_id);
        if (asset) result.push({ entry, type: "stock", title: asset.symbol, subtitle: asset.name, value: asset.price, unit: "KES", change: asset.day_change_percent, href: `/stocks/${asset.symbol}` });
      }
      else if (entry.item_type === "fund") {
        const asset = fundMap.get(entry.item_id);
        if (asset) result.push({ entry, type: "fund", title: asset.name, subtitle: asset.manager, value: asset.annual_yield, unit: "%", href: `/compare/${asset.slug}` });
      }
      else if (entry.item_type === "currency") {
        const asset = rateMap.get(entry.item_id);
        if (asset) result.push({ entry, type: "currency", title: `${asset.currency_code}/KES`, subtitle: asset.currency_name, value: asset.rate, unit: "KES", change: asset.day_change_percent, href: "/rates" });
      }
      else if (entry.item_type === "commodity") {
        const asset = commodityMap.get(entry.item_id);
        if (asset) result.push({ entry, type: "commodity", title: asset.name, subtitle: asset.symbol, value: asset.price, unit: asset.unit, change: asset.day_change_percent, href: "/commodities" });
      }
      return result;
    }, []);
  }, [commodities, funds, items, rates, stocks]);

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

  const visibleAlerts = useMemo(() => alerts.filter((alert) =>
    alertFilter === "triggered" ? alert.is_triggered : alertFilter === "paused" ? !alert.is_active && !alert.is_triggered : alert.is_active && !alert.is_triggered,
  ), [alertFilter, alerts]);
  const counts = useMemo(() => ({
    active: alerts.filter((alert) => alert.is_active && !alert.is_triggered).length,
    triggered: alerts.filter((alert) => alert.is_triggered).length,
    paused: alerts.filter((alert) => !alert.is_active && !alert.is_triggered).length,
  }), [alerts]);

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
    <section className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">Personal market workspace</p>
          <h1 className="mt-2 text-5xl font-black tracking-tight">{active === "watchlist" ? "Watchlist" : "Alerts"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{active === "watchlist" ? "Track saved funds, stocks, FX rates, and commodities in one focused market view." : "Monitor and manage price alerts for the assets you save."}</p>
        </div>
        <SectionLiveStatus section="stocks" />
      </header>

      {active === "watchlist" ? (
        <>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
              <nav className="flex items-center gap-2" aria-label="Watchlist workspace">
                <Link to="/watchlist" className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors", active === "watchlist" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>Saved assets <span className="tabular-nums opacity-70">{rows.length}</span></Link>
                <Link to="/alerts" className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors", active === "alerts" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>Alerts <span className="tabular-nums opacity-70">{counts.active + counts.triggered + counts.paused}</span></Link>
              </nav>
            </div>
            <div className="relative ml-auto w-80 shrink-0"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved assets..." className="h-11 rounded-full border-border bg-card pl-11 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500/50" /></div>
            <Button onClick={() => setShowAdd(true)} className="h-11 shrink-0 gap-1.5 rounded-full bg-emerald-500 px-4 font-bold text-white hover:bg-emerald-600"><Plus className="h-4 w-4" /> Add assets</Button>
          </div>

          {!user && <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">Saved items are stored in this browser. <Link to="/auth?redirect=/watchlist" className="font-bold text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400">Sign in</Link> to create alerts and keep your watchlist across devices.</div>}

          {loading ? <div className="grid grid-cols-2 gap-4"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div> : rows.length === 0 ? <EmptyWatchlist onAdd={() => setShowAdd(true)} /> : (
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="w-full overflow-x-auto border-b border-border/60 scrollbar-hide">
                <nav className="flex min-w-max items-center gap-6 px-5" aria-label="Saved asset type">
                  {(["all", "stock", "fund", "currency", "commodity"] as const).map((value) => {
                    const activeFilter = filter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={cn("relative shrink-0 pb-3 pt-4 text-sm font-medium transition-colors", activeFilter ? "text-emerald-500" : "text-muted-foreground hover:text-foreground")}
                      >
                        {value === "all" ? "All assets" : assetLabels[value]}
                        {activeFilter && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-emerald-500" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
                <div><h2 className="text-sm font-bold">Saved assets</h2><p className="mt-0.5 text-xs text-muted-foreground">Live values are refreshed with the latest published market data.</p></div>
                <Button variant="ghost" size="sm" onClick={() => setIsReordering((value) => !value)} className={cn("gap-1.5 rounded-lg text-xs font-bold", isReordering && "bg-muted text-foreground")}><SlidersHorizontal className="h-3.5 w-3.5" /> {isReordering ? "Done" : "Reorder"}</Button>
              </div>
              {filteredRows.length === 0 ? <div className="px-5 py-12 text-center"><p className="text-sm font-bold">No matching saved assets</p><p className="mt-1 text-sm text-muted-foreground">Try another search term or select a different asset type.</p></div> : <div className="divide-y divide-border/60">
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
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
              <nav className="flex items-center gap-2" aria-label="Watchlist workspace">
                <Link to="/watchlist" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">Saved assets <span className="tabular-nums opacity-70">{rows.length}</span></Link>
                <Link to="/alerts" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-foreground bg-foreground px-4 text-sm font-bold text-background">Alerts <span className="tabular-nums opacity-70">{counts.active + counts.triggered + counts.paused}</span></Link>
              </nav>
              <span className="h-7 w-px shrink-0 bg-border" />
              {(["active", "triggered", "paused"] as const).map((value) => <button key={value} type="button" onClick={() => setAlertFilter(value)} className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold capitalize transition-colors", alertFilter === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{value} <span className="tabular-nums opacity-70">{counts[value]}</span></button>)}
            </div>
            <Button disabled={!user || rows.length === 0} onClick={() => { const first = rows[0]; if (first) { setEditing(first); setEditingAlert(null); } }} className="ml-auto h-11 shrink-0 gap-1.5 rounded-full bg-emerald-500 px-4 font-bold text-white hover:bg-emerald-600"><Plus className="h-4 w-4" /> New alert</Button>
          </div>
          {!user ? <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">Sign in to create and manage alerts.</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border/80 bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">Save an asset first, then create its alert here.</div> : alertsLoading ? <div className="h-32 animate-pulse rounded-2xl bg-muted" /> : visibleAlerts.length === 0 ? <div className="rounded-2xl border border-dashed border-border/80 bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">No {alertFilter} alerts.</div> : <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"><div className="border-b border-border/60 px-5 py-4"><h2 className="text-sm font-bold capitalize">{alertFilter} alerts</h2><p className="mt-0.5 text-xs text-muted-foreground">One-shot alerts are delivered when their target is met.</p></div><div className="divide-y divide-border/60">{visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} onEdit={() => editAlert(alert)} onToggle={() => void toggleAlert(alert.id, !alert.is_active)} onDelete={() => void deleteAlert(alert.id)} />)}</div></section>}
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
  const deltaTone = row.change == null ? "border-border/70 bg-muted/50 text-muted-foreground" : isPositive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-destructive/20 bg-destructive/10 text-destructive";

  return <article className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/25">
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", deltaTone)}><AssetIcon type={row.type} /></div>
    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Link to={row.href ?? "/watchlist"} className="truncate text-sm font-bold tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400">{row.title}</Link><span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-bold capitalize text-muted-foreground">{row.type}</span></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{row.subtitle}</p></div>
    <div className="hidden text-right sm:block"><p className="text-sm font-bold tabular-nums">{formatValue(row.value, row.unit)}</p><p className={cn("mt-0.5 text-xs font-bold tabular-nums", row.change == null ? "text-muted-foreground" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{row.change == null ? "No daily change" : `${isPositive ? "+" : ""}${row.change.toFixed(2)}% today`}</p></div>
    {reordering ? <div className="flex items-center gap-1"><GripVertical className="h-4 w-4 text-muted-foreground" /><Button variant="ghost" size="icon" title="Move up" disabled={!canMoveUp} onClick={() => void onMove(row, -1)}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Move down" disabled={!canMoveDown} onClick={() => void onMove(row, 1)}><ArrowDown className="h-4 w-4" /></Button></div> : <div className="flex items-center gap-1"><Button variant="ghost" size="icon" title={currentAlertState(alert)} onClick={onAlert} className="rounded-full hover:bg-emerald-500/10"><Bell className={cn("h-4 w-4", alert?.is_triggered ? "text-amber-500" : alert?.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} /></Button><Button variant="ghost" size="icon" title="Remove from watchlist" className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button></div>}
  </article>;
}

function EmptyWatchlist({ onAdd }: { onAdd: () => void }) {
  return <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-14 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10"><Star className="h-5 w-5 text-amber-500" /></span><h2 className="mt-4 text-sm font-bold">No saved assets</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add funds, stocks, FX rates, or commodities to begin tracking them.</p><Button className="mt-5 h-10 gap-1.5 rounded-xl bg-emerald-500 font-bold text-white hover:bg-emerald-600" onClick={onAdd}><Plus className="h-4 w-4" /> Add assets</Button></div>;
}

function AddAssetsDialog({ open, onOpenChange, type, onTypeChange, query, onQueryChange, items, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; type: AssetType; onTypeChange: (type: AssetType) => void; query: string; onQueryChange: (query: string) => void; items: Array<{ id: string; name: string; value: string }>; onAdd: (id: string, name: string) => Promise<void>; }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl rounded-2xl border-border/70 p-6 shadow-soft"><DialogHeader><DialogTitle className="text-lg tracking-tight">Add to watchlist</DialogTitle></DialogHeader><div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1">{(Object.keys(assetLabels) as AssetType[]).map((value) => <button key={value} type="button" onClick={() => onTypeChange(value)} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors", type === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>{assetLabels[value]}</button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${assetLabels[type].toLowerCase()}`} className="h-10 rounded-xl pl-9" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{items.map((item) => <button key={item.id} type="button" onClick={() => void onAdd(item.id, item.name)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"><span className="text-sm font-bold">{item.name}</span><span className="text-xs font-semibold text-muted-foreground">{item.value}</span></button>)}{items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching assets available.</p>}</div></DialogContent></Dialog>;
}

function AlertRow({ alert, onEdit, onToggle, onDelete }: { alert: PriceAlert; onEdit: () => void; onToggle: () => void; onDelete: () => void; }) {
  const triggered = alert.is_triggered;
  return <article className={cn("flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/25", triggered && "bg-amber-500/[0.04]")}><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border", alert.condition === "above" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-destructive/20 bg-destructive/10 text-destructive")}>{alert.condition === "above" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-bold">{alert.asset_name}</span><span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-bold capitalize text-muted-foreground">{alert.asset_type}</span>{triggered && <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">Triggered</span>}</div><p className="mt-1 text-xs text-muted-foreground"><span className="font-bold text-foreground">{alert.condition === "above" ? "Above" : "Below"} {formatValue(alert.target_price, alert.asset_unit)}</span><span className="ml-2">{alert.is_active ? "Monitoring" : "Paused"}</span></p></div>{!triggered && <Switch checked={alert.is_active} onCheckedChange={onToggle} aria-label={alert.is_active ? "Pause alert" : "Resume alert"} />}<Button variant="ghost" size="sm" onClick={onEdit} className="rounded-lg text-xs font-bold">Edit</Button><Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onDelete} aria-label="Delete alert"><Trash2 className="h-4 w-4" /></Button></article>;
}
