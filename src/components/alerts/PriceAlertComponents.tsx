import { useState } from "react";
import { Bell, TrendingUp, TrendingDown, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface CreateAlertDialogProps {
  assetType: "stock" | "currency" | "commodity" | "fund";
  assetId: string;
  assetName: string;
  currentPrice: number;
  unit?: string;
}

export const CreateAlertDialog = ({
  assetType, assetId, assetName, currentPrice, unit = "",
}: CreateAlertDialogProps) => {
  const { user } = useAuth();
  const { createAlert } = usePriceAlerts();
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Bell className="h-3 w-3" /> Set Alert
        </Button>
      </Link>
    );
  }

  const handleCreate = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }
    setSaving(true);
    const result = await createAlert({
      asset_type: assetType,
      asset_id: assetId,
      asset_name: assetName,
      asset_unit: unit,
      target_price: price,
      condition,
    });
    setSaving(false);
    if (result?.error) {
      toast.error("Failed to create alert");
    } else {
      toast.success(`Alert set for ${assetName} ${condition} ${price}`);
      setOpen(false);
      setTargetPrice("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Bell className="h-3 w-3" /> Set Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Set Price Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Stock</p>
            <p className="font-semibold text-foreground">{assetName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current price: <span className="font-semibold text-accent">{currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} {unit}</span>
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notify me when price goes</label>
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

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Price {unit && `(${unit})`}</label>
            <Input
              type="number"
              step="0.01"
              placeholder={`e.g. ${currentPrice.toFixed(2)}`}
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="text-[16px] sm:text-sm"
            />
          </div>

          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create Alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Alerts Management Panel ─── */
export const AlertsPanel = () => {
  const { alerts, loading, deleteAlert, toggleAlert } = usePriceAlerts();
  const activeAlerts = alerts.filter((a) => !a.is_triggered);
  const triggeredAlerts = alerts.filter((a) => a.is_triggered);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card text-center py-10">
        <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No price alerts set</p>
        <p className="text-xs text-muted-foreground mt-1">
          Visit the Stocks page to set an above or below price alert
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeAlerts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Alerts ({activeAlerts.length})</h3>
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onDelete={deleteAlert} onToggle={toggleAlert} />
            ))}
          </div>
        </div>
      )}
      {triggeredAlerts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Triggered ({triggeredAlerts.length})</h3>
          <div className="space-y-2">
            {triggeredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onDelete={deleteAlert} onToggle={toggleAlert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AlertCard = ({
  alert, onDelete, onToggle,
}: {
  alert: any;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) => (
  <div className={`rounded-lg border bg-card p-3 flex items-center justify-between gap-3 ${
    alert.is_triggered ? "border-accent/30 bg-accent/5" : "border-border"
  }`}>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm text-foreground truncate">{alert.asset_name}</span>
        {alert.is_triggered && (
          <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">Triggered</span>
        )}
        {!alert.is_active && !alert.is_triggered && (
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">Paused</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {alert.condition === "above" ? "↑" : "↓"} {alert.condition} {alert.target_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        <span className="mx-1.5">·</span>
        <span className="capitalize">{alert.asset_type}</span>
      </p>
      {alert.is_triggered && alert.triggered_price && (
        <p className="text-[10px] text-accent mt-0.5">
          Triggered at {alert.triggered_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          {alert.triggered_at && ` on ${new Date(alert.triggered_at).toLocaleDateString("en-KE")}`}
        </p>
      )}
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {!alert.is_triggered && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onToggle(alert.id, !alert.is_active)}
        >
          <Bell className={`h-3.5 w-3.5 ${alert.is_active ? "text-accent" : "text-muted-foreground"}`} />
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(alert.id)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);
