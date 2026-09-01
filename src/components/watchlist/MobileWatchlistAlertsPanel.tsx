import { useMemo, useState } from "react";
import { Bell, BellOff, CheckCircle2, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import type { AlertAssetType, PriceAlert } from "@/hooks/usePriceAlerts";
import { cn } from "@/lib/utils";

export type WatchlistAlertAsset = { type: Exclude<AlertAssetType, "new_fund">; id: string; name: string; value: number; unit: string };

export default function MobileWatchlistAlertsPanel({ alerts, assets, query, onQueryChange, pickerOpen, onPickerOpenChange, onDelete, onToggle }: {
  alerts: PriceAlert[];
  assets: WatchlistAlertAsset[];
  query: string;
  onQueryChange: (value: string) => void;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
}) {
  const [status, setStatus] = useState<"active" | "triggered" | "paused">("active");
  const [editing, setEditing] = useState<PriceAlert | null>(null);
  const [selected, setSelected] = useState<WatchlistAlertAsset | null>(null);
  const normalized = query.trim().toLowerCase();
  const counts = useMemo(() => ({
    active: alerts.filter((alert) => alert.is_active && !alert.is_triggered).length,
    triggered: alerts.filter((alert) => alert.is_triggered).length,
    paused: alerts.filter((alert) => !alert.is_active && !alert.is_triggered).length,
  }), [alerts]);
  const visible = alerts.filter((alert) => {
    const matchesStatus = status === "active" ? alert.is_active && !alert.is_triggered : status === "triggered" ? alert.is_triggered : !alert.is_active && !alert.is_triggered;
    return matchesStatus && (!normalized || `${alert.asset_name} ${alert.asset_type}`.toLowerCase().includes(normalized));
  });
  const byId = new Map(assets.map((asset) => [`${asset.type}:${asset.id}`, asset]));
  const editAsset = editing && editing.asset_type !== "new_fund" ? byId.get(`${editing.asset_type}:${editing.asset_id}`) ?? {
    type: editing.asset_type,
    id: editing.asset_id,
    name: editing.asset_name,
    value: editing.target_price,
    unit: editing.asset_unit,
  } : null;

  return <section className="space-y-4">
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {(["active", "triggered", "paused"] as const).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold capitalize", status === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground")}>
      {value === "active" ? <Bell className="h-3.5 w-3.5" /> : value === "triggered" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}{value}<span className="opacity-70">{counts[value]}</span>
      </button>)}
    </div>
    <div className="relative"><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search alerts..." className="h-11 rounded-full border-border/80 bg-card px-4 text-[15px] shadow-sm" /></div>
    {visible.length ? <div className="space-y-2.5">{visible.map((alert) => <AlertCard key={alert.id} alert={alert} onEdit={() => setEditing(alert)} onDelete={onDelete} onToggle={onToggle} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center"><Bell className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" /><h2 className="text-base font-semibold">{normalized ? "No matching alerts" : `No ${status} alerts`}</h2><p className="mt-1 text-sm text-muted-foreground">{normalized ? "Try another search term." : "Add an alert for an asset in this watchlist."}</p></div>}
    <Dialog open={pickerOpen} onOpenChange={onPickerOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Create alert</DialogTitle></DialogHeader><div className="space-y-2">{assets.map((asset) => <button key={`${asset.type}:${asset.id}`} type="button" onClick={() => { setSelected(asset); onPickerOpenChange(false); }} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-3 text-left"><span><span className="block text-sm font-bold">{asset.name}</span><span className="text-xs capitalize text-muted-foreground">{asset.type}</span></span><span className="text-xs font-semibold tabular-nums">{asset.value.toLocaleString()} {asset.unit}</span></button>)}</div></DialogContent></Dialog>
    {selected && <CreateAlertDialog open onOpenChange={(open) => { if (!open) setSelected(null); }} assetType={selected.type} assetId={selected.id} assetName={selected.name} currentPrice={selected.value} unit={selected.unit} />}
    {editing && editAsset && <CreateAlertDialog open editAlert={editing} onOpenChange={(open) => { if (!open) setEditing(null); }} assetType={editAsset.type} assetId={editAsset.id} assetName={editAsset.name} currentPrice={editAsset.value} unit={editAsset.unit} />}
  </section>;
}

function AlertCard({ alert, onEdit, onDelete, onToggle }: { alert: PriceAlert; onEdit: () => void; onDelete: (id: string) => Promise<void>; onToggle: (id: string, active: boolean) => Promise<void> }) {
  const triggered = alert.is_triggered;
  const paused = !alert.is_active && !triggered;
  return <article className={cn("rounded-2xl border bg-card p-3.5", triggered && "border-emerald-500/30 bg-emerald-500/5", paused && "opacity-70")}><div className="flex gap-3"><div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", alert.condition === "above" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>{alert.condition === "above" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-sm font-bold">{alert.asset_name}</p><Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">{alert.asset_type}</Badge>{triggered && <Badge className="h-4 bg-emerald-600 px-1.5 text-[10px]">Hit</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{alert.condition === "above" ? "Above" : "Below"} <span className="font-semibold text-foreground">{alert.target_price.toLocaleString()} {alert.asset_unit}</span></p></div><div className="flex shrink-0 flex-col items-end gap-1">{!triggered && <Switch checked={alert.is_active} onCheckedChange={() => void onToggle(alert.id, !alert.is_active)} />}<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Edit alert"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => void onDelete(alert.id)} aria-label="Delete alert"><Trash2 className="h-3.5 w-3.5" /></Button></div></div></article>;
}
