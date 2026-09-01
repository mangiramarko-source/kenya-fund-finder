import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AssetType, ASSET_TYPE_LABELS } from "@/hooks/usePortfolio";

const PIE_COLORS = [
  "hsl(152, 55%, 35%)",  // accent green
  "hsl(142, 71%, 45%)",  // emerald green
  "hsl(45, 90%, 50%)",   // gold
  "hsl(200, 70%, 50%)",  // blue
  "hsl(340, 65%, 50%)",  // rose
];

interface Props {
  allocation: Record<AssetType, number>;
  totalValue: number;
  currency: "KES" | "USD";
  weightedAvgYield: number | null;
  monthlyIncome: number;
  hasFunds: boolean;
}

const fmtValue = (value: number, currency: "KES" | "USD", compact = false) => {
  const normalized = currency === "USD" ? value / 130 : value;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(normalized);
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border) / 0.9)",
  borderRadius: "12px",
  boxShadow: "0 10px 24px hsl(var(--foreground) / 0.08)",
  fontSize: "12px",
};

const PortfolioCharts = ({
  allocation,
  totalValue,
  currency,
  weightedAvgYield,
  monthlyIncome,
  hasFunds,
}: Props) => {
  const pieData = Object.entries(allocation)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: ASSET_TYPE_LABELS[key as AssetType],
      value: currency === "USD" ? value / 130 : value,
    }));

  // Mock 30-day growth trend
  const growthData = Array.from({ length: 30 }, (_, i) => {
    const day = 30 - i;
    const factor = 1 + (Math.random() * 0.006 - 0.002) * (30 - day);
    const val = totalValue * (0.95 + (i / 30) * 0.05) * (1 + factor * 0.01);
    return {
      day: `Day ${i + 1}`,
      value: currency === "USD" ? val / 130 : val,
    };
  });

  const allocationTotal = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="rounded-[22px] border-border/80 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-1 pt-5">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Portfolio performance</CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">30-day view</span>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-3">
          {totalValue === 0 ? (
            <div className="flex h-[224px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
              No investments yet
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
                {fmtValue(totalValue, currency, true)}
              </p>
              <div className="mt-3 h-[136px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="portfolio-growth-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.26} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.65)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Tooltip
                      formatter={(value: number) => [fmtValue(value, currency), "Portfolio value"]}
                      contentStyle={tooltipStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#portfolio-growth-fill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-2 divide-x divide-border/80 border-t border-border/80 pt-3">
                <div className="pr-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Weighted yield</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-primary">
                    {hasFunds && weightedAvgYield != null ? `${weightedAvgYield.toFixed(2)}%` : "—"}
                  </p>
                </div>
                <div className="pl-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Monthly income</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {hasFunds ? fmtValue(monthlyIncome, currency) : "—"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[22px] border-border/80 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-1 pt-5">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Asset allocation</CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground">{pieData.length} asset {pieData.length === 1 ? "class" : "classes"}</span>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-3">
          {pieData.length === 0 ? (
            <div className="flex h-[224px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
              No investments yet
            </div>
          ) : (
            <>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted" aria-label="Asset allocation">
                {pieData.map((item, index) => (
                  <span
                    key={item.name}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${(item.value / allocationTotal) * 100}%`,
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  />
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {pieData.map((item, index) => {
                  const percentage = (item.value / allocationTotal) * 100;
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCharts;
