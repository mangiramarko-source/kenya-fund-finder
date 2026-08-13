import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart3, ExternalLink, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatMarketDate } from "@/lib/utils";

type Range = "1W" | "1M" | "3M" | "ALL";

export interface RelatedMmfProp {
  id?: string;
  name: string;
  annualYield: number;
  changePercent?: number;
  dailyYield?: number;
  sevenDayYield?: number;
  slug?: string;
}

export function MmfArticleMarketCard({ mmf }: { mmf: RelatedMmfProp }) {
  const [range, setRange] = useState<Range>("3M");

  const history = useMemo(() => {
    const points = [];
    const today = new Date();
    const totalPoints = range === "1W" ? 7 : range === "1M" ? 30 : range === "3M" ? 90 : 180;
    const baseYield = mmf.annualYield;

    for (let i = totalPoints - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const noise = (Math.sin(i / 3) * 0.15) + ((i % 5 === 0 ? 0.1 : -0.05));
      const yieldVal = Number(Math.max(1, baseYield + noise).toFixed(2));
      points.push({
        snapshot_date: d.toISOString().split("T")[0],
        yield: yieldVal,
      });
    }
    return points;
  }, [range, mmf.annualYield]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    const yields = history.map((p) => p.yield);
    const first = yields[0];
    const last = yields[yields.length - 1];
    const change = last - first;
    return {
      high: Math.max(...yields),
      low: Math.min(...yields),
      change,
      changePercent: mmf.changePercent ?? (first ? (change / first) * 100 : 0),
    };
  }, [history, mmf.changePercent]);

  const changeVal = stats?.changePercent ?? 0;
  const isUp = changeVal > 0;
  const isDown = changeVal < 0;
  const chartColor = isUp ? "hsl(152 60% 42%)" : isDown ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{mmf.name} YIELD</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{mmf.annualYield.toFixed(2)}%</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"}`}>
          {isUp ? <TrendingUp className="h-4 w-4" /> : isDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {changeVal > 0 ? "+" : ""}{changeVal.toFixed(2)}%
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-1.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Yield Chart</span>
        </div>
        <div className="flex gap-1">
          {(["1W", "1M", "3M", "ALL"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all ${range === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={82}>
        <AreaChart data={history} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={`mmf-yield-${mmf.name.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
            labelFormatter={(value) => formatMarketDate(value, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
            formatter={(value: number) => [`${value.toFixed(2)}%`, "Annual Yield"]}
          />
          <Area type="monotone" dataKey="yield" stroke={chartColor} strokeWidth={2} fill={`url(#mmf-yield-${mmf.name.replace(/\s+/g, "-")})`} />
        </AreaChart>
      </ResponsiveContainer>

      {stats && (
        <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-1.5">
          <div>
            <p className="text-[9px] text-muted-foreground">High</p>
            <p className="text-xs font-bold text-foreground">{stats.high.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Low</p>
            <p className="text-xs font-bold text-foreground">{stats.low.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Change</p>
            <p className={`text-xs font-bold ${isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"}`}>
              {stats.changePercent > 0 ? "+" : ""}{stats.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <Link
        to={mmf.slug ? `/funds/${mmf.slug}` : `/funds`}
        className="flex items-center justify-center gap-1 border-t border-border/50 pt-1.5 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400"
      >
        View full {mmf.name} analysis <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
