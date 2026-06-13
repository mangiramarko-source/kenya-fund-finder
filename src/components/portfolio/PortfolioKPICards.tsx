import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";

interface Props {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  currency: "KES" | "USD";
  recentChangePct: number | null;
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

const PortfolioKPICards = ({ totalValue, totalPnL, totalPnLPercent, currency, recentChangePct }: Props) => {
  const isPositive = totalPnL >= 0;
  const recentUp = (recentChangePct ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total portfolio value
            </span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-primary">{fmt(totalValue, currency)}</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent change
            </span>
            <BarChart3 className={`h-4 w-4 ${recentChangePct == null ? "text-muted-foreground" : recentUp ? "text-accent" : "text-destructive"}`} />
          </div>
          {recentChangePct == null ? (
            <>
              <p className="text-2xl font-bold tabular-nums text-muted-foreground">—</p>
              <p className="text-[11px] text-muted-foreground mt-1">Not available yet</p>
            </>
          ) : (
            <>
              <p className={`text-2xl font-bold tabular-nums ${recentUp ? "text-accent" : "text-destructive"}`}>
                {recentUp ? "+" : ""}{recentChangePct.toFixed(2)}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Average across holdings with snapshot data
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Overall profit / loss
            </span>
            {isPositive ? <TrendingUp className="h-4 w-4 text-accent" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </div>
          <p className={`text-2xl font-bold tabular-nums ${isPositive ? "text-accent" : "text-destructive"}`}>
            {isPositive ? "+" : ""}{totalPnLPercent.toFixed(2)}%
          </p>
          <p className={`text-xs mt-1 ${isPositive ? "text-accent" : "text-destructive"}`}>
            {fmt(totalPnL, currency)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioKPICards;
