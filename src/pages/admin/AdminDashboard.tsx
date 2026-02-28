import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Newspaper, Clock, AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ fundCount: 0, newsCount: 0, pendingNews: 0, outdatedFunds: 0, lastUpdate: "" });

  useEffect(() => {
    const load = async () => {
      const [fundsRes, newsRes, pendingRes] = await Promise.all([
        supabase.from("funds").select("id, updated_at", { count: "exact" }),
        supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "published"),
        supabase.from("news_articles").select("id", { count: "exact" }).eq("status", "pending_review"),
      ]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const outdated = (fundsRes.data || []).filter(
        (f) => new Date(f.updated_at) < thirtyDaysAgo
      ).length;

      const lastUpdate = (fundsRes.data || []).reduce((latest, f) => {
        return new Date(f.updated_at) > new Date(latest) ? f.updated_at : latest;
      }, "1970-01-01");

      setStats({
        fundCount: fundsRes.count || 0,
        newsCount: newsRes.count || 0,
        pendingNews: pendingRes.count || 0,
        outdatedFunds: outdated,
        lastUpdate: lastUpdate !== "1970-01-01" ? new Date(lastUpdate).toLocaleDateString("en-KE") : "Never",
      });
    };
    load();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const cards = [
    { icon: BarChart3, label: "Funds Listed", value: stats.fundCount, color: "text-accent" },
    { icon: Newspaper, label: "Published News", value: stats.newsCount, color: "text-info" },
    { icon: Clock, label: "Pending Review", value: stats.pendingNews, color: "text-warning" },
    { icon: AlertTriangle, label: "Outdated (>30d)", value: stats.outdatedFunds, color: "text-destructive" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {user?.email} · Last update: {stats.lastUpdate}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <c.icon className={`h-4 w-4 ${c.color}`} />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
