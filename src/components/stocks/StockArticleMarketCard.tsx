import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BarChart3, ExternalLink, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicStock } from "@/lib/api";
import { fetchPublicData } from "@/lib/gateway";
import { formatMarketDate } from "@/lib/utils";

type Range = "1W" | "1M" | "3M" | "ALL";
type PricePoint = { snapshot_date: string; price: number };

const formatPrice = (value: number) => value.toLocaleString("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function StockArticleMarketCard({ stock }: { stock: PublicStock }) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("3M");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublicData<any>("stock-history", {
      select: ["price", "snapshot_date"],
      id: stock.id,
      order: "snapshot_date.asc",
      days: 90,
      limit: 200,
    })
      .then(({ data }) => {
        if (!cancelled) {
          setHistory(data.map((point: any) => ({
            snapshot_date: point.snapshot_date,
            price: Number(point.price),
          })));
        }
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [stock.id]);

  const filteredHistory = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const points = [...history];
    if (!points.length || points[points.length - 1].snapshot_date < today) {
      points.push({ snapshot_date: today, price: stock.price });
    }

    if (range === "ALL") return points;
    const days = range === "1W" ? 7 : range === "1M" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return points.filter((point) => new Date(point.snapshot_date) >= cutoff);
  }, [history, range, stock.price]);

  const stats = useMemo(() => {
    if (!filteredHistory.length) return null;
    const prices = filteredHistory.map((point) => point.price);
    const change = prices[prices.length - 1] - prices[0];
    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
      change,
      changePercent: prices[0] ? (change / prices[0]) * 100 : 0,
    };
  }, [filteredHistory]);

  const chartIsUp = (stats?.change ?? stock.day_change_percent) > 0;
  const chartIsDown = (stats?.change ?? stock.day_change_percent) < 0;
  const chartColor = chartIsUp ? "hsl(152 60% 42%)" : chartIsDown ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  const dayIsUp = stock.day_change_percent > 0;
  const dayIsDown = stock.day_change_percent < 0;

  return (
    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stock.symbol} share price</p>
          <p className="text-xl font-bold text-foreground tabular-nums">KSh {formatPrice(stock.price)}</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${dayIsUp ? "text-emerald-500" : dayIsDown ? "text-destructive" : "text-muted-foreground"}`}>
          {dayIsUp ? <TrendingUp className="h-4 w-4" /> : dayIsDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {stock.day_change_percent > 0 ? "+" : ""}{stock.day_change_percent.toFixed(2)}%
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

      {loading ? (
        <Skeleton className="h-[82px] w-full rounded-lg" />
      ) : filteredHistory.length < 2 ? (
        <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">No historical price data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height={82}>
          <AreaChart data={filteredHistory} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`article-price-${stock.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              labelFormatter={(value) => formatMarketDate(value, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
              formatter={(value: number) => [`KSh ${formatPrice(value)}`, "Price"]}
            />
            <XAxis dataKey="snapshot_date" hide />
            <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill={`url(#article-price-${stock.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-1.5">
          <div>
            <p className="text-[9px] text-muted-foreground">High</p>
            <p className="text-xs font-bold text-foreground">KSh {formatPrice(stats.high)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Low</p>
            <p className="text-xs font-bold text-foreground">KSh {formatPrice(stats.low)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Change</p>
            <p className={`text-xs font-bold ${chartIsUp ? "text-emerald-500" : chartIsDown ? "text-destructive" : "text-muted-foreground"}`}>
              {stats.changePercent > 0 ? "+" : ""}{stats.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <Link to={`/stocks/${encodeURIComponent(stock.symbol)}`} className="flex items-center justify-center gap-1 border-t border-border/50 pt-1.5 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400">
        View full {stock.symbol} analysis <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
