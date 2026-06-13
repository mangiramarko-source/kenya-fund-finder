import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

interface Props {
  changes: ChangeRow[];
  loading?: boolean;
}

const PortfolioWeeklyChanges = ({ changes, loading }: Props) => {
  const withData = changes.filter((c) => c.delta != null);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
          <Activity className="h-4 w-4" /> What changed recently
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-3">Loading…</p>
        ) : withData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">
            No recent snapshot data available for your holdings yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {withData.map((c) => {
              const up = (c.delta ?? 0) > 0;
              const flat = (c.delta ?? 0) === 0;
              const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
              const tone = flat ? "text-muted-foreground" : up ? "text-accent" : "text-destructive";
              return (
                <li key={c.itemId} className="py-2 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{c.assetName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.assetType === "mmf" ? "Yield data changed" : "Price data changed"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${tone}`}>
                    <Icon className="h-3 w-3" />
                    {c.delta != null && (up ? "+" : "")}
                    {c.delta?.toFixed(c.unit === "%" ? 2 : 2)}{c.unit === "%" ? "%" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioWeeklyChanges;
