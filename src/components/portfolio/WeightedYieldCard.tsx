import { Card, CardContent } from "@/components/ui/card";
import { Percent } from "lucide-react";

interface Props {
  weightedAvgYield: number | null;
  hasFunds: boolean;
}

const WeightedYieldCard = ({ weightedAvgYield, hasFunds }: Props) => (
  <Card className="border-border bg-card">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Weighted average yield
        </span>
        <Percent className="h-4 w-4 text-primary" />
      </div>
      {hasFunds && weightedAvgYield != null ? (
        <>
          <p className="text-2xl font-bold tabular-nums text-primary">
            {weightedAvgYield.toFixed(2)}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Based on available yield data. Yields change over time.
          </p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums text-muted-foreground">—</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Add yield-bearing fund holdings to see this.
          </p>
        </>
      )}
    </CardContent>
  </Card>
);

export default WeightedYieldCard;
