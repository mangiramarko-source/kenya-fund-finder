import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
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
}

const PortfolioCharts = ({ allocation, totalValue, currency }: Props) => {
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

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Pie Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-primary">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No investments yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${currency} ${fmtCurrency(value)}`, ""]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Line Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-primary">Portfolio Growth (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {totalValue === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No investments yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={fmtCurrency}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number) => [`${currency} ${fmtCurrency(value)}`, "Value"]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(152, 55%, 35%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCharts;
