import { useState, useEffect, useMemo } from "react";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useEmailPreferences } from "@/hooks/useEmailPreferences";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bell, BellOff, Trash2, TrendingUp, TrendingDown, Clock, CheckCircle,
  Plus, Mail, Settings2, Search, ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AssetOption {
  id: string;
  name: string;
  currentValue: number;
  unit?: string;
}

type TabKey = "active" | "triggered" | "paused" | "settings";

const AlertsPage = () => {
  useDocumentTitle(
    "Price Alerts – Track Stocks, FX & Commodities | Kenya Fund Finder",
    "Set custom price alerts for Kenyan stocks, FX rates, and commodities. Get notified when assets cross your target price.",
    {
      title: "Price Alerts for Kenyan Stocks, FX & Commodities",
      description: "Set custom price alerts and get notified when assets cross your target price.",
    }
  );
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alerts, loading, deleteAlert, toggleAlert, createAlert } = usePriceAlerts();
  const { prefs, loading: prefsLoading, updatePref } = useEmailPreferences();

  const [tab, setTab] = useState<TabKey>("active");

  // New Alert dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [assetType, setAssetType] = useState<"stock" | "currency" | "commodity" | "fund">("stock");
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving, setSaving] = useState(false);

  // Fetch assets when type changes
  useEffect(() => {
    if (!showCreate) return;
    setLoadingAssets(true);
    setSelectedAssetId("");
    setAssetSearch("");
    setTargetPrice("");

    const fetchAssets = async () => {
      let options: AssetOption[] = [];
      if (assetType === "stock") {
        const { data } = await supabase.from("stocks").select("id, name, symbol, price").eq("is_active", true).order("name");
        options = (data || []).map((s) => ({ id: s.id, name: `${s.name} (${s.symbol})`, currentValue: Number(s.price), unit: "KES" }));
      } else if (assetType === "currency") {
        const { data } = await supabase.from("exchange_rates").select("id, currency_name, currency_code, rate").eq("is_active", true).order("currency_name");
        options = (data || []).map((r) => ({ id: r.id, name: `${r.currency_name} (${r.currency_code})`, currentValue: Number(r.rate), unit: "KES" }));
      } else if (assetType === "commodity") {
        const { data } = await supabase.from("commodities").select("id, name, symbol, price, unit").eq("is_active", true).order("name");
        options = (data || []).map((c) => ({ id: c.id, name: c.name, currentValue: Number(c.price), unit: c.unit }));
      } else if (assetType === "fund") {
        const { data } = await supabase.from("funds").select("id, name, annual_yield").eq("is_published", true).order("name");
        options = (data || []).map((f) => ({ id: f.id, name: f.name, currentValue: Number(f.annual_yield), unit: "%" }));
      }
      setAssetOptions(options);
      setLoadingAssets(false);
    };
    fetchAssets();
  }, [assetType, showCreate]);

  const selectedAsset = assetOptions.find((a) => a.id === selectedAssetId);
  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assetOptions;
    const q = assetSearch.toLowerCase();
    return assetOptions.filter((a) => a.name.toLowerCase().includes(q));
  }, [assetOptions, assetSearch]);

  const handleCreate = async () => {
    if (!selectedAsset) { toast.error("Please select an asset"); return; }
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) { toast.error("Please enter a valid target"); return; }
    setSaving(true);
    const result = await createAlert({
      asset_type: assetType,
      asset_id: selectedAsset.id,
      asset_name: selectedAsset.name,
      target_price: price,
      condition,
    });
    setSaving(false);
    if (result?.error) {
      toast.error("Failed to create alert");
    } else {
      toast.success(`Alert set for ${selectedAsset.name}`);
      setShowCreate(false);
      setTargetPrice("");
      setSelectedAssetId("");
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to manage alerts</h1>
        <p className="text-muted-foreground mb-6">Create and manage price alerts for stocks, currencies, commodities, and unit trusts.</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);
  const pausedAlerts = alerts.filter(a => !a.is_active && !a.is_triggered);

  const handleDelete = async (id: string) => {
    await deleteAlert(id);
    toast.success("Alert deleted");
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    await toggleAlert(id, !currentActive);
    toast.success(currentActive ? "Alert paused" : "Alert resumed");
  };

  const tabs: { key: TabKey; label: string; count: number; icon: any }[] = [
    { key: "active", label: "Active", count: activeAlerts.length, icon: Bell },
    { key: "triggered", label: "Triggered", count: triggeredAlerts.length, icon: CheckCircle },
    { key: "paused", label: "Paused", count: pausedAlerts.length, icon: BellOff },
    { key: "settings", label: "Settings", count: 0, icon: Settings2 },
  ];

  const renderList = () => {
    if (loading) {
      return (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse" />
          ))}
        </div>
      );
    }
    if (tab === "active") {
      return activeAlerts.length > 0
        ? <div className="space-y-2.5">{activeAlerts.map(a => <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />)}</div>
        : <EmptyState icon={Bell} title="No active alerts" description="Tap '+ New' to create your first one." onCta={() => setShowCreate(true)} ctaLabel="New Alert" />;
    }
    if (tab === "triggered") {
      return triggeredAlerts.length > 0
        ? <div className="space-y-2.5">{triggeredAlerts.map(a => <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />)}</div>
        : <EmptyState icon={CheckCircle} title="Nothing triggered yet" description="Alerts move here once your target is hit." />;
    }
    if (tab === "paused") {
      return pausedAlerts.length > 0
        ? <div className="space-y-2.5">{pausedAlerts.map(a => <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />)}</div>
        : <EmptyState icon={BellOff} title="No paused alerts" description="Pause an alert to temporarily stop monitoring." />;
    }
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-accent" />
              <h3 className="font-semibold text-sm text-foreground">Email Notifications</h3>
            </div>
            <SettingRow
              title="Instant Price Alerts"
              description="Email you immediately when targets are hit."
              checked={prefs.price_alert_email}
              onChange={(v) => updatePref("price_alert_email", v)}
              disabled={prefsLoading}
            />
            <SettingRow
              title="Market Brief & Morning News"
              description="Market Brief updates plus weekday morning News Highlights from stored, quality-checked articles."
              checked={prefs.market_brief_email}
              onChange={(v) => updatePref("market_brief_email", v)}
              disabled={prefsLoading}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-3xl px-3 sm:px-4 pt-3 pb-28 md:pb-10">
      {/* Sticky compact header */}
      <header className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">Price Alerts</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              {activeAlerts.length} active · {triggeredAlerts.length} triggered · {pausedAlerts.length} paused
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            className="gap-1 shrink-0 h-9 px-3 rounded-full"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>

        {/* Scrollable tabs */}
        <div className="mt-3 -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max">
            {tabs.map((t) => {
              const isActive = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.key !== "settings" && (
                    <span className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[10px] font-semibold",
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mt-4">
        {alerts.length === 0 && !loading && tab !== "settings" ? (
          <Card>
            <CardContent className="py-12 text-center px-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground mb-1">No alerts yet</h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Get notified when stocks, unit trusts, currencies, or commodities hit your target.
              </p>
              <Button onClick={() => setShowCreate(true)} className="gap-1.5 rounded-full">
                <Plus className="h-4 w-4" /> Create your first alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          renderList()
        )}
      </div>

      {/* Mobile floating action button */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="New alert"
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Alert Dialog — mobile bottom sheet, desktop centered */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="p-0 gap-0 sm:max-w-[440px] max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/60 shrink-0">
            <DialogTitle className="text-base">Create New Alert</DialogTitle>
          </DialogHeader>

          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Asset Type — segmented chips */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Asset Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {([
                  { value: "stock", label: "Stocks" },
                  { value: "fund", label: "Unit Trusts" },
                  { value: "currency", label: "FX Rates" },
                  { value: "commodity", label: "Commodities" },
                ] as const).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAssetType(t.value)}
                    className={cn(
                      "h-9 rounded-lg text-xs font-medium border transition-colors",
                      assetType === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset search + select */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Select {assetType === "fund" ? "Unit Trust" : assetType === "currency" ? "Currency" : assetType === "commodity" ? "Commodity" : "Stock"}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-8 h-9 text-[16px] sm:text-sm"
                  disabled={loadingAssets}
                />
              </div>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId} disabled={loadingAssets}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={loadingAssets ? "Loading..." : `Choose (${filteredAssets.length})`} />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {filteredAssets.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-muted-foreground text-center">No matches</div>
                  ) : (
                    filteredAssets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Current value display */}
            {selectedAsset && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Current {assetType === "fund" ? "yield" : "price"}</p>
                  <p className="text-base font-semibold text-accent">
                    {selectedAsset.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} {selectedAsset.unit}
                  </p>
                </div>
                {targetPrice && !isNaN(parseFloat(targetPrice)) && (
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Δ</p>
                    <p className={cn("text-sm font-semibold",
                      parseFloat(targetPrice) > selectedAsset.currentValue ? "text-accent" : "text-destructive"
                    )}>
                      {parseFloat(targetPrice) > selectedAsset.currentValue ? "+" : ""}
                      {((parseFloat(targetPrice) - selectedAsset.currentValue) / selectedAsset.currentValue * 100).toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Condition — toggle */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Notify when {assetType === "fund" ? "yield" : "price"} goes
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setCondition("above")}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                    condition === "above"
                      ? "bg-accent/15 text-accent border-accent/40"
                      : "bg-card text-muted-foreground border-border"
                  )}
                >
                  <TrendingUp className="h-4 w-4" /> Above
                </button>
                <button
                  onClick={() => setCondition("below")}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                    condition === "below"
                      ? "bg-destructive/15 text-destructive border-destructive/40"
                      : "bg-card text-muted-foreground border-border"
                  )}
                >
                  <TrendingDown className="h-4 w-4" /> Below
                </button>
              </div>
            </div>

            {/* Target */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Target {assetType === "fund" ? "Yield (%)" : "Price"}
              </label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder={selectedAsset ? `e.g. ${selectedAsset.currentValue.toFixed(2)}` : "Enter target"}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="h-12 text-[16px] sm:text-base font-semibold"
              />
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border/60 bg-background/95 shrink-0">
            <Button
              onClick={handleCreate}
              disabled={saving || !selectedAssetId || !targetPrice}
              className="w-full h-11 rounded-full"
            >
              {saving ? "Creating…" : "Create Alert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

/* ─── Alert card ─── */
const AlertCard = ({
  alert, onToggle, onDelete,
}: {
  alert: any;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) => {
  const isTriggered = alert.is_triggered;
  const isPaused = !alert.is_active && !isTriggered;
  const isFund = alert.asset_type === "fund";
  const suffix = isFund ? "%" : "";

  return (
    <div className={cn(
      "rounded-xl border bg-card p-3.5 transition-all",
      isTriggered && "border-accent/40 bg-accent/5",
      isPaused && "opacity-70",
      !isTriggered && !isPaused && "border-border"
    )}>
      <div className="flex items-start gap-3">
        {/* Direction icon */}
        <div className={cn(
          "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
          alert.condition === "above" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
        )}>
          {alert.condition === "above"
            ? <TrendingUp className="h-4.5 w-4.5" />
            : <TrendingDown className="h-4.5 w-4.5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate max-w-[180px] sm:max-w-none">
              {alert.asset_name}
            </span>
            <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0 h-4">
              {isFund ? "Unit Trust" : alert.asset_type}
            </Badge>
            {isTriggered && (
              <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 h-4 gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" /> Hit
              </Badge>
            )}
            {isPaused && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                <BellOff className="h-2.5 w-2.5" /> Paused
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {alert.condition === "above" ? "Above" : "Below"}{" "}
            <span className="font-semibold text-foreground">
              {alert.target_price.toLocaleString()}{suffix}
            </span>
          </p>

          {isTriggered && alert.triggered_price != null && (
            <p className="text-[11px] text-accent mt-1 inline-flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Hit at {alert.triggered_price.toLocaleString()}{suffix}
              {alert.triggered_at && ` · ${formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}`}
            </p>
          )}

          {!isTriggered && (
            <p className="text-[11px] text-muted-foreground/80 mt-1 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!isTriggered && (
            <Switch
              checked={alert.is_active}
              onCheckedChange={() => onToggle(alert.id, alert.is_active)}
              aria-label={alert.is_active ? "Pause alert" : "Resume alert"}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(alert.id)}
            aria-label="Delete alert"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Empty state ─── */
const EmptyState = ({
  icon: Icon, title, description, onCta, ctaLabel,
}: {
  icon: any; title: string; description: string; onCta?: () => void; ctaLabel?: string;
}) => (
  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-card/40">
    <Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
    <h3 className="font-medium text-sm text-foreground mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground mb-4">{description}</p>
    {onCta && ctaLabel && (
      <Button size="sm" onClick={onCta} className="rounded-full gap-1.5">
        <Plus className="h-3.5 w-3.5" /> {ctaLabel}
      </Button>
    )}
  </div>
);

/* ─── Setting row ─── */
const SettingRow = ({
  title, description, checked, onChange, disabled,
}: {
  title: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 py-3 border-t border-border/60 first:border-t-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

export default AlertsPage;
