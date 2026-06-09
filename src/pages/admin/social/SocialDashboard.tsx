import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/admin/social/StatusBadge";
import PublishDrawer from "@/components/admin/social/PublishDrawer";
import { PLATFORM_LABEL } from "@/lib/social/contentTypes";

const STATUSES = ["draft", "in_review", "approved", "scheduled", "posted", "manually_posted", "failed"] as const;

export default function SocialDashboard() {
  const [openId, setOpenId] = useState<string | null>(null);
  const counts = useQuery({
    queryKey: ["social-counts"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      for (const s of STATUSES) {
        const { count } = await supabase.from("social_posts").select("*", { count: "exact", head: true }).eq("status", s);
        results[s] = count ?? 0;
      }
      return results;
    },
  });

  const recent = useQuery({
    queryKey: ["social-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("social_posts").select("id, content_type, platform, status, caption, created_at").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const upcoming = useQuery({
    queryKey: ["social-upcoming"],
    queryFn: async () => {
      const { data } = await supabase.from("social_posts").select("id, content_type, platform, status, scheduled_at, caption")
        .not("scheduled_at", "is", null).gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true }).limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {STATUSES.map(s => (
            <Card key={s} className="p-3">
              <div className="text-xs text-muted-foreground capitalize">{s.replace("_", " ")}</div>
              <div className="text-2xl font-mono">{counts.data?.[s] ?? "—"}</div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Recent generated posts</h3>
          <div className="space-y-2">
            {recent.data?.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
            {recent.data?.map(p => (
              <button key={p.id} onClick={() => setOpenId(p.id)} className="w-full text-left p-2 rounded border border-border hover:bg-muted/50">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <StatusBadge status={p.status} />
                  <span className="text-muted-foreground">{PLATFORM_LABEL[p.platform as keyof typeof PLATFORM_LABEL]}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{p.content_type}</span>
                </div>
                <div className="text-sm line-clamp-2">{p.caption}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Next scheduled</h3>
          <div className="space-y-2">
            {upcoming.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
            {upcoming.data?.map(p => (
              <button key={p.id} onClick={() => setOpenId(p.id)} className="w-full text-left p-2 rounded border border-border hover:bg-muted/50">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <StatusBadge status={p.status} />
                  <span className="text-muted-foreground">{PLATFORM_LABEL[p.platform as keyof typeof PLATFORM_LABEL]}</span>
                  <span className="text-muted-foreground ml-auto font-mono">{new Date(p.scheduled_at!).toLocaleString()}</span>
                </div>
                <div className="text-sm line-clamp-2">{p.caption}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <PublishDrawer postId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} onChanged={() => { counts.refetch(); recent.refetch(); upcoming.refetch(); }} />
    </div>
  );
}
