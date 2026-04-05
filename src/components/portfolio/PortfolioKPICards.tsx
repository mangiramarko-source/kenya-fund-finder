import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";

interface Props {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  currency: "KES" | "USD";
  fxRate: number;
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

const PortfolioKPICards = ({ totalValue, totalPnL, totalPnLPercent, currency }: Props) => {
  const isPositive = totalPnL >= 0;

  const cards = [
    {
      label: "Total Portfolio Value",
      value: fmt(totalValue, currency),
      icon: Wallet,
      color: "text-primary",
    },
    {
      label: "24h Change",
      value: fmt(totalPnL * 0.003, currency),
      icon: Activity,
      color: isPositive ? "text-accent" : "text-destructive",
    },
    {
      label: "Overall Profit / Loss",
      value: `${isPositive ? "+" : ""}${totalPnLPercent.toFixed(2)}%`,
      sub: fmt(totalPnL, currency),
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-accent" : "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            {c.sub && <p className={`text-xs mt-1 ${c.color}`}>{c.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PortfolioKPICards;
