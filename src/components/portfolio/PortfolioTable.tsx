import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Bell, BellRing, TrendingUp, TrendingDown, Minus, Pencil } from "lucide-react";
import {
  PortfolioItem, AssetType,
  getCurrentValue, getCostBasis, getPnL, getPnLPercent,
} from "@/hooks/usePortfolio";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";
import { getHoldingAlertState, type MinimalAlert } from "@/lib/portfolioAlertBadge";
import { normalizeName } from "@/lib/assetMatch";
import { formatDistanceToNow } from "date-fns";

interface Props {
  items: PortfolioItem[];
  currency: "KES" | "USD";
  onDelete: (id: string) => void;
  onEdit?: (item: PortfolioItem) => void;
  changes?: ChangeRow[];
  alerts?: MinimalAlert[];
  liquidityByName?: Map<string, number | null>;
  liquidityById?: Map<string, number | null>;
  onOpenAlert?: (item: PortfolioItem) => void;
}

const fmt = (val: number, currency: "KES" | "USD") => {
  const v = currency === "USD" ? val / 130 : val;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const typeColor: Record<AssetType, string> = {
  mmf: "bg-accent/15 text-accent border-accent/30",
  stock: "bg-primary/15 text-primary border-primary/30",
  fx: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  fixed_income: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  commodity: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const TYPE_BADGE_LABELS: Record<AssetType, string> = {
  mmf: "Unit Trust",
  stock: "Stock",
  fx: "FX",
  fixed_income: "Fixed Income",
  commodity: "Commodity",
};

export const liquidityBucketLabel = (days: number | null | undefined): string => {
  if (days == null) return "Not available";
  if (days <= 0) return "Same day / T+0";
  if (days <= 3) return "1–3 days";
  return "4+ days";
};

const RecentChange = ({ row, currency }: { row: ChangeRow | undefined; currency: "KES" | "USD" }) => {
  if (!row || row.delta == null) {
    return <span className="text-[11px] text-muted-foreground">Not available yet</span>;
  }
  const v = row.delta;
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  const tone = v > 0 ? "text-accent" : v < 0 ? "text-destructive" : "text-muted-foreground";
  const sign = v > 0 ? "+" : "";
  const display = row.unit === "%"
    ? `${sign}${v.toFixed(2)}%`
    : `${sign}${fmt(v, currency)}`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${tone}`}>
      <Icon className="h-3 w-3" />
      {display}
    </span>
  );
};

const AlertBadge = ({
  state,
  onClick,
}: {
  state: "none" | "active" | "triggered";
  onClick?: () => void;
}) => {
  if (state === "none") {
    return onClick ? (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        title="Create an alert for this holding"
      >
        <Bell className="h-3 w-3" />
        No alert
      </button>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Bell className="h-3 w-3" />
        No alert
      </span>
    );
  }
  if (state === "triggered") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded">
        <BellRing className="h-3 w-3" />
        Triggered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
      <Bell className="h-3 w-3" />
      Active
    </span>
  );
};

const PortfolioTable = ({
  items, currency, onDelete,
  changes = [], alerts = [],
  liquidityByName, liquidityById,
  onOpenAlert,
}: Props) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Add holdings to view portfolio summary.
      </div>
    );
  }

  const changeFor = (itemId: string) => changes.find((c) => c.itemId === itemId);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Current value</TableHead>
          <TableHead className="text-right">Gain / Loss</TableHead>
          <TableHead className="text-right">Recent change</TableHead>
          <TableHead>Alert</TableHead>
          <TableHead className="text-right">Last updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const pnl = getPnL(item);
          const pnlPct = getPnLPercent(item);
          const isUp = pnl >= 0;
          const recent = changeFor(item.id);

          const liquidityDays =
            item.asset_type === "mmf"
              ? (item.asset_id ? liquidityById?.get(item.asset_id) : undefined) ??
                liquidityByName?.get(normalizeName(item.asset_name))
              : undefined;

          const monthlyIncome =
            item.asset_type === "mmf"
              ? (getCurrentValue(item) * (item.current_yield || 0) / 100 * 0.85) / 12
              : null;

          const alertState = getHoldingAlertState(
            { asset_type: item.asset_type, asset_id: item.asset_id, asset_name: item.asset_name, ticker: item.ticker },
            alerts,
          );

          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>{item.asset_name}</span>
                    {item.ticker && (
                      <span className="text-[11px] text-muted-foreground">{item.ticker}</span>
                    )}
                  </div>
                  {item.asset_type === "mmf" && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>Yield: {item.current_yield?.toFixed(2) ?? "—"}%</span>
                      <span>·</span>
                      <span>Liquidity: {liquidityBucketLabel(liquidityDays)}</span>
                      {monthlyIncome != null && monthlyIncome > 0 && (
                        <>
                          <span>·</span>
                          <span>Est. monthly: {fmt(monthlyIncome, currency)}</span>
                        </>
                      )}
                    </div>
                  )}
                  {item.asset_type === "stock" && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Price: {fmt(item.current_price, currency)} · {item.units.toLocaleString()} units
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${typeColor[item.asset_type]}`}>
                  {TYPE_BADGE_LABELS[item.asset_type]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {fmt(getCurrentValue(item), currency)}
              </TableCell>
              <TableCell className={`text-right tabular-nums font-medium ${isUp ? "text-accent" : "text-destructive"}`}>
                {isUp ? "+" : ""}{fmt(pnl, currency)}
                <span className="ml-1 text-[11px]">({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)</span>
              </TableCell>
              <TableCell className="text-right">
                <RecentChange row={recent} currency={currency} />
              </TableCell>
              <TableCell>
                <AlertBadge
                  state={alertState}
                  onClick={onOpenAlert ? () => onOpenAlert(item) : undefined}
                />
              </TableCell>
              <TableCell className="text-right text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default PortfolioTable;
