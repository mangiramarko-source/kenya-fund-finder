import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import PublishDrawer from "@/components/admin/social/PublishDrawer";
import StatusBadge from "@/components/admin/social/StatusBadge";
import { PLATFORM_LABEL } from "@/lib/social/contentTypes";

const DEFAULT_WEEK = [
  { day: "Mon", type: "Daily MMF yield update" },
  { day: "Tue", type: "Investment education tip" },
  { day: "Wed", type: "Fund comparison post" },
  { day: "Thu", type: "Calculator promotion post" },
  { day: "Fri", type: "Weekly fund summary" },
  { day: "Sat", type: "Diaspora / beginner education" },
  { day: "Sun", type: "Soft KenyaFundFinder promo" },
];

export default function SocialScheduler() {
  const [openId, setOpenId] = useState<string | null>(null);
  const scheduled = useQuery({
    queryKey: ["social-scheduler"],
    queryFn: async () => {
      const { data } = await supabase.from("social_posts").select("id, content_type, platform, status, scheduled_at, caption, image_url")
        .not("scheduled_at", "is", null).order("scheduled_at", { ascending: true }).limit(200);
      return data ?? [];
    },
  });

  const grouped = (scheduled.data ?? []).reduce<Record<string, any[]>>((acc, p) => {
    const day = new Date(p.scheduled_at!).toDateString();
    (acc[day] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Suggested weekly plan</h3>
        <p className="text-xs text-muted-foreground mb-3">Reference plan — generate posts in the Create tab and set scheduled times in the post drawer.</p>
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {DEFAULT_WEEK.map(d => (
            <div key={d.day} className="p-2 rounded border border-border text-xs">
              <div className="font-mono font-bold">{d.day}</div>
              <div className="text-muted-foreground mt-1">{d.type}</div>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">Scheduled posts</h3>
        {scheduled.data?.length === 0 && <Card className="p-8 text-center text-muted-foreground">No posts scheduled yet.</Card>}
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, items]) => (
            <Card key={day} className="p-3">
              <div className="font-mono text-sm mb-2">{day}</div>
              <div className="space-y-1">
                {items.map(p => (
                  <button key={p.id} onClick={() => setOpenId(p.id)} className="w-full text-left p-2 rounded hover:bg-muted/50 flex items-center gap-2 text-xs">
                    <span className="font-mono">{new Date(p.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <StatusBadge status={p.status} />
                    <span className="text-muted-foreground">{PLATFORM_LABEL[p.platform as keyof typeof PLATFORM_LABEL]}</span>
                    <span className="truncate flex-1">{p.caption}</span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <PublishDrawer postId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} onChanged={() => scheduled.refetch()} />
    </div>
  );
}
