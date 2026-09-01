import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";
import { buildWeeklyBuckets } from "@/lib/portfolioWeeklyBuckets";

interface Props {
  changes: ChangeRow[];
  loading?: boolean;
}

const fmtDelta = (c: ChangeRow): string => {
  const v = c.delta ?? 0;
  const sign = v > 0 ? "+" : "";
  return c.unit === "%"
    ? `${sign}${v.toFixed(2)}%`
    : `${sign}KES ${Math.abs(v).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Row = ({
  label,
  row,
  positive,
}: {
  label: string;
  row: ChangeRow | null;
  positive: boolean;
}) => {
  if (!row) return null;
  const Icon = positive ? TrendingUp : TrendingDown;
  const tone = positive ? "text-accent" : "text-destructive";
  return (
    <li className="py-2 flex items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-medium text-foreground mt-0.5">{row.assetName}</p>
      </div>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums whitespace-nowrap ${tone}`}>
        <Icon className="h-3 w-3" />
        {fmtDelta(row)}
      </span>
    </li>
  );
};

const PortfolioWeeklyChanges = ({ changes, loading }: Props) => {
  const buckets = buildWeeklyBuckets(changes);

  return (
    <Card className="rounded-[22px] border-border/80 bg-card shadow-sm">
      <CardHeader className="px-5 pb-1 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Activity className="h-4 w-4" /> What changed recently
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {loading ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : buckets.isEmpty ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-8 text-center text-sm text-muted-foreground">Not enough recent data yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              <Row label="Largest yield increase" row={buckets.largestYieldIncrease} positive />
              <Row label="Largest yield decrease" row={buckets.largestYieldDecrease} positive={false} />
              <Row label="Largest price increase" row={buckets.largestPriceIncrease} positive />
              <Row label="Largest price decrease" row={buckets.largestPriceDecrease} positive={false} />
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {buckets.withData.length} with new snapshot data
              </span>
              {buckets.missingData.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  {buckets.missingData.length} with no recent data
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Data only. Not personal financial advice.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioWeeklyChanges;
