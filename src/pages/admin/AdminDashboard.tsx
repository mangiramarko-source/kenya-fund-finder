import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type FundType, FUND_TYPE_LABELS } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Newspaper, Clock, AlertTriangle, LogOut, Eye, Users,
  TrendingUp, Activity, MousePointerClick, ShieldAlert, ArrowUpRight,
  ArrowDownRight, Globe, PieChart, RefreshCw, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, PieChart as RechartsPie, Pie, Legend,
  AreaChart, Area,
} from "recharts";

type TimeRange = "24h" | "7d" | "30d";

interface FundEngagement {
  fundName: string;
  slug: string;
  views: number;
  fundType: string;
}

interface DailyTraffic {
  date: string;
  views: number;
  visitors: number;
}

interface Stats {
  fundCount: number;
  publishedFunds: number;
  draftFunds: number;
  newsCount: number;
  pendingNews: number;
  outdatedFunds: number;
  lastUpdate: string;
  totalPageViews: number;
  uniqueVisitors: number;
  avgPagesPerVisitor: number;
  topPages: { page: string; views: number; pct: number }[];
  fundEngagement: FundEngagement[];
  recentChanges: number;
  avgYield: number;
  highestYield: { name: string; yield: number } | null;
  lowestYield: { name: string; yield: number } | null;
  gateClicks: { source: string; count: number }[];
  totalGateClicks: number;
  conversionRate: number;
  rateLimitedIPs: number;
  rateLimitHits: number;
  fundTypeBreakdown: { type: string; label: string; count: number }[];
  dailyTraffic: DailyTraffic[];
  calculatorUsage: number;
  sparklines: {
    views: { value: number }[];
    visitors: { value: number }[];
    calculator: { value: number }[];
    gateClicks: { value: number }[];
  };
}

function getWindowStart(range: TimeRange): string {
  const now = new Date();
  if (range === "24h") now.setHours(now.getHours() - 24);
  else if (range === "7d") now.setDate(now.getDate() - 7);
  else now.setDate(now.getDate() - 30);
  return now.toISOString();
}

const RANGE_LABELS: Record<TimeRange, string> = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" };

