import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type FundType, FUND_TYPE_LABELS } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Newspaper, Clock, AlertTriangle, LogOut, Eye, Users, TrendingUp, Activity, MousePointerClick, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type TimeRange = "24h" | "7d" | "30d";

interface FundEngagement {
  fundName: string;
  slug: string;
  views: number;
  fundType: string;
}

interface Stats {
  fundCount: number;
  newsCount: number;
  pendingNews: number;
  outdatedFunds: number;
  lastUpdate: string;
  totalPageViews: number;
  uniqueVisitors: number;
  topPages: { page: string; views: number }[];
  fundEngagement: FundEngagement[];
  recentChanges: number;
  avgYield: number;
  gateClicks: { source: string; count: number }[];
  totalGateClicks: number;
  rateLimitedIPs: number;
  rateLimitHits: number;
}

function getWindowStart(range: TimeRange): string {
  const now = new Date();
  if (range === "24h") now.setHours(now.getHours() - 24);
  else if (range === "7d") now.setDate(now.getDate() - 7);
  else now.setDate(now.getDate() - 30);
  return now.toISOString();
}

const RANGE_LABELS: Record<TimeRange, string> = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" };

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>("7d");
  const [engagementFilter, setEngagementFilter] = useState<string>("all");
  const [stats, setStats] = useState<Stats>({
    fundCount: 0, newsCount: 0, pendingNews: 0, outdatedFunds: 0,
    lastUpdate: "", totalPageViews: 0,
    uniqueVisitors: 0, topPages: [], fundEngagement: [], recentChanges: 0, avgYield: 0,
    gateClicks: [], totalGateClicks: 0, rateLimitedIPs: 0, rateLimitHits: 0,
  });

  const load = useCallback(async () => {
    const windowStart = getWindowStart(range);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [fundsRes, newsRes, pendingRes, viewsRes, changeLogRes, gateClicksRes, rateLimitRes] = await Promise.all([
      supabase.from("funds").select("id, slug, name, updated_at, annual_yield, fund_type"),
      supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "published"),
      supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "pending_review"),
      supabase.from("page_views").select("id, page_path, session_id, created_at").gte("created_at", windowStart),
      supabase.from("change_log").select("id", { count: "exact" }).gte("changed_at", windowStart),
      supabase.from("auth_gate_clicks").select("source, action, created_at").gte("created_at", windowStart),
      supabase.from("rate_limit_hits").select("ip_hash, created_at").gte("created_at", windowStart),
    ]);

    const funds = fundsRes.data || [];
    const outdated = funds.filter((f) => new Date(f.updated_at) < thirtyDaysAgo).length;
    const lastUpdate = funds.reduce((latest, f) =>
      new Date(f.updated_at) > new Date(latest) ? f.updated_at : latest, "1970-01-01");
    const avgYield = funds.length > 0
      ? funds.reduce((sum, f) => sum + Number(f.annual_yield), 0) / funds.length
      : 0;

    const views = viewsRes.data || [];
    const uniqueSessions = new Set(views.map((v) => v.session_id)).size;

    const pageCounts: Record<string, number> = {};
    const fundViewCounts: Record<string, number> = {};
    views.forEach((v) => {
      pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
      const fundMatch = v.page_path.match(/^\/compare\/(.+)$/);
      if (fundMatch) fundViewCounts[fundMatch[1]] = (fundViewCounts[fundMatch[1]] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([page, count]) => ({ page, views: count }));

    const fundEngagement: FundEngagement[] = funds
      .map((f) => ({ fundName: f.name, slug: f.slug, views: fundViewCounts[f.slug] || 0, fundType: f.fund_type || "money_market" }))
      .sort((a, b) => b.views - a.views);

    const clicks = gateClicksRes.data || [];
    const sourceCounts: Record<string, number> = {};
    clicks.forEach((c) => { sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1; });
    const gateClicks = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));

    const rlHits = rateLimitRes.data || [];
    const uniqueRLIPs = new Set(rlHits.map((r) => r.ip_hash)).size;

    setStats({
      fundCount: funds.length,
      newsCount: newsRes.count || 0,
      pendingNews: pendingRes.count || 0,
      outdatedFunds: outdated,
      lastUpdate: lastUpdate !== "1970-01-01" ? new Date(lastUpdate).toLocaleDateString("en-KE") : "Never",
      totalPageViews: views.length,
      uniqueVisitors: uniqueSessions,
      topPages,
      fundEngagement,
      recentChanges: changeLogRes.count || 0,
      avgYield: Math.round(avgYield * 100) / 100,
      gateClicks,
      totalGateClicks: clicks.length,
      rateLimitHits: rlHits.length,
      rateLimitedIPs: uniqueRLIPs,
    });
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const summaryCards = [
    { icon: BarChart3, label: "Funds Listed", value: stats.fundCount, color: "text-accent" },
    { icon: TrendingUp, label: "Avg Rate", value: `${stats.avgYield}%`, color: "text-accent" },
    { icon: Newspaper, label: "Published News", value: stats.newsCount, color: "text-blue-500" },
    { icon: Clock, label: "Pending Review", value: stats.pendingNews, color: "text-yellow-500" },
    { icon: AlertTriangle, label: "Outdated (>30d)", value: stats.outdatedFunds, color: "text-destructive" },
    { icon: Activity, label: "Changes", value: stats.recentChanges, color: "text-purple-500" },
  ];

  const engagementCards = [
    { icon: Eye, label: "Page Views", value: stats.totalPageViews, color: "text-accent" },
    { icon: Users, label: "Unique Visitors", value: stats.uniqueVisitors, color: "text-green-500" },
    { icon: ShieldAlert, label: "Rate Limit Hits", value: stats.rateLimitHits, color: "text-destructive" },
    { icon: ShieldAlert, label: "Rate-Limited IPs", value: stats.rateLimitedIPs, color: "text-yellow-500" },
  ];

  const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );

  const gateLabels: Record<string, string> = {
    fund_detail: "Fund Details",
    calculator: "Calculator",
    news_article: "News Articles",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {user?.email} · Last update: {stats.lastUpdate}</p>
        </div>
        <div className="flex items-center gap-3">
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

      <p className="text-xs text-muted-foreground -mt-3">Showing data for: {RANGE_LABELS[range]}</p>

      {/* Content Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Content Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Engagement Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">User Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {engagementCards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Sign-up Conversion */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sign-up Conversion</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={MousePointerClick} label="Total Gate Clicks" value={stats.totalGateClicks} color="text-accent" />
          {stats.gateClicks.map((g) => (
            <StatCard key={g.source} icon={MousePointerClick} label={gateLabels[g.source] || g.source} value={g.count} color="text-blue-500" />
          ))}
        </div>
      </div>

      {/* Fund Engagement */}
      {stats.fundEngagement.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fund Engagement</h2>
            <Select value={engagementFilter} onValueChange={setEngagementFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
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
              name: f.fundName.length > 20 ? f.fundName.slice(0, 18) + "…" : f.fundName,
              fullName: f.fundName,
              views: f.views,
              type: FUND_TYPE_LABELS[f.fundType as FundType] || f.fundType,
            }));
            return (
              <>
                {chartData.length > 0 ? (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip
                              formatter={(value: number, _: string, props: any) => [`${value} views`, props.payload.fullName]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                              labelFormatter={() => ""}
                            />
                            <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={28}>
                              {chartData.map((_, idx) => (
                                <Cell key={idx} fill={idx === 0 ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.6)"} />
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
                )}
              </>
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
              <div className="space-y-2">
                {stats.topPages.map((p, i) => (
                  <div key={p.page} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{p.page}</span>
                    </div>
                    <span className="text-sm font-semibold text-accent">{p.views} views</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
