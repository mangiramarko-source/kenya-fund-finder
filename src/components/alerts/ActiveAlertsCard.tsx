import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, TrendingUp, TrendingDown, ChevronRight, Check } from "lucide-react";
import { usePriceAlerts, type PriceAlert } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useMarketData } from "@/components/home/MarketTicker";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import CreateAlertDialog from "@/components/alerts/CreateAlertDialog";
import { Badge } from "@/components/ui/badge";
import {
  resolveAlertAsset,
  isAlertTriggered,
  calculateAlertProgress,
  calculateAlertDistance,
  type ParsedAlertDetails,
} from "@/lib/priceAlertEvaluation";

interface ActiveAlertsCardProps {
  assetType: "stock" | "currency" | "commodity";
}

const AlertMiniCard = ({
  alert,
  parsed,
  onEdit,
}: {
  alert: PriceAlert;
  parsed: ParsedAlertDetails;
  onEdit: () => void;
}) => {
  const currentPrice = parsed.currentPrice;
  const isAbove = alert.condition === "above";

  // Dynamic real-time calculation strictly guarded against currentPrice <= 0
  const isHit = isAlertTriggered(alert, currentPrice);
  const progress = calculateAlertProgress(alert, currentPrice, isHit);
  const { deltaPrice } = calculateAlertDistance(alert, currentPrice, isHit);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={`relative overflow-hidden flex items-center justify-between gap-3 min-w-[215px] max-w-[250px] shrink-0 rounded-2xl border px-3 pt-2 pb-2.5 shadow-xs cursor-pointer transition-all active:scale-[0.98] group ${
        isHit
          ? "border-emerald-500/40 bg-emerald-500/[0.04] hover:border-emerald-500/70 hover:bg-emerald-500/[0.08]"
          : "border-border/80 bg-slate-50/80 dark:bg-card hover:border-emerald-500/40"
      }`}
    >
      {/* Left side: Avatar + Symbol & Target */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <WatchlistAssetAvatar
          type={alert.asset_type}
          symbol={parsed.symbol}
          name={parsed.name}
          logoUrl={parsed.logoUrl}
          currencyCode={parsed.currencyCode}
          size={28}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground block truncate group-hover:text-emerald-500 transition-colors">
              {parsed.symbol || parsed.name}
            </span>
            {isHit ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1 py-0 h-4 gap-0.5 leading-none">
                <Check className="h-2 w-2 stroke-[3]" /> Hit
              </Badge>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/80 px-1 py-0.2 rounded tabular-nums">
                {isAbove ? ">" : "<"} {alert.target_price.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {isHit
              ? `Target ${isAbove ? ">" : "<"} ${alert.target_price.toLocaleString()}`
              : currentPrice != null
              ? `Now ${alert.asset_unit} ${currentPrice.toLocaleString()}`
              : parsed.name}
          </p>
        </div>
      </div>

      {/* Right side: Price / Status / Progress % */}
      <div className="text-right shrink-0">
        {isHit ? (
          <>
            <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {currentPrice != null ? currentPrice.toLocaleString() : "Hit"}
            </p>
            <span className="text-[10px] font-semibold text-muted-foreground block mt-0.5">
              Re-arm ›
            </span>
          </>
        ) : (
          <>
            <p className="text-xs font-bold tabular-nums text-foreground">
              {progress}%
            </p>
            <span className="text-[10px] font-medium text-muted-foreground tabular-nums block mt-0.5">
              {deltaPrice != null ? `${deltaPrice < 1 ? deltaPrice.toFixed(2) : deltaPrice.toFixed(1)} away` : "Active"}
            </span>
          </>
        )}
      </div>

      {/* Flush 2px Progress Bar at bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-muted/60">
        <div
          className={`h-full transition-all duration-300 ${
            isHit ? "bg-emerald-500" : "bg-emerald-500/80 dark:bg-emerald-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const ActiveAlertsCard = ({ assetType }: ActiveAlertsCardProps) => {
  const { user } = useAuth();
  const { alerts, loading: alertsLoading } = usePriceAlerts();
  const { stocks, rates, commodities, loading: marketLoading } = useMarketData();
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  if (!user || alertsLoading) return null;

  const relevantAlerts = alerts.filter(
    (a) => a.asset_type === assetType && (a.is_active || a.is_triggered)
  );
  if (relevantAlerts.length === 0) return null;

  const typeLabel =
    assetType === "stock" ? "Stock" : assetType === "currency" ? "Currency" : "Commodity";

  return (
    <>
      <div className="mb-4">
        {/* Header matching Watchlist Card (StockFavourites.tsx) */}
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold text-foreground">
              Your {typeLabel} Alerts
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            >
              {relevantAlerts.length}
            </Badge>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
          >
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Horizontal Scroll Strip */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-1 px-1 touch-pan-x">
          {relevantAlerts.map((alert) => {
            const parsed = resolveAlertAsset(alert, stocks, rates, commodities);
            return (
              <AlertMiniCard
                key={alert.id}
                alert={alert}
                parsed={parsed}
                onEdit={() => setEditingAlert(alert)}
              />
            );
          })}
        </div>
      </div>

      {/* Edit modal when an alert card is clicked */}
      {editingAlert && (
        <CreateAlertDialog
          open
          editAlert={editingAlert}
          onOpenChange={(open) => {
            if (!open) setEditingAlert(null);
          }}
          assetType={editingAlert.asset_type}
          assetId={editingAlert.asset_id}
          assetName={editingAlert.asset_name}
          currentPrice={
            resolveAlertAsset(editingAlert, stocks, rates, commodities).currentPrice ||
            editingAlert.target_price
          }
          unit={editingAlert.asset_unit}
        />
      )}
    </>
  );
};

export default ActiveAlertsCard;
