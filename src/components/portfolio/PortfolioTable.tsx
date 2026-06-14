import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

const TYPE_DOT: Record<AssetType, string> = {
  mmf: "bg-accent",
  stock: "bg-primary",
  fx: "bg-blue-500",
  fixed_income: "bg-amber-500",
  commodity: "bg-rose-500",
};

const TYPE_LABELS: Record<AssetType, string> = {
  mmf: "Unit Trust",
  stock: "Stock",
  fx: "FX",
  fixed_income: "Fixed Income",
  commodity: "Commodity",
};

export const liquidityBucketLabel = (days: number | null | undefined): string => {
  if (days == null) return "—";
  if (days <= 0) return "T+0";
  if (days <= 3) return "1–3 d";
  return "4+ d";
};

const RecentChange = ({ row, currency }: { row: ChangeRow | undefined; currency: "KES" | "USD" }) => {
  if (!row || row.delta == null) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const v = row.delta;
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  const tone = v > 0 ? "text-accent" : v < 0 ? "text-destructive" : "text-muted-foreground";
  const sign = v > 0 ? "+" : "";
  const display = row.unit === "%"
    ? `${sign}${v.toFixed(2)}%`
    : `${sign}${fmt(v, currency)}`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums whitespace-nowrap ${tone}`}>
      <Icon className="h-3 w-3" />
      {display}
    </span>
  );
};

const AlertCell = ({
  state,
  onClick,
}: {
  state: "none" | "active" | "triggered";
  onClick?: () => void;
}) => {
  const common = "inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors";
  if (state === "triggered") {
    return (
      <span
        title="Alert triggered"
        className={`${common} text-destructive bg-destructive/10 border-destructive/30`}
      >
        <BellRing className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        title="Alert active"
        className={`${common} text-primary bg-primary/10 border-primary/30`}
      >
        <Bell className="h-3.5 w-3.5" />
      </span>
    );
  }
  return onClick ? (
    <button
      onClick={onClick}
      title="Create an alert for this holding"
      className={`${common} text-muted-foreground border-border/60 hover:text-foreground hover:border-border`}
    >
      <Bell className="h-3.5 w-3.5" />
    </button>
  ) : (
    <span
      title="No alert"
      className={`${common} text-muted-foreground/60 border-border/40`}
    >
      <Bell className="h-3.5 w-3.5" />
    </span>
  );
};

const PortfolioTable = ({
  items, currency, onDelete, onEdit,
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

  // ============== MOBILE CARD LIST ==============
  const MobileList = (
    <ul className="md:hidden divide-y divide-border/60 -mx-3">
      {items.map((item) => {
        const pnl = getPnL(item);
        const pnlPct = getPnLPercent(item);
        const isUp = pnl >= 0;
        const recent = changeFor(item.id);
        const alertState = getHoldingAlertState(
          { asset_type: item.asset_type, asset_id: item.asset_id, asset_name: item.asset_name, ticker: item.ticker },
          alerts,
        );

        return (
          <li key={item.id} className="px-3 py-3">
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_DOT[item.asset_type]}`}
                title={TYPE_LABELS[item.asset_type]}
              />
              <div className="min-w-0 flex-1">
                {/* Row 1: name + value */}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {item.asset_name}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                    {fmt(getCurrentValue(item), currency)}
                  </span>
                </div>
                {/* Row 2: type/ticker + P&L */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {TYPE_LABELS[item.asset_type]}
                    {item.ticker && (
                      <span className="ml-1.5 font-mono normal-case text-muted-foreground/80">
                        {item.ticker}
                      </span>
                    )}
                  </span>
                  <span className={`text-[11px] tabular-nums font-medium whitespace-nowrap ${isUp ? "text-accent" : "text-destructive"}`}>
                    {isUp ? "+" : ""}{fmt(pnl, currency)}
                    <span className="ml-1 text-muted-foreground/80 font-normal">
                      ({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)
                    </span>
                  </span>
                </div>
                {/* Row 3: recent change + actions */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <RecentChange row={recent} currency={currency} />
                    <span className="text-[10px] text-muted-foreground/70 truncate">
                      {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <AlertCell
                      state={alertState}
                      onClick={onOpenAlert ? () => onOpenAlert(item) : undefined}
                    />
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => onEdit(item)}
                        title="Edit holding"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(item.id)}
                      title="Remove holding"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {MobileList}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="w-[38%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Asset</TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Value / P&amp;L</TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Recent</TableHead>
            <TableHead className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-16">Alert</TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap w-28">Updated</TableHead>
            <TableHead className="w-20" />
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

            // Inline meta chips — neutral and compact
            const meta: string[] = [];
            if (item.asset_type === "mmf") {
              meta.push(`Yield ${item.current_yield?.toFixed(2) ?? "—"}%`);
              meta.push(`Liq ${liquidityBucketLabel(liquidityDays)}`);
              if (monthlyIncome != null && monthlyIncome > 0) {
                meta.push(`Est/mo ${fmt(monthlyIncome, currency)}`);
              }
            } else if (item.asset_type === "stock") {
              meta.push(`${item.units.toLocaleString()} units`);
              meta.push(`@ ${fmt(item.current_price, currency)}`);
            } else {
              meta.push(`${item.units.toLocaleString()} units`);
            }

            return (
              <TableRow key={item.id} className="border-border/60 hover:bg-muted/30 align-middle">
                {/* Asset */}
                <TableCell className="py-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_DOT[item.asset_type]}`}
                      title={TYPE_LABELS[item.asset_type]}
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {item.asset_name}
                        </span>
                        {item.ticker && (
                          <span className="text-[10px] text-muted-foreground font-mono uppercase truncate">
                            {item.ticker}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                        <span className="uppercase tracking-wider text-[10px] mr-2">
                          {TYPE_LABELS[item.asset_type]}
                        </span>
                        {meta.map((m, idx) => (
                          <span key={idx} className="tabular-nums">
                            {idx > 0 && <span className="mx-1.5 text-muted-foreground/40">·</span>}
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Value / P&L stacked */}
                <TableCell className="text-right py-3 whitespace-nowrap">
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {fmt(getCurrentValue(item), currency)}
                  </div>
                  <div className={`text-[11px] tabular-nums font-medium mt-0.5 ${isUp ? "text-accent" : "text-destructive"}`}>
                    {isUp ? "+" : ""}{fmt(pnl, currency)}
                    <span className="ml-1 text-muted-foreground/80 font-normal">
                      ({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)
                    </span>
                  </div>
                </TableCell>

                {/* Recent change */}
                <TableCell className="text-right py-3">
                  <RecentChange row={recent} currency={currency} />
                </TableCell>

                {/* Alert — icon only */}
                <TableCell className="text-center py-3">
                  <AlertCell
                    state={alertState}
                    onClick={onOpenAlert ? () => onOpenAlert(item) : undefined}
                  />
                </TableCell>

                {/* Updated */}
                <TableCell className="text-right py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => onEdit(item)}
                        title="Edit holding"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(item.id)}
                      title="Remove holding"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>
    </>
  );
};

export default PortfolioTable;
