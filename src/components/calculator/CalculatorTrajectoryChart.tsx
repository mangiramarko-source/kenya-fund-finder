import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface TrajectoryPoint {
  periodLabel: string;
  principal: number;
  netTotal: number;
  netInterest: number;
  taxDeducted?: number;
}

interface CalculatorTrajectoryChartProps {
  data: TrajectoryPoint[];
  height?: number;
  currencyPrefix?: string;
  className?: string;
}

const fmtCurrency = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return Math.round(n).toLocaleString("en-KE");
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const point: TrajectoryPoint = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
      <p className="font-bold text-foreground pb-1 border-b border-border/50 text-[13px]">
        {point.periodLabel}
      </p>
      <div className="flex justify-between items-center text-muted-foreground">
        <span>Principal:</span>
        <span className="font-semibold text-foreground tabular-nums">
          KSh {Math.round(point.principal).toLocaleString("en-KE")}
        </span>
      </div>
      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
        <span>Net Returns:</span>
        <span className="font-bold tabular-nums">
          +KSh {Math.round(point.netInterest).toLocaleString("en-KE")}
        </span>
      </div>
      {typeof point.taxDeducted === "number" && point.taxDeducted > 0 && (
        <div className="flex justify-between items-center text-muted-foreground/80 text-[11px]">
          <span>Tax Paid:</span>
          <span className="tabular-nums">-KSh {Math.round(point.taxDeducted).toLocaleString("en-KE")}</span>
        </div>
      )}
      <div className="flex justify-between items-center pt-1.5 border-t border-border/50 font-black text-foreground text-[13px]">
        <span>Total Value:</span>
        <span className="text-emerald-500 tabular-nums">
          KSh {Math.round(point.netTotal).toLocaleString("en-KE")}
        </span>
      </div>
    </div>
  );
};

export const CalculatorTrajectoryChart: React.FC<CalculatorTrajectoryChartProps> = ({
  data,
  height = 240,
  currencyPrefix = "KSh",
  className = "",
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2 px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Projected Wealth Growth</span>
        </span>
        <span className="text-[10px] text-muted-foreground/70">Principal vs Net Total</span>
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/40"
            />
            <XAxis
              dataKey="periodLabel"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              className="fill-muted-foreground font-medium"
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              className="fill-muted-foreground font-medium"
              tickFormatter={(v) => `${currencyPrefix} ${fmtCurrency(v)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="principal"
              name="Principal"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorPrincipal)"
            />
            <Area
              type="monotone"
              dataKey="netTotal"
              name="Total Value"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorNetTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CalculatorTrajectoryChart;
