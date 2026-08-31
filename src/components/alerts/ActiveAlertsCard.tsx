import { usePriceAlerts, type PriceAlert } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ActiveAlertsCardProps {
  assetType: "stock" | "currency" | "commodity";
}

const ActiveAlertsCard = ({ assetType }: ActiveAlertsCardProps) => {
  const { user } = useAuth();
  const { alerts, loading } = usePriceAlerts();

  if (!user || loading) return null;

  const activeAlerts = alerts.filter(
    (a) => a.asset_type === assetType && a.is_active && !a.is_triggered
  );
  const triggeredAlerts = alerts.filter(
    (a) => a.asset_type === assetType && a.is_triggered
  );

  const relevantAlerts = [...triggeredAlerts, ...activeAlerts];
  if (relevantAlerts.length === 0) return null;

  const typeLabel =
    assetType === "stock" ? "Stock" : assetType === "currency" ? "Currency" : "Commodity";

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Your {typeLabel} Alerts
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {relevantAlerts.length}
            </Badge>
          </div>
          <Link
            to="/alerts"
            className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {relevantAlerts.slice(0, 6).map((alert) => (
            <AlertChip key={alert.id} alert={alert} />
          ))}
          {relevantAlerts.length > 6 && (
            <span className="text-xs text-muted-foreground self-center">
              +{relevantAlerts.length - 6} more
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const AlertChip = ({ alert }: { alert: PriceAlert }) => {
  const isTriggered = alert.is_triggered;
  const isAbove = alert.condition === "above";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
        isTriggered
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-card text-foreground"
      }`}
    >
      {isAbove ? (
        <TrendingUp className="h-3 w-3 text-accent shrink-0" />
      ) : (
        <TrendingDown className="h-3 w-3 text-destructive shrink-0" />
      )}
      <span className="font-medium truncate max-w-[120px]">{alert.asset_name}</span>
      <span className="text-muted-foreground">
        {isAbove ? ">" : "<"} {alert.price_unit} {alert.target_price.toLocaleString()}
      </span>
      {isTriggered && (
        <Badge className="bg-accent/20 text-accent text-[9px] px-1 py-0 leading-tight">
          Hit
        </Badge>
      )}
    </div>
  );
};

export default ActiveAlertsCard;
