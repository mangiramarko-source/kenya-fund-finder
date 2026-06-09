import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/admin/social/StatusBadge";
import PublishDrawer from "@/components/admin/social/PublishDrawer";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PLATFORM_LABEL } from "@/lib/social/contentTypes";

export default function SocialQueue() {
  const [status, setStatus] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const posts = useQuery({
    queryKey: ["social-queue", status, platform],
    queryFn: async () => {
      let q = supabase.from("social_posts").select("id, content_type, platform, status, caption, image_url, scheduled_at, created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (status !== "all") q = q.eq("status", status as any);
      if (platform !== "all") q = q.eq("platform", platform as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const del = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    posts.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="manually_posted">Manually Posted</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="x">X / Twitter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {posts.data?.length === 0 && <Card className="p-8 text-center text-muted-foreground col-span-full">No posts match.</Card>}
        {posts.data?.map(p => (
          <Card key={p.id} className="overflow-hidden">
            {p.image_url ? (
              <button onClick={() => setOpenId(p.id)} className="block w-full aspect-square bg-muted">
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ) : (
              <button onClick={() => setOpenId(p.id)} className="block w-full aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground">No image</button>
            )}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <StatusBadge status={p.status} />
                <span className="text-muted-foreground">{PLATFORM_LABEL[p.platform as keyof typeof PLATFORM_LABEL]}</span>
              </div>
              <div className="text-xs text-muted-foreground">{p.content_type}</div>
              <div className="text-sm line-clamp-3">{p.caption}</div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpenId(p.id)}>Open</Button>
                <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <PublishDrawer postId={openId} open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} onChanged={() => posts.refetch()} />
    </div>
  );
}
