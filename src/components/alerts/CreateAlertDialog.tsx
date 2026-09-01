import { useEffect, useState } from "react";
import { Bell, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { usePriceAlerts, type AlertCondition, type PriceAlert } from "@/hooks/usePriceAlerts";
import { canCreateAlert, limitMessages } from "@/lib/featureLimits";
import { cn } from "@/lib/utils";

interface Props {
  assetType: "stock" | "currency" | "commodity" | "fund";
  assetId: string;
  assetName: string;
  currentPrice: number;
  unit?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editAlert?: PriceAlert | null;
  onSaved?: () => void;
}

export const CreateAlertDialog = ({
  assetType,
  assetId,
  assetName,
  currentPrice,
  unit = "KES",
  trigger,
  open: openProp,
  onOpenChange,
  editAlert = null,
  onSaved,
}: Props) => {
  const { user } = useAuth();
  const { createAlert, updateAlert, alerts } = usePriceAlerts();
  const [openState, setOpenState] = useState(false);
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [threshold, setThreshold] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInapp, setNotifyInapp] = useState(true);
  const [saving, setSaving] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : openState;
  const setOpen = (value: boolean) => {
    if (!isControlled) setOpenState(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (!open) return;
    setCondition(editAlert?.condition ?? "above");
    setThreshold(editAlert ? String(editAlert.target_price) : "");
    setNotifyEmail(editAlert?.notify_email ?? true);
    setNotifyInapp(editAlert?.notify_inapp ?? true);
  }, [editAlert, open]);

  if (!user) {
    return (
      <Link to="/auth?redirect=/watchlist">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Bell className="h-3 w-3" /> Create alert
        </Button>
      </Link>
    );
  }

  const activeCount = alerts.filter((alert) => alert.is_active && !alert.is_triggered).length;
  const handleCreate = async () => {
    if ((!editAlert || editAlert.is_triggered) && !canCreateAlert(activeCount)) {
      toast.error(limitMessages.alertsAtMax);
      return;
    }
    const target = Number(threshold);
    if (!Number.isFinite(target) || target <= 0) {
      toast.error("Enter a valid target value");
      return;
    }
    setSaving(true);
    const result = editAlert
      ? await updateAlert(editAlert.id, {
          target_price: target,
          condition,
          notify_email: notifyEmail,
          notify_inapp: notifyInapp,
        })
      : await createAlert({
          asset_type: assetType,
          asset_id: assetId,
          asset_name: assetName,
          asset_unit: unit,
          target_price: target,
          condition,
          notify_email: notifyEmail,
          notify_inapp: notifyInapp,
        });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message || "Failed to create alert");
      return;
    }
    toast.success(editAlert?.is_triggered ? "Alert re-armed" : editAlert ? "Alert updated" : `Alert created for ${assetName}`);
    setThreshold("");
    setOpen(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Bell className="h-3 w-3" /> Create alert</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle className="text-base">{editAlert ? "Edit market alert" : "Create market alert"}</DialogTitle></DialogHeader>
        <div className="mt-1 space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground capitalize">{assetType}</p>
            <p className="text-sm font-semibold text-foreground">{assetName}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Current value: <span className="font-semibold text-accent tabular-nums">{currentPrice.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{unit === "%" ? "%" : ` ${unit}`}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <ConditionButton active={condition === "above"} onClick={() => setCondition("above")} label="Above" icon={TrendingUp} tone="accent" />
            <ConditionButton active={condition === "below"} onClick={() => setCondition("below")} label="Below" icon={TrendingDown} tone="destructive" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Target {unit === "%" ? "yield" : "value"} ({unit})</label>
            <Input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder={`e.g. ${currentPrice.toFixed(2)}`} value={threshold} onChange={(event) => setThreshold(event.target.value)} className="text-[16px] sm:text-sm" />
          </div>
          <ChannelRow label="In-app notification" checked={notifyInapp} onChange={setNotifyInapp} />
          <ChannelRow label="Email notification" checked={notifyEmail} onChange={setNotifyEmail} />
          <Button onClick={handleCreate} disabled={saving || (!editAlert || editAlert.is_triggered) && !canCreateAlert(activeCount)} className="w-full">{saving ? "Saving…" : editAlert?.is_triggered ? "Save & re-arm" : editAlert ? "Save changes" : "Create alert"}</Button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">Data update notifications only. Not personal financial advice.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function ConditionButton({ active, onClick, label, icon: Icon, tone }: { active: boolean; onClick: () => void; label: string; icon: typeof TrendingUp; tone: "accent" | "destructive" }) {
  return <button type="button" onClick={onClick} className={cn("inline-flex h-11 items-center justify-center gap-1 rounded-lg border text-xs font-medium", active ? tone === "accent" ? "border-accent/40 bg-accent/15 text-accent" : "border-destructive/40 bg-destructive/15 text-destructive" : "border-border bg-card text-muted-foreground")}><Icon className="h-3.5 w-3.5" />{label}</button>;
}

function ChannelRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"><span className="text-xs font-medium text-foreground">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

export default CreateAlertDialog;
