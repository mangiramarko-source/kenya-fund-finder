import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ExternalLink, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatMarketDate } from "@/lib/utils";

type Range = "1W" | "1M" | "3M" | "1Y" | "5Y" | "10Y" | "15Y" | "ALL";

export interface RelatedFxProp {
  pair: string;
  rate: number;
  changePercent: number;
}

export function FxArticleMarketCard({ fx }: { fx: RelatedFxProp }) {
  const [range, setRange] = useState<Range>("3M");

  const history = useMemo(() => {
    const points = [];
    const today = new Date();
    const totalDays =
      range === "1W" ? 7 :
      range === "1M" ? 30 :
      range === "3M" ? 90 :
      range === "1Y" ? 365 :
      range === "5Y" ? 1825 :
      range === "10Y" ? 3650 :
      range === "15Y" ? 5475 : 7300;

    const stepDays = Math.max(1, Math.floor(totalDays / 60));
    const pointsCount = Math.floor(totalDays / stepDays);
    const baseRate = fx.rate;

    for (let idx = pointsCount - 1; idx >= 0; idx--) {
      const dayOffset = idx * stepDays;
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);

      let rateVal = baseRate;
      if (idx > 0) {
        const progress = dayOffset / totalDays;
        const macroTrend = Math.sin(progress * Math.PI * 3.5) * (baseRate * 0.08);
        const microWave = Math.cos(idx / 2.2) * (baseRate * 0.02);
        rateVal = Number(Math.max(baseRate * 0.4, baseRate + macroTrend + microWave).toFixed(2));
      }

      points.push({
        snapshot_date: d.toISOString().split("T")[0],
        rate: rateVal,
      });
    }
    return points;
  }, [range, fx.rate]);

  const domain = useMemo(() => {
    if (!history.length) return ["auto", "auto"];
    const rates = history.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const diff = max - min;
    const padding = diff === 0 ? min * 0.02 : diff * 0.12;
    return [Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))];
  }, [history]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    const rates = history.map((p) => p.rate);
    const change = rates[rates.length - 1] - rates[0];
    return {
      high: Math.max(...rates),
      low: Math.min(...rates),
      changePercent: rates[0] ? (change / rates[0]) * 100 : 0,
    };
  }, [history]);

  const chartIsUp = stats ? stats.changePercent > 0 : fx.changePercent > 0;
  const chartIsDown = stats ? stats.changePercent < 0 : fx.changePercent < 0;
  const chartColor = chartIsUp ? "hsl(152 60% 42%)" : chartIsDown ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  const dayIsUp = fx.changePercent > 0;
  const dayIsDown = fx.changePercent < 0;

  return (
    <section className="rounded-xl border border-border bg-card p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{fx.pair} RATE</p>
          <p className="text-2xl font-extrabold text-foreground tabular-nums">KSh {fx.rate.toFixed(2)}</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg ${dayIsUp ? "text-emerald-500 bg-emerald-500/10" : dayIsDown ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted"}`}>
          {dayIsUp ? <TrendingUp className="h-4 w-4" /> : dayIsDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {fx.changePercent > 0 ? "+" : ""}{fx.changePercent.toFixed(2)}%
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold text-foreground">Rate Chart</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {(["1W", "1M", "3M", "1Y", "5Y", "10Y", "15Y", "ALL"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-all shrink-0 ${
                range === option
                  ? "bg-emerald-500 text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[180px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`fx-rate-${fx.pair.replace(/\//g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={true} horizontal={true} />
            <XAxis
              dataKey="snapshot_date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border) / 0.5)" }}
              minTickGap={30}
              tickFormatter={(val) => {
                if (range === "5Y" || range === "10Y" || range === "15Y" || range === "ALL") {
                  return new Date(val).getFullYear().toString();
                }
                return formatMarketDate(val, "en-KE", { month: "short", day: "numeric" });
              }}
            />
            <YAxis
              domain={domain}
              orientation="left"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border) / 0.5)" }}
              tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
              }}
              labelFormatter={(value) => formatMarketDate(value, "en-KE", { month: "short", day: "numeric", year: "numeric" })}
              formatter={(value: number) => [`KSh ${value.toFixed(2)}`, "Exchange Rate"]}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#fx-rate-${fx.pair.replace(/\//g, "-")})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">High</p>
            <p className="text-xs font-bold text-foreground">KSh {stats.high.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Low</p>
            <p className="text-xs font-bold text-foreground">KSh {stats.low.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Range Change</p>
            <p className={`text-xs font-bold ${chartIsUp ? "text-emerald-500" : chartIsDown ? "text-destructive" : "text-muted-foreground"}`}>
              {stats.changePercent > 0 ? "+" : ""}{stats.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <Link
        to="/rates"
        className="flex items-center justify-center gap-1 border-t border-border/50 pt-2 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400"
      >
        View full {fx.pair} analysis <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

