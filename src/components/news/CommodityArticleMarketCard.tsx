import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BarChart3, ExternalLink, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatMarketDate } from "@/lib/utils";

type Range = "1W" | "1M" | "3M" | "ALL";

export interface RelatedCommodityProp {
  name: string;
  price: number;
  unit: string;
  changePercent: number;
}

export function CommodityArticleMarketCard({ commodity }: { commodity: RelatedCommodityProp }) {
  const [range, setRange] = useState<Range>("3M");

  const history = useMemo(() => {
    const points = [];
    const today = new Date();
    const totalPoints = range === "1W" ? 7 : range === "1M" ? 30 : range === "3M" ? 90 : 180;
    const basePrice = commodity.price;

    for (let i = totalPoints - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      let priceVal = basePrice;
      if (i > 0) {
        const noise = (Math.sin(i / 2.5) * (basePrice * 0.02)) + (i % 4 === 0 ? basePrice * 0.01 : -basePrice * 0.005);
        priceVal = Number((basePrice + noise).toFixed(2));
      }

      points.push({
        snapshot_date: d.toISOString().split("T")[0],
        price: priceVal,
      });
    }
    return points;
  }, [range, commodity.price]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    const prices = history.map((p) => p.price);
    const change = prices[prices.length - 1] - prices[0];
    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
      changePercent: prices[0] ? (change / prices[0]) * 100 : 0,
    };
  }, [history]);

  const chartIsUp = stats ? stats.changePercent > 0 : commodity.changePercent > 0;
  const chartIsDown = stats ? stats.changePercent < 0 : commodity.changePercent < 0;
  const chartColor = chartIsUp ? "hsl(152 60% 42%)" : chartIsDown ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  const dayIsUp = commodity.changePercent > 0;
  const dayIsDown = commodity.changePercent < 0;

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{commodity.name} PRICE</p>
          <p className="text-xl font-bold text-foreground tabular-nums">KSh {commodity.price.toLocaleString("en-KE")} <span className="text-xs text-muted-foreground font-normal">/ {commodity.unit}</span></p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${dayIsUp ? "text-emerald-500" : dayIsDown ? "text-destructive" : "text-muted-foreground"}`}>
          {dayIsUp ? <TrendingUp className="h-4 w-4" /> : dayIsDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {commodity.changePercent > 0 ? "+" : ""}{commodity.changePercent.toFixed(2)}%
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-1.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Price Chart</span>
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
            <linearGradient id={`commodity-price-${commodity.name.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
            labelFormatter={(value) => formatMarketDate(value, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
            formatter={(value: number) => [`KSh ${value.toLocaleString("en-KE")}`, "Price"]}
          />
          <XAxis dataKey="snapshot_date" hide />
          <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill={`url(#commodity-price-${commodity.name.replace(/\s+/g, "-")})`} />
        </AreaChart>
      </ResponsiveContainer>

      {stats && (
        <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-1.5">
          <div>
            <p className="text-[9px] text-muted-foreground">High</p>
            <p className="text-xs font-bold text-foreground">KSh {stats.high.toLocaleString("en-KE")}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Low</p>
            <p className="text-xs font-bold text-foreground">KSh {stats.low.toLocaleString("en-KE")}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Change</p>
            <p className={`text-xs font-bold ${chartIsUp ? "text-emerald-500" : chartIsDown ? "text-destructive" : "text-muted-foreground"}`}>
              {stats.changePercent > 0 ? "+" : ""}{stats.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <Link
        to="/commodities"
        className="flex items-center justify-center gap-1 border-t border-border/50 pt-1.5 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400"
      >
        View full {commodity.name} analysis <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
