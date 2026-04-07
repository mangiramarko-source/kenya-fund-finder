import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, Clock, CheckCircle, Plus, Mail, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AssetOption {
  id: string;
  name: string;
  currentValue: number;
  unit?: string;
}

const AlertsPage = () => {
  useDocumentTitle("Price Alerts | Kenya Fund Finder");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alerts, loading, deleteAlert, toggleAlert, createAlert } = usePriceAlerts();
  const { prefs, loading: prefsLoading, updatePref } = useEmailPreferences();

  // New Alert dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [assetType, setAssetType] = useState<"stock" | "currency" | "commodity" | "fund">("stock");
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving, setSaving] = useState(false);

  // Fetch assets when type changes
  useEffect(() => {
    if (!showCreate) return;
    setLoadingAssets(true);
    setSelectedAssetId("");
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

  const AlertCard = ({ alert }: { alert: typeof alerts[0] }) => {
    const isTriggered = alert.is_triggered;
    const isPaused = !alert.is_active && !isTriggered;

    return (
      <Card className={`transition-all ${isTriggered ? "border-accent/50 bg-accent/5" : isPaused ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-foreground truncate">{alert.asset_name}</span>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {alert.asset_type === "fund" ? "Unit Trust" : alert.asset_type}
                </Badge>
                {isTriggered && (
                  <Badge className="bg-accent text-accent-foreground text-xs shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" /> Triggered
                  </Badge>
                )}
                {isPaused && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <BellOff className="h-3 w-3 mr-1" /> Paused
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                {alert.condition === "above" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span>
                  When {alert.asset_type === "fund" ? "yield" : "price"} goes <strong className="text-foreground">{alert.condition}</strong>{" "}
                  <strong className="text-foreground">{alert.target_price.toLocaleString()}{alert.asset_type === "fund" ? "%" : ""}</strong>
                </span>
              </div>

              {isTriggered && alert.triggered_price != null && (
                <p className="text-sm text-accent">
                  Triggered at {alert.triggered_price.toLocaleString()}{alert.asset_type === "fund" ? "%" : ""}
                  {alert.triggered_at && ` on ${format(new Date(alert.triggered_at), "MMM d, yyyy h:mm a")}`}
                </p>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                Created {format(new Date(alert.created_at), "MMM d, yyyy")}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isTriggered && (
                <Switch
                  checked={alert.is_active}
                  onCheckedChange={() => handleToggle(alert.id, alert.is_active)}
                  aria-label={alert.is_active ? "Pause alert" : "Resume alert"}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(alert.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Price Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Alert
        </Button>
      </div>

      {/* Create Alert Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Create New Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Asset Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Asset Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: "stock", label: "Stocks" },
                  { value: "fund", label: "Unit Trusts" },
                  { value: "currency", label: "FX Rates" },
                  { value: "commodity", label: "Commodities" },
                ] as const).map((t) => (
                  <Button
                    key={t.value}
                    variant={assetType === t.value ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setAssetType(t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Asset Selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Select {assetType === "fund" ? "Unit Trust" : assetType === "currency" ? "Currency" : assetType === "commodity" ? "Commodity" : "Stock"}
              </label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId} disabled={loadingAssets}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingAssets ? "Loading..." : "Choose an asset"} />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {assetOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current value display */}
            {selectedAsset && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Current {assetType === "fund" ? "yield" : "price"}
                </p>
                <p className="font-semibold text-accent">
                  {selectedAsset.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} {selectedAsset.unit}
                </p>
              </div>
            )}

            {/* Condition */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Notify me when {assetType === "fund" ? "yield" : "price"} goes
              </label>
              <Select value={condition} onValueChange={(v) => setCondition(v as "above" | "below")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-accent" /> Above target
                    </span>
                  </SelectItem>
                  <SelectItem value="below">
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" /> Below target
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Target {assetType === "fund" ? "Yield (%)" : "Price"}
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder={selectedAsset ? `e.g. ${selectedAsset.currentValue.toFixed(2)}` : "Enter target"}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="text-[16px] sm:text-sm"
              />
            </div>

            <Button onClick={handleCreate} disabled={saving || !selectedAssetId} className="w-full">
              {saving ? "Creating…" : "Create Alert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No alerts yet</h2>
            <p className="text-muted-foreground mb-6">
              Set alerts on stocks, unit trusts, currencies, or commodities to get notified when they hit your target.
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create Your First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
            <TabsTrigger value="triggered">Triggered ({triggeredAlerts.length})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({pausedAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeAlerts.length > 0 ? (
              activeAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            ) : (
              <EmptyState icon={Bell} title="No active alerts" description="Create a new alert using the button above" />
            )}
          </TabsContent>

          <TabsContent value="triggered" className="space-y-3">
            {triggeredAlerts.length > 0 ? (
              triggeredAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            ) : (
              <EmptyState icon={CheckCircle} title="No triggered alerts" description="Alerts appear here once triggered" />
            )}
          </TabsContent>

          <TabsContent value="paused" className="space-y-3">
            {pausedAlerts.length > 0 ? (
              pausedAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            ) : (
              <EmptyState icon={BellOff} title="No paused alerts" description="Pause alerts to temporarily stop monitoring" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
};

export default AlertsPage;
