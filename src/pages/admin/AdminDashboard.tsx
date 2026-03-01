import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Newspaper, Clock, AlertTriangle, LogOut, Eye, Users, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FundEngagement {
  fundName: string;
  slug: string;
  views: number;
}

interface Stats {
  fundCount: number;
  newsCount: number;
  pendingNews: number;
  outdatedFunds: number;
  lastUpdate: string;
  totalPageViews: number;
  todayPageViews: number;
  uniqueVisitors: number;
  topPages: { page: string; views: number }[];
  fundEngagement: FundEngagement[];
  recentChanges: number;
  avgYield: number;
}

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    fundCount: 0, newsCount: 0, pendingNews: 0, outdatedFunds: 0,
    lastUpdate: "", totalPageViews: 0, todayPageViews: 0,
    uniqueVisitors: 0, topPages: [], fundEngagement: [], recentChanges: 0, avgYield: 0,
  });

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [fundsRes, newsRes, pendingRes, allViewsRes, todayViewsRes, changeLogRes] = await Promise.all([
        supabase.from("funds").select("id, slug, name, updated_at, annual_yield"),
        supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "published"),
        supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "pending_review"),
        supabase.from("page_views").select("id, page_path, session_id, created_at"),
        supabase.from("page_views").select("id", { count: "exact" }).gte("created_at", todayStr),
        supabase.from("change_log").select("id", { count: "exact" }).gte("changed_at", sevenDaysAgo.toISOString()),
      ]);

      const funds = fundsRes.data || [];
      const outdated = funds.filter((f) => new Date(f.updated_at) < thirtyDaysAgo).length;
      const lastUpdate = funds.reduce((latest, f) => {
        return new Date(f.updated_at) > new Date(latest) ? f.updated_at : latest;
      }, "1970-01-01");
      const avgYield = funds.length > 0 
        ? funds.reduce((sum, f) => sum + Number(f.annual_yield), 0) / funds.length 
        : 0;

      // Page view analytics
      const views = allViewsRes.data || [];
      const uniqueSessions = new Set(views.map((v) => v.session_id)).size;

      // Top pages (exclude fund detail pages from general top pages)
      const pageCounts: Record<string, number> = {};
      const fundViewCounts: Record<string, number> = {};

      views.forEach((v) => {
        pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;

        // Track fund-specific views (paths like /fund/slug-name)
        const fundMatch = v.page_path.match(/^\/fund\/(.+)$/);
        if (fundMatch) {
          const slug = fundMatch[1];
          fundViewCounts[slug] = (fundViewCounts[slug] || 0) + 1;
        }
      });

      const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, views: count }));

      // Map fund slugs to names and build engagement list
      const fundEngagement: FundEngagement[] = funds
        .map((f) => ({
          fundName: f.name,
          slug: f.slug,
          views: fundViewCounts[f.slug] || 0,
        }))
        .sort((a, b) => b.views - a.views);

      setStats({
        fundCount: funds.length,
        newsCount: newsRes.count || 0,
        pendingNews: pendingRes.count || 0,
        outdatedFunds: outdated,
        lastUpdate: lastUpdate !== "1970-01-01" ? new Date(lastUpdate).toLocaleDateString("en-KE") : "Never",
        totalPageViews: views.length,
        todayPageViews: todayViewsRes.count || 0,
        uniqueVisitors: uniqueSessions,
        topPages,
        fundEngagement,
        recentChanges: changeLogRes.count || 0,
        avgYield: Math.round(avgYield * 100) / 100,
      });
    };
    load();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const summaryCards = [
    { icon: BarChart3, label: "Funds Listed", value: stats.fundCount, color: "text-accent" },
    { icon: TrendingUp, label: "Avg Yield", value: `${stats.avgYield}%`, color: "text-accent" },
    { icon: Newspaper, label: "Published News", value: stats.newsCount, color: "text-blue-500" },
    { icon: Clock, label: "Pending Review", value: stats.pendingNews, color: "text-yellow-500" },
    { icon: AlertTriangle, label: "Outdated (>30d)", value: stats.outdatedFunds, color: "text-destructive" },
    { icon: Activity, label: "Changes (7d)", value: stats.recentChanges, color: "text-purple-500" },
  ];

  const engagementCards = [
    { icon: Eye, label: "Total Page Views", value: stats.totalPageViews, color: "text-accent" },
    { icon: Eye, label: "Today's Views", value: stats.todayPageViews, color: "text-blue-500" },
    { icon: Users, label: "Unique Visitors", value: stats.uniqueVisitors, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {user?.email} · Last update: {stats.lastUpdate}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      {/* Content Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Content Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Engagement Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">User Engagement</h2>
        <div className="grid grid-cols-3 gap-3">
          {engagementCards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Fund Engagement */}
      {stats.fundEngagement.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fund Engagement</h2>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {stats.fundEngagement.map((f, i) => (
                  <div key={f.slug} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{f.fundName}</span>
                    </div>
                    <span className="text-sm font-semibold text-accent">{f.views} views</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
