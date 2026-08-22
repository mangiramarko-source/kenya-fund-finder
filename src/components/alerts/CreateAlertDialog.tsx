import { useState } from "react";
import { Bell, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { usePriceAlerts, type AlertCondition, type AlertAssetType } from "@/hooks/usePriceAlerts";
import { canCreateAlert, limitMessages } from "@/lib/featureLimits";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface Props {
  assetType: Exclude<AlertAssetType, "new_fund">;
  assetId: string;
  assetName: string;
  currentPrice: number;
  unit?: string;
  trigger?: React.ReactNode;
  /** Controlled open state (omit to use uncontrolled mode with trigger). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Neutral alert creation dialog.
 * - Funds: "change_up | change_down | change_any" with a % threshold.
 * - Stocks/FX/commodities: "above | below" with a price threshold.
 */
export const CreateAlertDialog = ({
  assetType, assetId, assetName, currentPrice, unit = "", trigger,
  open: openProp, onOpenChange,
}: Props) => {
  const { user } = useAuth();
  const { createAlert, alerts } = usePriceAlerts();
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : openState;
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenState(v);
    onOpenChange?.(v);
  };

  const isFund = assetType === "fund";
  const [condition, setCondition] = useState<AlertCondition>(isFund ? "change_any" : "above");
  const [threshold, setThreshold] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInapp, setNotifyInapp] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Link to="/auth?redirect=/watchlist">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Bell className="h-3 w-3" /> Create alert
        </Button>
      </Link>
    );
  }

  const activeCount = alerts.filter((a) => a.is_active && !a.is_triggered).length;

  const handleCreate = async () => {
    if (!canCreateAlert(activeCount)) {
      toast.error(limitMessages.alertsAtMax);
      return;
    }
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) {
      toast.error(isFund ? "Enter a valid % change" : "Enter a valid target price");
      return;
    }
    setSaving(true);
    const result = await createAlert({
      asset_type: assetType,
      asset_id: assetId,
      asset_name: assetName,
      target_price: val,
      condition,
      baseline_price: isFund ? currentPrice : null,
      notify_email: notifyEmail,
      notify_inapp: notifyInapp,
    });
    setSaving(false);
    if (result?.error) {
      toast.error("Failed to create alert");
    } else {
      trackEvent("price_alert_created", {
        asset_type: assetType,
        asset_identifier: assetName,
        asset_id: assetId,
        condition,
      });
      toast.success(`Alert created for ${assetName}`);
      setOpen(false);
      setThreshold("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Bell className="h-3 w-3" /> Create alert
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isFund ? "Notify me when yield changes" : "Notify me when price goes"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground">{isFund ? "Unit Trust" : "Asset"}</p>
            <p className="font-semibold text-foreground text-sm">{assetName}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Current {isFund ? "yield" : "price"}:{" "}
              <span className="font-semibold text-accent tabular-nums">
                {currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} {unit}
              </span>
            </p>
          </div>

          {/* Condition selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Condition
            </label>
            {isFund ? (
              <div className="grid grid-cols-3 gap-1.5">
                <ConditionChip
                  active={condition === "change_up"}
                  onClick={() => setCondition("change_up")}
                  icon={TrendingUp}
                  label="Yield up by"
                  tone="accent"
                />
                <ConditionChip
                  active={condition === "change_down"}
                  onClick={() => setCondition("change_down")}
                  icon={TrendingDown}
                  label="Yield down by"
                  tone="destructive"
                />
                <ConditionChip
                  active={condition === "change_any"}
                  onClick={() => setCondition("change_any")}
                  icon={ArrowUpDown}
                  label="Either way by"
                  tone="primary"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <ConditionChip
                  active={condition === "above"}
                  onClick={() => setCondition("above")}
                  icon={TrendingUp}
                  label="Above"
                  tone="accent"
                />
                <ConditionChip
                  active={condition === "below"}
                  onClick={() => setCondition("below")}
                  icon={TrendingDown}
                  label="Below"
                  tone="destructive"
                />
              </div>
            )}
          </div>

          {/* Threshold input */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {isFund ? "Change threshold (%)" : `Target price${unit ? ` (${unit})` : ""}`}
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder={isFund ? "e.g. 0.5" : `e.g. ${currentPrice.toFixed(2)}`}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="text-[16px] sm:text-sm"
            />
          </div>

          {/* Notification channels */}
          <div className="space-y-2">
            <ChannelRow
              label="In-app notification"
              checked={notifyInapp}
              onChange={setNotifyInapp}
            />
            <ChannelRow
              label="Email notification"
              checked={notifyEmail}
              onChange={setNotifyEmail}
            />
          </div>

          {!canCreateAlert(activeCount) && (
            <p className="text-[11px] text-destructive">{limitMessages.alertsAtMax}</p>
          )}

          <Button onClick={handleCreate} disabled={saving || !canCreateAlert(activeCount)} className="w-full">
            {saving ? "Creating…" : "Create alert"}
          </Button>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Data update notifications only. Not personal financial advice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ConditionChip = ({
  active, onClick, icon: Icon, label, tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  tone: "accent" | "destructive" | "primary";
}) => (
  <button
    onClick={onClick}
    className={cn(
      "h-11 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1 transition-colors px-1",
      active
        ? tone === "accent"
          ? "bg-accent/15 text-accent border-accent/40"
          : tone === "destructive"
            ? "bg-destructive/15 text-destructive border-destructive/40"
            : "bg-primary/15 text-primary border-primary/40"
        : "bg-card text-muted-foreground border-border"
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    <span className="leading-tight">{label}</span>
  </button>
);

const ChannelRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
    <span className="text-xs font-medium text-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default CreateAlertDialog;
