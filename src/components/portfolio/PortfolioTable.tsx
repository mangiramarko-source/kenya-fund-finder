import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import {
  PortfolioItem, AssetType,
  getCurrentValue, getCostBasis, getPnL, getPnLPercent,
  daysBetween, calcMMFValue,
} from "@/hooks/usePortfolio";

interface Props {
  items: PortfolioItem[];
  currency: "KES" | "USD";
  onDelete: (id: string) => void;
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

const PortfolioTable = ({ items, currency, onDelete }: Props) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No investments yet. Click "Add Investment" to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Buy Price</TableHead>
          <TableHead className="text-right">Current Value</TableHead>
          <TableHead className="text-right">Gain / Loss</TableHead>
          <TableHead className="text-right">Detail</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const pnl = getPnL(item);
          const pnlPct = getPnLPercent(item);
          const isUp = pnl >= 0;

          // MMF-specific detail
          let detail = "";
          if (item.asset_type === "mmf") {
            const days = daysBetween(item.buy_date);
            const principal = item.units * item.buy_price;
            const todayInterest = calcMMFValue(principal, item.current_yield || 15, days) -
              calcMMFValue(principal, item.current_yield || 15, Math.max(0, days - 1));
            detail = `Interest today: ${fmt(todayInterest, currency)}`;
          } else {
            const priceChange = item.current_price - item.buy_price;
            detail = `Price ${priceChange >= 0 ? "+" : ""}${fmt(priceChange, currency)}`;
          }

          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">
                <div>
                  {item.asset_name}
                  {item.ticker && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground">{item.ticker}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${typeColor[item.asset_type]}`}>
                  {TYPE_BADGE_LABELS[item.asset_type]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.units.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(item.buy_price, currency)}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{fmt(getCurrentValue(item), currency)}</TableCell>
              <TableCell className={`text-right tabular-nums font-medium ${isUp ? "text-accent" : "text-destructive"}`}>
                {isUp ? "+" : ""}{fmt(pnl, currency)}
                <span className="ml-1 text-[11px]">({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)</span>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{detail}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
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
