import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Copy, Download, ExternalLink, RefreshCw, CheckCircle2, ImageIcon } from "lucide-react";
import StatusBadge from "./StatusBadge";

const PLATFORM_URL: Record<string, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  x: "https://twitter.com/compose/tweet",
};

export default function PublishDrawer({
  postId, open, onOpenChange, onChanged,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !open) return;
    setLoading(true);
    supabase.from("social_posts").select("*").eq("id", postId).maybeSingle().then(({ data }) => {
      setPost(data);
      setLoading(false);
    });
  }, [postId, open]);

  const save = async (patch: Record<string, unknown>) => {
    if (!postId) return;
    const { error } = await supabase.from("social_posts").update(patch).eq("id", postId);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setPost((p: any) => ({ ...p, ...patch }));
    onChanged?.();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const downloadImage = async () => {
    if (!post?.image_url) return;
    const a = document.createElement("a");
    a.href = post.image_url;
    a.download = `kff-${post.platform}-${post.id}.png`;
    a.target = "_blank";
    a.click();
  };

  const setStatus = async (status: string) => {
    await save({ status, ...(status === "posted" || status === "manually_posted" ? { posted_at: new Date().toISOString() } : {}) });
    await supabase.from("social_post_analytics").insert({
      post_id: postId, event: status === "manually_posted" ? "manual_posted" : status,
      platform: post.platform, content_type: post.content_type,
    });
    toast({ title: `Marked ${status}` });
  };

  const regen = async (kind: "image" | "caption") => {
    if (!postId) return;
    setBusy(kind);
    const fn = kind === "image" ? "social-regenerate-image" : "social-regenerate-caption";
    const { data, error } = await supabase.functions.invoke(fn, { body: { post_id: postId } });
    setBusy(null);
    if (error) { toast({ title: "Regenerate failed", description: error.message, variant: "destructive" }); return; }
    setPost((p: any) => ({ ...p, ...(data ?? {}) }));
    toast({ title: `${kind === "image" ? "Image" : "Caption"} regenerated` });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {post && <StatusBadge status={post.status} />}
            <span className="capitalize">{post?.platform}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-normal text-muted-foreground">{post?.content_type}</span>
          </SheetTitle>
          <SheetDescription>Review, edit, then approve or mark as posted.</SheetDescription>
        </SheetHeader>

        {loading || !post ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4 py-4">
            {post.image_url ? (
              <div className="rounded border border-border overflow-hidden bg-muted">
                <img src={post.image_url} alt="" className="w-full" />
              </div>
            ) : (
              <div className="rounded border border-dashed border-border p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8" /> No image yet
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => regen("image")} disabled={busy === "image"}>
                <RefreshCw className="h-3 w-3 mr-1" /> {busy === "image" ? "…" : "Regenerate image"}
              </Button>
              <Button size="sm" variant="outline" onClick={downloadImage} disabled={!post.image_url}>
                <Download className="h-3 w-3 mr-1" /> Download image
              </Button>
              <Button size="sm" variant="outline" onClick={() => regen("caption")} disabled={busy === "caption"}>
                <RefreshCw className="h-3 w-3 mr-1" /> {busy === "caption" ? "…" : "Regenerate caption"}
              </Button>
            </div>

            <div>
              <Label>Caption</Label>
              <Textarea
                value={post.caption ?? ""} rows={10}
                onChange={(e) => setPost((p: any) => ({ ...p, caption: e.target.value }))}
                onBlur={(e) => save({ caption: e.target.value })}
                className="font-mono text-sm"
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(post.caption ?? "", "Caption")}><Copy className="h-3 w-3 mr-1" />Copy caption</Button>
                <Button size="sm" variant="outline" onClick={() => copy((post.hashtags ?? []).map((h: string) => `#${h}`).join(" "), "Hashtags")}><Copy className="h-3 w-3 mr-1" />Copy hashtags</Button>
                <Button size="sm" variant="outline" onClick={() => copy(post.utm_url ?? "", "UTM link")}><Copy className="h-3 w-3 mr-1" />Copy link</Button>
              </div>
            </div>

            <div>
              <Label>Hashtags (comma-separated)</Label>
              <Input
                value={(post.hashtags ?? []).join(", ")}
                onChange={(e) => setPost((p: any) => ({ ...p, hashtags: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))}
                onBlur={(e) => save({ hashtags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Schedule for</Label>
                <Input
                  type="datetime-local"
                  value={post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                    save({ scheduled_at: v });
                  }}
                />
              </div>
              <div>
                <Label>Image size</Label>
                <Input value={post.image_size ?? ""} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="rounded border border-border p-3 bg-muted/30 text-xs">
              <div className="font-medium mb-1">Source data ({post.data_as_of})</div>
              <ul className="space-y-0.5">
                {(post.fund_names ?? []).map((n: string, i: number) => <li key={i}>· {n}</li>)}
                {(!post.fund_names || post.fund_names.length === 0) && <li className="text-muted-foreground">No fund data</li>}
              </ul>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus("in_review")}>Send to review</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus("approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus("scheduled")} disabled={!post.scheduled_at}>Schedule</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus("cancelled")}>Cancel</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <a href={PLATFORM_URL[post.platform]} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />Open {post.platform}
                  </a>
                </Button>
                <Button size="sm" variant="default" onClick={() => setStatus("manually_posted")}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />Mark as manually posted
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
