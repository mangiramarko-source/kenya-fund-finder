import { Card, CardContent } from "@/components/ui/card";
import { Percent } from "lucide-react";

interface Props {
  weightedAvgYield: number | null;
  hasFunds: boolean;
}

const WeightedYieldCard = ({ weightedAvgYield, hasFunds }: Props) => (
  <Card className="rounded-[22px] border-border/80 bg-card shadow-sm">
    <CardContent className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Weighted average yield
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Percent className="h-4 w-4" />
        </span>
      </div>
      {hasFunds && weightedAvgYield != null ? (
        <>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-primary">
            {weightedAvgYield.toFixed(2)}%
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Based on available yield data. Yields change over time.
          </p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-muted-foreground">—</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Add yield-bearing fund holdings to see this.
          </p>
        </>
      )}
    </CardContent>
  </Card>
);

export default WeightedYieldCard;
