import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePortfolio, getCurrentValue, getPnL, getPnLPercent, ASSET_TYPE_LABELS, type PortfolioItem } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import PortfolioKPICards from "@/components/portfolio/PortfolioKPICards";
import WeightedYieldCard from "@/components/portfolio/WeightedYieldCard";
import MonthlyIncomeCard from "@/components/portfolio/MonthlyIncomeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Briefcase, Plus, TrendingUp, TrendingDown } from "lucide-react";

const fmt = (val: number, currency: "KES" | "USD") => {
  const v = currency === "USD" ? val / 130 : val;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const TYPE_DOT: Record<string, string> = {
  mmf: "bg-accent",
  stock: "bg-primary",
  fx: "bg-blue-500",
  fixed_income: "bg-amber-500",
  commodity: "bg-rose-500",
};

interface Props {
  currency?: "KES" | "USD";
}

const PortfolioSnapshotPanel = ({ currency = "KES" }: Props) => {
  const { items, isLoading, totalValue, totalPnL, totalPnLPercent, isDemo } = usePortfolio();
  const { changes } = usePortfolioChanges(items);
  const metrics = usePortfolioMetrics(items);

  const recentChangePct = useMemo(() => {
    const pcts = changes
      .map((c) => (c.unit === "%" ? c.delta : null))
      .filter((v): v is number => v != null);
    if (pcts.length === 0) return null;
    return pcts.reduce((a, b) => a + b, 0) / pcts.length;
  }, [changes]);

  const topHoldings = useMemo(
    () =>
      [...items]
        .sort((a, b) => getCurrentValue(b) - getCurrentValue(a))
        .slice(0, 5),
    [items],
  );

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading portfolio…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-border bg-card/40">
        <CardContent className="p-8 md:p-12 text-center">
          <Briefcase className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">
            No holdings yet
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Track a mock portfolio to compare value, yield and recent change across your holdings. No real money is invested.
          </p>
          <Button asChild size="sm" className="rounded-full gap-1.5">
            <Link to="/portfolio">
              <Plus className="h-3.5 w-3.5" /> Open portfolio
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          Showing a guest portfolio stored on this device. Sign in from the portfolio page to save it.
        </div>
      )}

      <PortfolioKPICards
        totalValue={totalValue}
        totalPnL={totalPnL}
        totalPnLPercent={totalPnLPercent}
        currency={currency}
        recentChangePct={recentChangePct}
      />

      {metrics.hasFunds && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeightedYieldCard
            weightedAvgYield={metrics.weightedAvgYield}
            hasFunds={metrics.hasFunds}
          />
          <MonthlyIncomeCard
            monthlyIncome={metrics.monthlyIncome}
            currency={currency}
            hasFunds={metrics.hasFunds}
          />
        </div>
      )}

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top holdings</h3>
              <p className="text-[11px] text-muted-foreground">By current value</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <Link to="/portfolio">
                Full portfolio <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {topHoldings.map((item) => {
              const value = getCurrentValue(item);
              const pnl = getPnL(item);
              const pnlPct = getPnLPercent(item);
              const isUp = pnl >= 0;
              return (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_DOT[item.asset_type] ?? "bg-muted"}`}
                    title={ASSET_TYPE_LABELS[item.asset_type]}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.asset_name}
                      </span>
                      {item.ticker && (
                        <span className="text-[10px] text-muted-foreground font-mono uppercase truncate">
                          {item.ticker}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {ASSET_TYPE_LABELS[item.asset_type]}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm font-semibold tabular-nums text-foreground">
                      {fmt(value, currency)}
                    </div>
                    <div
                      className={`text-[11px] tabular-nums font-medium inline-flex items-center gap-0.5 justify-end ${
                        isUp ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-3 border-t border-border/60">
            <Button asChild variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5">
              <Link to="/portfolio">
                <Briefcase className="h-3.5 w-3.5" /> Open full portfolio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Snapshot only. Compare data — general information, not personal financial advice.
      </p>
    </div>
  );
};

export default PortfolioSnapshotPanel;
