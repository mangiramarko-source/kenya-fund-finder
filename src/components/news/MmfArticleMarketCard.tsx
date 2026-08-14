import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { fetchFundSnapshots, type YieldSnapshot } from "@/lib/api";

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
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);

  useEffect(() => {
    if (!mmf.id) return;
    let cancelled = false;
    fetchFundSnapshots(mmf.id)
      .then(res => {
        if (!cancelled) setSnapshots(res);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mmf.id]);

  const chartData = snapshots.length >= 1
    ? (() => {
        const data = [...snapshots].reverse().map((s) => ({
          date: new Date(s.snapshot_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
          rate: Number(s.annual_yield),
        }));
        const last = snapshots[0];
        const baseYield = mmf.annualYield ?? (mmf as any).yield ?? 0;
        if (last && Number(last.annual_yield) !== baseYield) {
          data.push({ date: "Today", rate: baseYield });
        }
        return data.length > 1 ? data : null;
      })()
    : null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <BarChart3 className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rate History</h2>
      </div>
      
      {chartData ? (
        <div className="rounded-xl border border-border bg-card p-4 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`rateGrad-${mmf.id || 'mmf'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 0.2", "dataMax + 0.2"]} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "11px", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} 
                itemStyle={{ color: "#10b981" }} 
                labelStyle={{ color: "hsl(var(--foreground))" }} 
              />
              <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fill={`url(#rateGrad-${mmf.id || 'mmf'})`} dot={{ fill: "#10b981", stroke: "#10b981", r: 2.5 }} activeDot={{ fill: "#10b981", stroke: "#10b981" }} name="Annual Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No rate history available yet.</p>
        </div>
      )}
    </section>
  );
}