const PIE_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(160, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(280, 50%, 55%)",
];

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>("7d");
  const [engagementFilter, setEngagementFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { isLive, toggleLive, lastUpdateDate, setLastUpdate, showDate, setShowDate } = useLiveStatus();
  const [stats, setStats] = useState<Stats>({
    fundCount: 0, publishedFunds: 0, draftFunds: 0, newsCount: 0, pendingNews: 0, outdatedFunds: 0,
    lastUpdate: "", totalPageViews: 0, uniqueVisitors: 0, avgPagesPerVisitor: 0,
    topPages: [], fundEngagement: [], recentChanges: 0, avgYield: 0,
    highestYield: null, lowestYield: null,
    gateClicks: [], totalGateClicks: 0, conversionRate: 0, rateLimitedIPs: 0, rateLimitHits: 0,
    fundTypeBreakdown: [], dailyTraffic: [], calculatorUsage: 0,
    sparklines: { views: [], visitors: [], calculator: [], gateClicks: [] },
  });

  const load = useCallback(async () => {
    setLoading(true);
    const windowStart = getWindowStart(range);
    const sparklineStart = new Date();
    sparklineStart.setDate(sparklineStart.getDate() - 7);
    const sparklineStartISO = sparklineStart.toISOString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Always fetch 7-day data for sparklines in addition to the range data
    const fetchSparklineViews = range !== "7d"
      ? supabase.from("page_views").select("page_path, session_id, created_at").gte("created_at", sparklineStartISO)
      : null;
    const fetchSparklineGate = range !== "7d"
      ? supabase.from("auth_gate_clicks").select("created_at").gte("created_at", sparklineStartISO)
      : null;

    const [fundsRes, newsRes, pendingRes, viewsRes, changeLogRes, gateClicksRes, rateLimitRes, sparkViewsRes, sparkGateRes] = await Promise.all([
      supabase.from("funds").select("id, slug, name, updated_at, annual_yield, fund_type, is_published"),
      supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "published"),
      supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "pending_review"),
      supabase.from("page_views").select("id, page_path, session_id, created_at").gte("created_at", windowStart),
      supabase.from("change_log").select("id", { count: "exact" }).gte("changed_at", windowStart),
      supabase.from("auth_gate_clicks").select("source, action, created_at").gte("created_at", windowStart),
      supabase.from("rate_limit_hits").select("ip_hash, created_at").gte("created_at", windowStart),
      fetchSparklineViews,
      fetchSparklineGate,
    ]);

    const funds = fundsRes.data || [];
    const publishedFunds = funds.filter((f) => f.is_published).length;
    const draftFunds = funds.length - publishedFunds;
    const outdated = funds.filter((f) => new Date(f.updated_at) < thirtyDaysAgo).length;
    const lastUpdate = funds.reduce((latest, f) =>
      new Date(f.updated_at) > new Date(latest) ? f.updated_at : latest, "1970-01-01");
    const avgYield = funds.length > 0
      ? funds.reduce((sum, f) => sum + Number(f.annual_yield), 0) / funds.length
      : 0;

    const sortedByYield = [...funds].sort((a, b) => Number(b.annual_yield) - Number(a.annual_yield));
    const highestYield = sortedByYield.length > 0
      ? { name: sortedByYield[0].name, yield: Number(sortedByYield[0].annual_yield) }
      : null;
    const lowestYield = sortedByYield.length > 0
      ? { name: sortedByYield[sortedByYield.length - 1].name, yield: Number(sortedByYield[sortedByYield.length - 1].annual_yield) }
      : null;

    // Fund type breakdown
    const typeCount: Record<string, number> = {};
    funds.forEach((f) => {
      const t = f.fund_type || "money_market";
      typeCount[t] = (typeCount[t] || 0) + 1;
    });
    const fundTypeBreakdown = Object.entries(typeCount).map(([type, count]) => ({
      type,
      label: FUND_TYPE_LABELS[type as FundType] || type,
      count,
    }));

    const views = viewsRes.data || [];
    const uniqueSessions = new Set(views.filter((v) => v.session_id).map((v) => v.session_id)).size;
    const avgPagesPerVisitor = uniqueSessions > 0 ? Math.round((views.length / uniqueSessions) * 10) / 10 : 0;

    // Calculator usage
    const calculatorUsage = views.filter((v) => v.page_path === "/calculator").length;

    // Daily traffic
    const dailyMap: Record<string, { views: number; sessions: Set<string> }> = {};
    views.forEach((v) => {
      const day = v.created_at.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { views: 0, sessions: new Set() };
      dailyMap[day].views++;
      if (v.session_id) dailyMap[day].sessions.add(v.session_id);
    });
    const dailyTraffic: DailyTraffic[] = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
        views: d.views,
        visitors: d.sessions.size,
      }));

    const pageCounts: Record<string, number> = {};
    const fundViewCounts: Record<string, number> = {};
    views.forEach((v) => {
      pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
      const fundMatch = v.page_path.match(/^\/compare\/(.+)$/);
      if (fundMatch) fundViewCounts[fundMatch[1]] = (fundViewCounts[fundMatch[1]] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([page, count]) => ({ page, views: count, pct: views.length > 0 ? Math.round((count / views.length) * 100) : 0 }));

    const fundEngagement: FundEngagement[] = funds
      .map((f) => ({ fundName: f.name, slug: f.slug, views: fundViewCounts[f.slug] || 0, fundType: f.fund_type || "money_market" }))
      .sort((a, b) => b.views - a.views);

    const clicks = gateClicksRes.data || [];
    const sourceCounts: Record<string, number> = {};
    clicks.forEach((c) => { sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1; });
    const gateClicks = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));

    const conversionRate = uniqueSessions > 0 ? Math.round((clicks.length / uniqueSessions) * 1000) / 10 : 0;

    const rlHits = rateLimitRes.data || [];
    const uniqueRLIPs = new Set(rlHits.map((r) => r.ip_hash)).size;

    // Build 7-day sparkline data
    const sparkSource = sparkViewsRes?.data || (range === "7d" ? views : []);
    const sparkGateSource = sparkGateRes?.data || (range === "7d" ? clicks : []);
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().slice(0, 10));
    }
    const sparkDays: Record<string, { views: number; visitors: Set<string>; calc: number; gate: number }> = {};
    last7Days.forEach((d) => { sparkDays[d] = { views: 0, visitors: new Set(), calc: 0, gate: 0 }; });
    sparkSource.forEach((v: any) => {
      const day = v.created_at.slice(0, 10);
      if (sparkDays[day]) {
        sparkDays[day].views++;
        if (v.session_id) sparkDays[day].visitors.add(v.session_id);
        if (v.page_path === "/calculator") sparkDays[day].calc++;
      }
    });
    sparkGateSource.forEach((c: any) => {
      const day = c.created_at.slice(0, 10);
      if (sparkDays[day]) sparkDays[day].gate++;
    });
    const sparklines = {
      views: last7Days.map((d) => ({ value: sparkDays[d].views })),
      visitors: last7Days.map((d) => ({ value: sparkDays[d].visitors.size })),
      calculator: last7Days.map((d) => ({ value: sparkDays[d].calc })),
      gateClicks: last7Days.map((d) => ({ value: sparkDays[d].gate })),
    };

    setStats({
      fundCount: funds.length,
      publishedFunds,
      draftFunds,
      newsCount: newsRes.count || 0,
      pendingNews: pendingRes.count || 0,
      outdatedFunds: outdated,
      lastUpdate: lastUpdate !== "1970-01-01" ? new Date(lastUpdate).toLocaleDateString("en-KE") : "Never",
      totalPageViews: views.length,
      uniqueVisitors: uniqueSessions,
      avgPagesPerVisitor,
      topPages,
      fundEngagement,
      recentChanges: changeLogRes.count || 0,
      avgYield: Math.round(avgYield * 100) / 100,
      highestYield,
      lowestYield,
      gateClicks,
      totalGateClicks: clicks.length,
      conversionRate,
      rateLimitHits: rlHits.length,
      rateLimitedIPs: uniqueRLIPs,
      fundTypeBreakdown,
      dailyTraffic,
      calculatorUsage,
      sparklines,
    });
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const gateLabels: Record<string, string> = {
    fund_detail: "Fund Details",
    calculator: "Calculator",
    calculator_compare: "Calculator Compare",
    news_article: "News Articles",
  };

  const Sparkline = ({ data, color }: { data: { value: number }[]; color: string }) => {
    if (!data || data.length < 2 || data.every((d) => d.value === 0)) return null;
    return (
      <div className="h-8 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle, sparkData }: {
    icon: React.ElementType; label: string; value: string | number; color: string; subtitle?: string; sparkData?: { value: number }[];
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <div className="flex items-end gap-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              {sparkData && <Sparkline data={sparkData} color={`hsl(var(--accent))`} />}
            </div>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted/50 shrink-0">
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {user?.email} · Data last updated: {lastUpdateDate ? new Date(lastUpdateDate + "T00:00:00").toLocaleDateString("en-KE") : stats.lastUpdate}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Last Update Date */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-card">
            <Label htmlFor="last-update-date" className="text-xs font-medium cursor-pointer select-none whitespace-nowrap">
              Last Updated
            </Label>
            <input
              id="last-update-date"
              type="date"
              value={lastUpdateDate ?? ""}
              onChange={(e) => setLastUpdate(e.target.value || null)}
              className="text-xs bg-transparent border-none outline-none w-[120px] text-foreground"
            />
          </div>
          {/* Show Date Toggle */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-card">
            <Label htmlFor="show-date-toggle" className="text-xs font-medium cursor-pointer select-none whitespace-nowrap">
              Show Date
            </Label>
            <Switch
              id="show-date-toggle"
              checked={showDate}
              onCheckedChange={setShowDate}
              className="scale-90"
            />
          </div>
          {/* Live Toggle */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-card">
            <Radio className={`h-3.5 w-3.5 ${isLive ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
            <Label htmlFor="live-toggle" className="text-xs font-medium cursor-pointer select-none">
              {isLive ? "Live" : "Offline"}
            </Label>
            <Switch
              id="live-toggle"
              checked={isLive ?? false}
              onCheckedChange={toggleLive}
              className="scale-90"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as TimeRange)} className="border rounded-md">
            <ToggleGroupItem value="24h" size="sm" className="text-xs px-3">24h</ToggleGroupItem>
            <ToggleGroupItem value="7d" size="sm" className="text-xs px-3">7d</ToggleGroupItem>
            <ToggleGroupItem value="30d" size="sm" className="text-xs px-3">30d</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Traffic Overview — Key Metrics */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Traffic Overview · {RANGE_LABELS[range]}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Eye} label="Page Views" value={stats.totalPageViews.toLocaleString()} color="text-accent" sparkData={stats.sparklines.views} />
          <StatCard icon={Users} label="Unique Visitors" value={stats.uniqueVisitors.toLocaleString()} color="text-primary" sparkData={stats.sparklines.visitors} />
          <StatCard icon={Globe} label="Pages / Visitor" value={stats.avgPagesPerVisitor} color="text-accent" />
          <StatCard icon={BarChart3} label="Calculator Usage" value={stats.calculatorUsage} color="text-primary" subtitle="visits to /calculator" sparkData={stats.sparklines.calculator} />
        </div>
      </div>

      {/* Traffic Trend Chart */}
      {stats.dailyTraffic.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Traffic Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyTraffic} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Page Views" />
                  <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Visitors" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content + Fund Stats — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Overview */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Content Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={BarChart3} label="Total Funds" value={stats.fundCount} color="text-accent" subtitle={`${stats.publishedFunds} published · ${stats.draftFunds} draft`} />
            <StatCard icon={TrendingUp} label="Avg Yield" value={`${stats.avgYield}%`} color="text-accent" subtitle={stats.highestYield ? `Best: ${stats.highestYield.yield}%` : undefined} />
            <StatCard icon={Newspaper} label="Published News" value={stats.newsCount} color="text-primary" />
            <StatCard icon={Clock} label="Pending Review" value={stats.pendingNews} color="text-yellow-600 dark:text-yellow-400" />
            <StatCard icon={AlertTriangle} label="Outdated (>30d)" value={stats.outdatedFunds} color={stats.outdatedFunds > 0 ? "text-destructive" : "text-muted-foreground"} />
            <StatCard icon={Activity} label="Recent Changes" value={stats.recentChanges} color="text-primary" />
          </div>
        </div>

        {/* Fund Type Breakdown — Pie */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fund Type Breakdown</h2>
          <Card className="h-[calc(100%-28px)]">
            <CardContent className="pt-4 flex items-center justify-center">
              {stats.fundTypeBreakdown.length > 0 ? (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={stats.fundTypeBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={3}
                        label={({ label, count }) => `${label} (${count})`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {stats.fundTypeBreakdown.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value} funds`, name]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8">No fund data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Yield Range Highlight */}
      {stats.highestYield && stats.lowestYield && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-accent/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <ArrowUpRight className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Highest Yield Fund</p>
                <p className="font-bold text-accent">{stats.highestYield.yield}%</p>
                <p className="text-xs text-muted-foreground">{stats.highestYield.name}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowDownRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lowest Yield Fund</p>
                <p className="font-bold text-primary">{stats.lowestYield.yield}%</p>
                <p className="text-xs text-muted-foreground">{stats.lowestYield.name}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sign-up Conversion */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sign-up Conversion</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={MousePointerClick} label="Total Gate Clicks" value={stats.totalGateClicks} color="text-accent" subtitle={`${stats.conversionRate}% of visitors`} sparkData={stats.sparklines.gateClicks} />
          {stats.gateClicks.map((g) => (
            <StatCard key={g.source} icon={MousePointerClick} label={gateLabels[g.source] || g.source} value={g.count} color="text-primary" />
          ))}
        </div>
      </div>

      {/* Security */}
      {(stats.rateLimitHits > 0 || stats.rateLimitedIPs > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ShieldAlert} label="Rate Limit Hits" value={stats.rateLimitHits} color="text-destructive" />
            <StatCard icon={ShieldAlert} label="Rate-Limited IPs" value={stats.rateLimitedIPs} color="text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      )}

      {/* Fund Engagement + Top Pages — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fund Engagement */}
        {stats.fundEngagement.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fund Engagement</h2>
              <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(FUND_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const filteredEngagement = stats.fundEngagement.filter((f) => engagementFilter === "all" || f.fundType === engagementFilter);
              const chartData = filteredEngagement.map((f) => ({
                name: f.fundName.length > 18 ? f.fundName.slice(0, 16) + "…" : f.fundName,
                fullName: f.fundName,
                views: f.views,
                type: FUND_TYPE_LABELS[f.fundType as FundType] || f.fundType,
              }));
              const maxViews = Math.max(...chartData.map((d) => d.views), 1);
              return chartData.length > 0 ? (
                <Card>
                  <CardContent className="pt-4">
                    <div style={{ height: Math.max(200, chartData.length * 36) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            formatter={(value: number, _: string, props: any) => [`${value} views`, props.payload.fullName]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                            labelFormatter={() => ""}
                          />
                          <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={24}>
                            {chartData.map((entry, idx) => (
                              <Cell key={idx} fill={`hsl(var(--accent) / ${0.4 + 0.6 * (entry.views / maxViews)})`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground text-center py-4">No funds in this category.</p>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        {/* Top Pages */}
        {stats.topPages.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Pages</h2>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  {stats.topPages.map((p, i) => (
                    <div key={p.page} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{p.page}</span>
                          <span className="text-xs font-semibold text-accent ml-2 shrink-0">{p.views}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent/70 transition-all"
                            style={{ width: `${p.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
